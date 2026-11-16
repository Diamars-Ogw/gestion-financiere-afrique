import { useCallback, useState, useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/src/components/AppText";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { amountToMinorUnits, createRecurringRule, formatMoney, listAccounts, listRecurringRules, markRecurringRulePaid, toggleRecurringRule } from "@/src/database/finance";
import type { Account, RecurringFrequency, RecurringRule } from "@/src/types/finance";
import type { Palette } from "@/src/constants/theme";
import { useTheme } from "@/src/components/ThemeProvider";

const expenseCategories = ["Loyer", "Électricité", "Eau", "Internet", "Téléphone", "Scolarité", "Abonnement", "Crédit", "Autre"];
const incomeCategories = ["Salaire", "Pension", "Loyer reçu", "Contrat", "Autre revenu"];
function todayLocal(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}

export default function Calendar() {
  const palette = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const db = useSQLiteContext();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currency, setCurrency] = useState("XOF");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState(expenseCategories[0]);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [dueDate, setDueDate] = useState(todayLocal());
  const [accountId, setAccountId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    let active = true;
    Promise.all([listRecurringRules(db), listAccounts(db), db.getFirstAsync<{ currency: string }>("SELECT currency FROM profile WHERE id = 1")]).then(([r,a,p]) => {
      if (!active) return;
      setRules(r); setAccounts(a); setCurrency(p?.currency ?? "XOF");
      if (accountId === null && a.length) setAccountId(a[0].id);
    });
    return () => { active = false; };
  }, [db, accountId]);
  useFocusEffect(refresh);

  async function addRule() {
    const amountMinor = amountToMinorUnits(amount, currency);
    if (!label.trim() || amountMinor === null) {
      Alert.alert("Informations incomplètes", "Indique un nom et un montant valide.");
      return;
    }
    setBusy(true);
    try {
      await createRecurringRule(db, { label, type, amountMinor, category, frequency, nextDueAt: dueDate });
      setLabel(""); setAmount(""); refresh();
    } catch (error) {
      Alert.alert("Échéance non enregistrée", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally { setBusy(false); }
  }

  async function pay(rule: RecurringRule) {
    if (accountId === null) {
      Alert.alert("Portefeuille manquant", "Ajoute un portefeuille avant de régler cette échéance.");
      return;
    }
    setBusy(true);
    try {
      await markRecurringRulePaid(db, { ruleId: rule.id, accountId });
      refresh();
      Alert.alert("Opération enregistrée", "L'échéance suivante a été calculée et l'opération ajoutée à l'historique.");
    } catch (error) {
      Alert.alert("Règlement impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally { setBusy(false); }
  }

  const categories = type === "expense" ? expenseCategories : incomeCategories;
  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Échéances et récurrences</Text>
      <Text style={s.subtitle}>Prévois les loyers, factures, abonnements, salaires et autres mouvements réguliers. Rien n'est débité automatiquement : tu confirmes chaque opération.</Text>
      <View style={s.form}>
        <Text style={s.formTitle}>Nouvelle échéance</Text>
        <View style={s.modeRow}>
          <Pressable onPress={() => { setType("expense"); setCategory(expenseCategories[0]); }} style={[s.mode, type === "expense" && s.modeActive]}><Text style={[s.modeText, type === "expense" && s.modeTextActive]}>Dépense</Text></Pressable>
          <Pressable onPress={() => { setType("income"); setCategory(incomeCategories[0]); }} style={[s.mode, type === "income" && s.modeActive]}><Text style={[s.modeText, type === "income" && s.modeTextActive]}>Revenu</Text></Pressable>
        </View>
        <TextInput value={label} onChangeText={setLabel} placeholder="Ex. Facture Internet" style={s.input} />
        <TextInput value={amount} onChangeText={setAmount} placeholder={"Montant en " + currency} keyboardType="decimal-pad" style={s.input} />
        <Text style={s.label}>Catégorie</Text>
        <View style={s.chips}>{categories.map(c => <Pressable key={c} onPress={() => setCategory(c)} style={[s.chip, category === c && s.chipActive]}><Text style={[s.chipText, category === c && s.chipTextActive]}>{c}</Text></Pressable>)}</View>
        <Text style={s.label}>Fréquence</Text>
        <View style={s.chips}>{([{value:"weekly",label:"Chaque semaine"},{value:"monthly",label:"Chaque mois"},{value:"yearly",label:"Chaque année"}] as {value:RecurringFrequency;label:string}[]).map(x => <Pressable key={x.value} onPress={() => setFrequency(x.value)} style={[s.chip, frequency === x.value && s.chipActive]}><Text style={[s.chipText, frequency === x.value && s.chipTextActive]}>{x.label}</Text></Pressable>)}</View>
        <Text style={s.label}>Prochaine date (AAAA-MM-JJ)</Text>
        <TextInput value={dueDate} onChangeText={setDueDate} placeholder="2026-12-01" style={s.input} />
        <Pressable onPress={addRule} disabled={busy} style={s.button}><Text style={s.buttonText}>{busy ? "En cours..." : "Enregistrer l'échéance"}</Text></Pressable>
      </View>
      <Text style={s.sectionTitle}>Échéances enregistrées</Text>
      {rules.length === 0 ? <View style={s.empty}><Text style={s.emptyTitle}>Aucune échéance programmée</Text><Text style={s.emptyText}>Ajoute une dépense ou un revenu régulier pour mieux anticiper.</Text></View> : rules.map(rule => (
        <View key={rule.id} style={[s.ruleCard, !rule.isActive && { opacity: 0.55 }]}>
          <View style={s.ruleHeader}><View style={{ flex: 1 }}><Text style={s.ruleName}>{rule.label}</Text><Text style={s.ruleMeta}>{rule.category} · {rule.frequency === "weekly" ? "Hebdomadaire" : rule.frequency === "yearly" ? "Annuel" : "Mensuel"}</Text></View><Text style={[s.ruleAmount, rule.type === "income" && { color: palette.green }, rule.type === "expense" && { color: palette.red }]}>{formatMoney(rule.amountMinor, currency)}</Text></View>
          <Text style={s.due}>Prochaine échéance : {rule.nextDueAt}</Text>
          <View style={s.actions}>
            <Pressable onPress={() => pay(rule)} disabled={busy || !rule.isActive} style={s.smallButton}><Text style={s.smallButtonText}>{rule.type === "expense" ? "Marquer payée" : "Marquer reçue"}</Text></Pressable>
            <Pressable onPress={async () => { await toggleRecurringRule(db, rule.id, !rule.isActive); refresh(); }} style={s.pauseButton}><Text style={s.pauseText}>{rule.isActive ? "Désactiver" : "Réactiver"}</Text></Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
const makeStyles = (palette: Palette) => StyleSheet.create({
 page:{flex:1,backgroundColor:palette.background},content:{padding:20,paddingTop: 18,paddingBottom:40},title:{color:palette.ink,fontSize: 28,fontWeight:"800"},subtitle:{color:palette.muted,fontSize: 14,lineHeight:19,marginTop:8},
 form:{backgroundColor:palette.surface,borderRadius:22,padding:15,marginTop:18},formTitle:{color:palette.ink,fontSize: 15,fontWeight:"800"},modeRow:{flexDirection:"row",backgroundColor:palette.background,borderRadius:14,padding:4,marginTop:12},mode:{flex:1,padding:10,alignItems:"center",borderRadius:8},modeActive:{backgroundColor:palette.navy},modeText:{color:palette.muted,fontSize: 13,fontWeight:"700"},modeTextActive:{color:"#FFFFFF"},
 input:{backgroundColor:palette.background,borderWidth:1,borderColor:palette.border,borderRadius:14,padding:12,color:palette.ink,fontSize: 14,marginTop:9},label:{color:palette.ink,fontSize: 13,fontWeight:"800",marginTop:14,marginBottom:7},chips:{flexDirection:"row",flexWrap:"wrap",gap:7},chip:{padding:9,borderRadius:9,borderWidth:1,borderColor:palette.border,backgroundColor:palette.background},chipActive:{borderColor:palette.primary,backgroundColor:palette.primarySoft},chipText:{color:palette.muted,fontSize: 13,fontWeight:"700"},chipTextActive:{color:palette.primary},
 button:{backgroundColor:palette.navy,borderRadius:14,padding:14,alignItems:"center",marginTop:15},buttonText:{color:"#FFFFFF",fontSize: 13,fontWeight:"800"},sectionTitle:{color:palette.ink,fontSize: 17,fontWeight:"800",marginTop:25,marginBottom:12},empty:{backgroundColor:palette.surface,borderRadius:15,padding:18},emptyTitle:{color:palette.ink,fontSize: 15,fontWeight:"800"},emptyText:{color:palette.muted,fontSize: 13,lineHeight:17,marginTop:6},
 ruleCard:{backgroundColor:palette.surface,borderRadius:15,padding:14,marginBottom:9},ruleHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},ruleName:{color:palette.ink,fontSize: 14,fontWeight:"800"},ruleMeta:{color:palette.muted,fontSize: 13,marginTop:4},ruleAmount:{color:palette.ink,fontSize: 14,fontWeight:"800"},due:{color:palette.muted,fontSize: 13,marginTop:9},actions:{flexDirection:"row",gap:8,marginTop:12},smallButton:{backgroundColor:palette.navy,borderRadius:9,padding:9},smallButtonText:{color:"#FFFFFF",fontSize: 13,fontWeight:"800"},pauseButton:{backgroundColor:palette.background,borderRadius:9,padding:9},pauseText:{color:palette.muted,fontSize: 13,fontWeight:"700"}
});
