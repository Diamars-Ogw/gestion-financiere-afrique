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
  const [history,setHistory] = useState<MonthRow[]>([]);
  const [categories,setCategories] = useState<CategoryRow[]>([]);
  const [currency,setCurrency] = useState("XOF");
  const refresh = useCallback(() => {
    let active=true;
    const now=new Date();
    const month=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
    Promise.all([getMonthlyHistory(db,6),getExpenseCategories(db,month),db.getFirstAsync<{currency:string}>("SELECT currency FROM profile WHERE id = 1")]).then(([h,c,p])=>{
      if(active){setHistory(h);setCategories(c);setCurrency(p?.currency??"XOF");}
    });
    return ()=>{active=false;};
  },[db]);
  useFocusEffect(refresh);
  const maxValue=Math.max(1,...history.flatMap(x=>[x.income,x.expenses]));
  const totalIncome=history.reduce((sum,x)=>sum+x.income,0);
  const totalExpenses=history.reduce((sum,x)=>sum+x.expenses,0);
  const balance=totalIncome-totalExpenses;
  const maxCategory=Math.max(1,...categories.map(x=>x.amountMinor));
  const currentMonth=history[history.length-1];
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <Text style={s.kicker}>TES CHIFFRES, SANS COMPLICATION</Text>
    <Text style={s.title}>Analyse</Text>
    <Text style={s.subtitle}>Comprends où va ton argent et comment ta situation évolue.</Text>
    <View style={s.hero}>
      <Text style={s.heroLabel}>Bilan des 6 derniers mois</Text>
      <Text style={s.heroValue}>{formatMoney(balance,currency)}</Text>
      <View style={s.heroDivider}/>
      <View style={s.heroRow}><View><Text style={s.heroSmall}>Revenus</Text><Text style={s.heroIncome}>{formatMoney(totalIncome,currency)}</Text></View><View><Text style={s.heroSmall}>Dépenses</Text><Text style={s.heroExpense}>{formatMoney(totalExpenses,currency)}</Text></View></View>
    </View>
    <Text style={s.sectionTitle}>Évolution mensuelle</Text>
    <View style={s.panel}>
      <View style={s.legend}><View style={[s.dot,{backgroundColor:palette.green}]}/><Text style={s.legendText}>Revenus</Text><View style={[s.dot,{backgroundColor:palette.red}]}/><Text style={s.legendText}>Dépenses</Text></View>
      {history.map(row=>{
        const parts=row.month.split("-");
        const label=monthNames[Number(parts[1])-1]+" "+parts[0].slice(2);
        return <View key={row.month} style={s.monthRow}><Text style={s.monthLabel}>{label}</Text><View style={s.bars}><View style={s.track}><View style={[s.bar,{width:(row.income/maxValue*100+"%") as `${number}%`,backgroundColor:palette.green}]}/></View><View style={s.track}><View style={[s.bar,{width:(row.expenses/maxValue*100+"%") as `${number}%`,backgroundColor:palette.red}]}/></View></View></View>;
      })}
      {history.length===0&&<Text style={s.empty}>Les graphiques apparaîtront après tes premières opérations.</Text>}
    </View>
    <Text style={s.sectionTitle}>Où part ton argent ?</Text>
    <View style={s.panel}>
      {categories.length===0?<Text style={s.empty}>Aucune dépense enregistrée ce mois-ci.</Text>:categories.map(item=><View key={item.category} style={s.categoryRow}><View style={s.categoryHeader}><Text style={s.categoryName}>{item.category}</Text><Text style={s.categoryAmount}>{formatMoney(item.amountMinor,currency)}</Text></View><View style={s.track}><View style={[s.bar,{width:(item.amountMinor/maxCategory*100+"%") as `${number}%`,backgroundColor:palette.primary}]}/></View></View>)}
    </View>
    <Text style={s.note}>Les transferts entre tes portefeuilles ne sont pas comptés comme des revenus ou des dépenses.</Text>
  </ScrollView>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:palette.background},content:{padding:20,paddingTop:58,paddingBottom:38},kicker:{color:palette.primary,fontSize: 11,fontWeight:"900",letterSpacing:1.4},title:{color:palette.ink,fontSize: 29,fontWeight:"900",marginTop:6},subtitle:{color:palette.muted,fontSize: 15,lineHeight:20,marginTop:7},
 hero:{backgroundColor:palette.navy,borderRadius:25,padding:21,marginTop:21},heroLabel:{color:"#C0D8CF",fontSize: 13},heroValue:{color:"#FFFFFF",fontSize: 27,fontWeight:"900",marginTop:8},heroDivider:{height:1,backgroundColor:"#356257",marginVertical:17},heroRow:{flexDirection:"row",justifyContent:"space-between"},heroSmall:{color:"#C0D8CF",fontSize: 12},heroIncome:{color:"#B9F0D5",fontSize: 15,fontWeight:"800",marginTop:5},heroExpense:{color:"#FFC4C0",fontSize: 15,fontWeight:"800",marginTop:5},
 sectionTitle:{color:palette.ink,fontSize: 17,fontWeight:"900",marginTop:25,marginBottom:12},panel:{backgroundColor:palette.surface,borderRadius:19,padding:16,borderWidth:1,borderColor:palette.border},legend:{flexDirection:"row",alignItems:"center",gap:7,marginBottom:17},dot:{width:8,height:8,borderRadius:4},legendText:{color:palette.muted,fontSize: 12,marginRight:9},monthRow:{flexDirection:"row",alignItems:"center",marginBottom:14},monthLabel:{color:palette.muted,fontSize: 12,width:43},bars:{flex:1,gap:5},track:{height:8,backgroundColor:palette.background,borderRadius:6,overflow:"hidden"},bar:{height:8,borderRadius:6},categoryRow:{marginBottom:15},categoryHeader:{flexDirection:"row",justifyContent:"space-between",marginBottom:7},categoryName:{color:palette.ink,fontSize: 14,fontWeight:"800"},categoryAmount:{color:palette.muted,fontSize: 13,fontWeight:"700"},empty:{color:palette.muted,fontSize: 14,lineHeight:19},note:{color:palette.muted,fontSize: 12,lineHeight:16,marginTop:15}
});
