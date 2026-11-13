import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { formatMoney, getExpenseCategories, getMonthlyHistory } from "@/src/database/finance";
import { palette } from "@/src/constants/theme";

type MonthRow = { month: string; income: number; expenses: number };
type CategoryRow = { category: string; amountMinor: number };
const monthNames = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];

export default function Reports() {
  const db = useSQLiteContext();
  const [history, setHistory] = useState<MonthRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [currency, setCurrency] = useState("XOF");

  const refresh = useCallback(() => {
    let active = true;
    const now = new Date();
    const month = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    Promise.all([
      getMonthlyHistory(db, 6),
      getExpenseCategories(db, month),
      db.getFirstAsync<{ currency: string }>("SELECT currency FROM profile WHERE id = 1")
    ]).then(([h,c,p]) => {
      if (!active) return;
      setHistory(h); setCategories(c); setCurrency(p?.currency ?? "XOF");
    });
    return () => { active = false; };
  }, [db]);
  useFocusEffect(refresh);

  const maxValue = Math.max(1, ...history.flatMap(x => [x.income, x.expenses]));
  const totalIncome = history.reduce((sum,x)=>sum+x.income,0);
  const totalExpenses = history.reduce((sum,x)=>sum+x.expenses,0);
  const maxCategory = Math.max(1, ...categories.map(x=>x.amountMinor));
  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Text style={s.title}>Statistiques</Text>
      <Text style={s.subtitle}>Une vue basée sur les opérations réellement enregistrées. Les transferts entre portefeuilles sont exclus des revenus et dépenses.</Text>
      <View style={s.summary}>
        <Text style={s.summaryLabel}>Bilan des six derniers mois</Text>
        <Text style={s.summaryValue}>{formatMoney(totalIncome-totalExpenses,currency)}</Text>
        <View style={s.summaryRow}><Text style={s.summaryText}>Revenus</Text><Text style={s.income}>{formatMoney(totalIncome,currency)}</Text></View>
        <View style={s.summaryRow}><Text style={s.summaryText}>Dépenses</Text><Text style={s.expense}>{formatMoney(totalExpenses,currency)}</Text></View>
      </View>
      <Text style={s.sectionTitle}>Évolution mensuelle</Text>
      <View style={s.panel}>
        <View style={s.legendRow}><View style={[s.legendDot,{backgroundColor:palette.green}]} /><Text style={s.legendText}>Revenus</Text><View style={[s.legendDot,{backgroundColor:palette.red}]} /><Text style={s.legendText}>Dépenses</Text></View>
        {history.map(row => {
          const parts=row.month.split("-");
          const label=monthNames[Number(parts[1])-1]+" "+parts[0].slice(2);
          return <View key={row.month} style={s.monthRow}>
            <Text style={s.monthLabel}>{label}</Text>
            <View style={s.bars}>
              <View style={s.barTrack}><View style={[s.bar,{width:(row.income/maxValue*100+"%") as `${number}%`,backgroundColor:palette.green}]} /></View>
              <View style={s.barTrack}><View style={[s.bar,{width:(row.expenses/maxValue*100+"%") as `${number}%`,backgroundColor:palette.red}]} /></View>
            </View>
          </View>;
        })}
      </View>
      <Text style={s.sectionTitle}>Répartition des dépenses ce mois-ci</Text>
      <View style={s.panel}>
        {categories.length===0?<Text style={s.empty}>Aucune dépense enregistrée ce mois-ci.</Text>:categories.map(item=><View key={item.category} style={s.categoryRow}>
          <View style={s.categoryHeader}><Text style={s.categoryName}>{item.category}</Text><Text style={s.categoryAmount}>{formatMoney(item.amountMinor,currency)}</Text></View>
          <View style={s.barTrack}><View style={[s.bar,{width:(item.amountMinor/maxCategory*100+"%") as `${number}%`,backgroundColor:palette.primary}]} /></View>
        </View>)}
      </View>
      <Text style={s.footnote}>Les montants sont calculés dans la devise du profil. Si tu changes de pays, l'application protège les données déjà enregistrées contre un mélange de monnaies.</Text>
    </ScrollView>
  );
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:palette.background},content:{padding:20,paddingTop:58,paddingBottom:40},title:{color:palette.ink,fontSize:26,fontWeight:"800"},subtitle:{color:palette.muted,fontSize:12,lineHeight:19,marginTop:8},
 summary:{backgroundColor:palette.navy,borderRadius:17,padding:17,marginTop:18},summaryLabel:{color:"#B7C1D2",fontSize:10,fontWeight:"700"},summaryValue:{color:"#FFFFFF",fontSize:25,fontWeight:"800",marginTop:7},summaryRow:{flexDirection:"row",justifyContent:"space-between",marginTop:9},summaryText:{color:"#D4DBE5",fontSize:11},income:{color:"#9CE2BD",fontSize:11,fontWeight:"800"},expense:{color:"#FFB2B2",fontSize:11,fontWeight:"800"},
 sectionTitle:{color:palette.ink,fontSize:16,fontWeight:"800",marginTop:24,marginBottom:11},panel:{backgroundColor:palette.surface,borderRadius:15,padding:15},legendRow:{flexDirection:"row",alignItems:"center",gap:7,marginBottom:15},legendDot:{width:8,height:8,borderRadius:4},legendText:{color:palette.muted,fontSize:9,marginRight:8},monthRow:{flexDirection:"row",alignItems:"center",marginBottom:12},monthLabel:{color:palette.muted,fontSize:9,width:42},bars:{flex:1,gap:4},barTrack:{height:7,backgroundColor:palette.background,borderRadius:5,overflow:"hidden"},bar:{height:7,borderRadius:5},categoryRow:{marginBottom:13},categoryHeader:{flexDirection:"row",justifyContent:"space-between",marginBottom:6},categoryName:{color:palette.ink,fontSize:10,fontWeight:"700"},categoryAmount:{color:palette.muted,fontSize:10},empty:{color:palette.muted,fontSize:11},footnote:{color:palette.muted,fontSize:9,lineHeight:15,marginTop:14}
});
