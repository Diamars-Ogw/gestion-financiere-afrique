import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { getMonthTotals, getProfile, listBudgets, listDebts, listGoals, formatMoney } from "@/src/database/finance";
import type { UserProfile } from "@/src/types/finance";
import { palette } from "@/src/constants/theme";

type Insight = { title: string; body: string; level: "info" | "warning" | "success" };

function monthKey() {
  const now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
}

export default function Assistant() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [insights, setInsights] = useState<Insight[]>([]);
  const [currency, setCurrency] = useState("XOF");

  const refresh = useCallback(() => {
    let active = true;
    const month = monthKey();
    Promise.all([getProfile(db), getMonthTotals(db, month), listBudgets(db, month), listDebts(db), listGoals(db)]).then(([p,t,b,d,g]) => {
      if (!active) return;
      setProfile(p);
      setCurrency(p?.currency ?? "XOF");
      setTotals(t);
      const items: Insight[] = [];
      if (t.income === 0 && t.expenses === 0) {
        items.push({ title: "Commence par noter tes mouvements", body: "L'assistant a besoin de quelques opérations réelles pour repérer les habitudes. N'invente pas de chiffres pour remplir le tableau.", level: "info" });
      } else if (t.income === 0 && t.expenses > 0) {
        items.push({ title: "Des dépenses sans revenu enregistré", body: "Tu as enregistré des dépenses ce mois-ci, mais aucun revenu reçu. Si tu es soutenu par un proche ou si tu utilises une épargne antérieure, note cette source dans ton suivi pour garder une vision juste.", level: "warning" });
      } else if (t.expenses > t.income) {
        items.push({ title: "Tes dépenses dépassent tes revenus", body: "L'écart actuel est de " + formatMoney(t.expenses - t.income, p?.currency ?? "XOF") + ". Examine les catégories les plus importantes avant d'engager de nouvelles dépenses.", level: "warning" });
      } else {
        items.push({ title: "Ton solde mensuel est positif", body: "Après les opérations enregistrées, il reste " + formatMoney(t.income - t.expenses, p?.currency ?? "XOF") + " de marge. Vérifie que les dépenses à venir sont aussi prises en compte.", level: "success" });
      }
      const exceeded = b.filter(x => x.spentMinor > x.limitMinor);
      if (exceeded.length) {
        items.push({ title: "Budget dépassé", body: exceeded.map(x => x.category + " : dépassement de " + formatMoney(x.spentMinor - x.limitMinor, p?.currency ?? "XOF")).join(" · ") + ". Réévalue le plafond ou ralentis cette dépense.", level: "warning" });
      }
      const near = b.filter(x => x.limitMinor > 0 && x.spentMinor / x.limitMinor >= 0.8 && x.spentMinor <= x.limitMinor);
      if (near.length) {
        items.push({ title: "Budgets bientôt épuisés", body: near.map(x => x.category + " (" + Math.round(x.spentMinor / x.limitMinor * 100) + "%)").join(", ") + ". Garde une marge jusqu'à la fin du mois.", level: "info" });
      }
      const activeDebts = d.filter(x => x.remainingMinor > 0);
      if (activeDebts.length) {
        items.push({ title: "Rappelle-toi tes engagements", body: activeDebts.length + " dette(s) ou créance(s) restent ouvertes, pour un total de " + formatMoney(activeDebts.reduce((sum,x)=>sum+x.remainingMinor,0), p?.currency ?? "XOF") + ". Consulte les dates et les montants avant de promettre un nouveau remboursement.", level: "info" });
      }
      const activeGoals = g.filter(x => x.currentMinor < x.targetMinor);
      if (activeGoals.length) {
        items.push({ title: "Tes objectifs d'épargne", body: activeGoals.length + " objectif(s) sont en cours. Un petit versement régulier peut être plus facile à tenir qu'un gros effort ponctuel.", level: "success" });
      }
      if (p?.incomeProfile === "irregular" || p?.incomeProfile === "multiple") {
        items.push({ title: "Revenus variables : protège tes périodes creuses", body: "Évite de baser tes engagements fixes sur un bon mois isolé. Utilise plutôt une moyenne prudente de plusieurs mois et garde une réserve pour les périodes moins actives.", level: "info" });
      }
      if (p?.incomeProfile === "none") {
        items.push({ title: "Pas de revenu personnel déclaré", body: "Tu peux suivre les sommes reçues, l'aide familiale et les dépenses prises en charge sans te forcer à déclarer un salaire. L'objectif est de comprendre les flux réels.", level: "info" });
      }
      setInsights(items);
    });
    return () => { active = false; };
  }, [db]);
  useFocusEffect(refresh);

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Text style={s.eyebrow}>ANALYSE LOCALE · SANS INTERNET</Text>
      <Text style={s.title}>Mon assistant financier</Text>
      <Text style={s.subtitle}>Des conseils fondés uniquement sur les opérations, budgets, dettes et objectifs enregistrés sur cet appareil. Ce n'est pas une prédiction garantie.</Text>
      <View style={s.summary}>
        <Text style={s.summaryLabel}>Bilan de {monthKey()}</Text>
        <View style={s.summaryRow}><Text style={s.summaryText}>Revenus enregistrés</Text><Text style={[s.summaryValue,{color:palette.green}]}>{formatMoney(totals.income,currency)}</Text></View>
        <View style={s.summaryRow}><Text style={s.summaryText}>Dépenses enregistrées</Text><Text style={[s.summaryValue,{color:palette.red}]}>{formatMoney(totals.expenses,currency)}</Text></View>
        <View style={s.summaryRow}><Text style={s.summaryText}>Écart actuel</Text><Text style={s.summaryValue}>{formatMoney(totals.income-totals.expenses,currency)}</Text></View>
      </View>
      <Text style={s.sectionTitle}>Ce que les données indiquent</Text>
      {insights.map((item,index)=><View key={index} style={[s.card,item.level==="warning"&&s.warning,item.level==="success"&&s.success]}><Text style={s.cardTitle}>{item.title}</Text><Text style={s.cardBody}>{item.body}</Text></View>)}
      <Text style={s.footnote}>Les recommandations sont calculées localement avec des règles explicables. Aucune donnée financière n'est envoyée à un service d'IA ou à un serveur.</Text>
    </ScrollView>
  );
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:palette.background},content:{padding:20,paddingTop:58,paddingBottom:40},eyebrow:{color:palette.primary,fontSize:9,fontWeight:"800",letterSpacing:1.2},title:{color:palette.ink,fontSize:25,fontWeight:"800",marginTop:7},subtitle:{color:palette.muted,fontSize:12,lineHeight:19,marginTop:8},
 summary:{backgroundColor:palette.navy,borderRadius:17,padding:17,marginTop:19},summaryLabel:{color:"#B7C1D2",fontSize:10,fontWeight:"700",marginBottom:10},summaryRow:{flexDirection:"row",justifyContent:"space-between",paddingVertical:6},summaryText:{color:"#D4DBE5",fontSize:11},summaryValue:{color:"#FFFFFF",fontSize:12,fontWeight:"800"},
 sectionTitle:{color:palette.ink,fontSize:16,fontWeight:"800",marginTop:24,marginBottom:11},card:{backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,borderRadius:14,padding:15,marginBottom:9},warning:{borderColor:palette.red},success:{borderColor:palette.green},cardTitle:{color:palette.ink,fontSize:12,fontWeight:"800"},cardBody:{color:palette.muted,fontSize:11,lineHeight:18,marginTop:6},footnote:{color:palette.muted,fontSize:9,lineHeight:15,marginTop:12}
});
