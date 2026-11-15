import { useCallback, useState } from "react";
import { LayoutAnimation, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { formatMoney, getExpenseCategories, getMonthlyHistory } from "@/src/database/finance";
import { palette } from "@/src/constants/theme";

type MonthRow = { month: string; income: number; expenses: number };
type CategoryRow = { category: string; amountMinor: number };
const months = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
export default function Reports() {
 const db=useSQLiteContext();
 const [history,setHistory]=useState<MonthRow[]>([]);
 const [categories,setCategories]=useState<CategoryRow[]>([]);
 const [currency,setCurrency]=useState("XOF");
 const refresh=useCallback(()=>{let active=true;const d=new Date();const month=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");Promise.all([getMonthlyHistory(db,6),getExpenseCategories(db,month),db.getFirstAsync<{currency:string}>("SELECT currency FROM profile WHERE id=1")]).then(([h,c,p])=>{if(active){LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);setHistory(h);setCategories(c);setCurrency(p?.currency??"XOF");}});return()=>{active=false;};},[db]);
 useFocusEffect(refresh);
 const income=history.reduce((n,x)=>n+x.income,0), expenses=history.reduce((n,x)=>n+x.expenses,0), net=income-expenses;
 const rate=income>0?Math.round(net/income*100):0;
 const max=Math.max(1,...history.flatMap(x=>[x.income,x.expenses]));
 const catMax=Math.max(1,...categories.map(x=>x.amountMinor));
 const current=history[history.length-1];
 const previous=history[history.length-2];
 const expenseDelta=previous&&previous.expenses>0?Math.round((current.expenses-previous.expenses)/previous.expenses*100):null;
 return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
  <Text style={s.eyebrow}>PILOTAGE FINANCIER</Text><Text style={s.title}>Analyse</Text><Text style={s.subtitle}>Tes chiffres racontent une histoire. Voici ce qu'ils disent.</Text>
  <View style={s.hero}><View style={s.heroTop}><Text style={s.heroLabel}>Solde net · 6 derniers mois</Text><View style={s.liveDot}/></View><Text style={s.heroValue}>{formatMoney(net,currency)}</Text><Text style={s.heroCaption}>Revenus moins dépenses enregistrés</Text><View style={s.heroLine}/><View style={s.heroMetrics}><View><Text style={s.heroMetricLabel}>REVENUS</Text><Text style={s.heroIncome}>{formatMoney(income,currency)}</Text></View><View><Text style={s.heroMetricLabel}>DÉPENSES</Text><Text style={s.heroExpense}>{formatMoney(expenses,currency)}</Text></View></View></View>
  <View style={s.kpiRow}><View style={s.kpi}><Text style={s.kpiLabel}>Taux d'épargne</Text><Text style={s.kpiValue}>{rate}%</Text><View style={s.progress}><View style={[s.progressFill,{width:(Math.max(0,Math.min(100,rate))+"%") as `${number}%`}]}/></View></View><View style={s.kpi}><Text style={s.kpiLabel}>Évolution dépenses</Text><Text style={[s.kpiValue,expenseDelta!==null&&expenseDelta>0?s.negative: s.positive]}>{expenseDelta===null?"—":(expenseDelta>0?"+":"")+expenseDelta+"%"}</Text><Text style={s.kpiHint}>vs mois précédent</Text></View></View>
  <Text style={s.section}>Flux financiers</Text><View style={s.panel}><View style={s.legend}><View style={[s.dot,{backgroundColor:"#23A66A"}]}/><Text style={s.legendText}>Revenus</Text><View style={[s.dot,{backgroundColor:"#E16C61"}]}/><Text style={s.legendText}>Dépenses</Text></View>
  {history.map(row=>{const [y,m]=row.month.split("-");return <View key={row.month} style={s.chartRow}><Text style={s.month}>{months[Number(m)-1]} {y.slice(2)}</Text><View style={s.chartColumns}><View style={s.track}><View style={[s.bar,{width:(row.income/max*100+"%") as `${number}%`,backgroundColor:"#23A66A"}]}/></View><View style={s.track}><View style={[s.bar,{width:(row.expenses/max*100+"%") as `${number}%`,backgroundColor:"#E16C61"}]}/></View></View></View>})}
  {history.length===0&&<Text style={s.empty}>Ajoute tes premières opérations pour voir apparaître tes graphiques.</Text>}</View>
  <Text style={s.section}>Répartition des dépenses</Text><View style={s.panel}>{categories.length===0?<Text style={s.empty}>Aucune dépense enregistrée ce mois-ci.</Text>:categories.slice(0,7).map((item,index)=><View key={item.category} style={s.category}><View style={s.catTop}><Text style={s.catName}>{item.category}</Text><Text style={s.catAmount}>{formatMoney(item.amountMinor,currency)}</Text></View><View style={s.track}><View style={[s.bar,{width:(item.amountMinor/catMax*100+"%") as `${number}%`,backgroundColor:["#087A4B","#32A875","#85CDA4","#D4A34A","#6B8FB5","#A58CC2","#DB8A7C"][index%7]}]}/></View></View>)}</View>
  <View style={s.note}><Text style={s.noteTitle}>Comment lire ces chiffres ?</Text><Text style={s.noteText}>Le taux d'épargne compare le solde net aux revenus enregistrés. Les transferts entre tes propres portefeuilles sont exclus pour éviter de compter deux fois le même argent.</Text></View>
 </ScrollView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:palette.background},content:{padding:20,paddingTop:26,paddingBottom:44},
 eyebrow:{color:palette.primary,fontSize:11,fontWeight:"900",letterSpacing:1.8},title:{color:palette.ink,fontSize:31,fontWeight:"900",letterSpacing:-.8,marginTop:7},subtitle:{color:palette.muted,fontSize:14,lineHeight:21,marginTop:7},
 hero:{backgroundColor:"#064B35",borderRadius:28,padding:22,marginTop:22,overflow:"hidden"},heroTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},heroLabel:{color:"#B8DCCB",fontSize:12,fontWeight:"700"},liveDot:{width:8,height:8,borderRadius:4,backgroundColor:"#80E2A9"},heroValue:{color:"#FFFFFF",fontSize:29,fontWeight:"900",letterSpacing:-.7,marginTop:13},heroCaption:{color:"#B8DCCB",fontSize:11,marginTop:5},heroLine:{height:1,backgroundColor:"#FFFFFF24",marginVertical:18},heroMetrics:{flexDirection:"row",justifyContent:"space-between"},heroMetricLabel:{color:"#A9CFBC",fontSize:10,fontWeight:"800",letterSpacing:1},heroIncome:{color:"#A8F0C8",fontSize:15,fontWeight:"800",marginTop:5},heroExpense:{color:"#FFC3BA",fontSize:15,fontWeight:"800",marginTop:5},
 kpiRow:{flexDirection:"row",gap:11,marginTop:13},kpi:{flex:1,backgroundColor:palette.surface,borderRadius:20,padding:15,borderWidth:1,borderColor:palette.border},kpiLabel:{color:palette.muted,fontSize:11,fontWeight:"700"},kpiValue:{color:palette.ink,fontSize:24,fontWeight:"900",marginTop:9},kpiHint:{color:palette.muted,fontSize:10,marginTop:3},positive:{color:"#16834F"},negative:{color:"#D65B4F"},progress:{height:5,backgroundColor:palette.background,borderRadius:5,overflow:"hidden",marginTop:9},progressFill:{height:5,backgroundColor:"#25A66B",borderRadius:5},
 section:{color:palette.ink,fontSize:18,fontWeight:"900",letterSpacing:-.3,marginTop:27,marginBottom:12},panel:{backgroundColor:palette.surface,borderRadius:22,padding:17,borderWidth:1,borderColor:palette.border},legend:{flexDirection:"row",alignItems:"center",gap:7,marginBottom:18},dot:{width:8,height:8,borderRadius:4},legendText:{color:palette.muted,fontSize:11,fontWeight:"700",marginRight:9},chartRow:{flexDirection:"row",alignItems:"center",marginBottom:14},month:{color:palette.muted,fontSize:11,width:42,fontWeight:"700"},chartColumns:{flex:1,gap:5},track:{height:8,backgroundColor:palette.background,borderRadius:6,overflow:"hidden"},bar:{height:8,borderRadius:6},empty:{color:palette.muted,fontSize:13,lineHeight:19,paddingVertical:10},category:{marginBottom:15},catTop:{flexDirection:"row",justifyContent:"space-between",marginBottom:8},catName:{color:palette.ink,fontSize:13,fontWeight:"800"},catAmount:{color:palette.muted,fontSize:12,fontWeight:"700"},note:{backgroundColor:palette.primarySoft,borderRadius:18,padding:16,marginTop:15},noteTitle:{color:palette.primary,fontSize:13,fontWeight:"900"},noteText:{color:palette.ink,fontSize:12,lineHeight:18,marginTop:6}
});