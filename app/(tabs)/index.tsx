import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import { getProfile, listAccounts, listRecentTransactions, getMonthTotals, formatMoney } from "@/src/database/finance";
import type { Account, Transaction, UserProfile } from "@/src/types/finance";
import { palette } from "@/src/constants/theme";

export default function Dashboard() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  useFocusEffect(useCallback(() => {
    let active = true;
    const now = new Date();
    const month = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    Promise.all([getProfile(db), listAccounts(db), listRecentTransactions(db, 4), getMonthTotals(db, month)]).then(([p,a,t,m]) => {
      if (active) { setProfile(p); setAccounts(a); setTransactions(t); setTotals(m); }
    });
    return () => { active = false; };
  }, [db]));
  const total = accounts.reduce((sum,a) => sum + a.balanceMinor, 0);
  const currency = profile?.currency ?? "XOF";
  const net = totals.income - totals.expenses;

  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.header}>
      <View><Text style={s.kicker}>MON BUDGET</Text><Text style={s.greeting}>Bonjour{profile?.displayName ? ", " + profile.displayName : ""} 👋</Text><Text style={s.date}>{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</Text></View>
      <Pressable onPress={() => router.push("/(tabs)/settings")} style={s.avatar}><Ionicons name="person-outline" size={20} color={palette.primary}/></Pressable>
    </View>
    <View style={s.balanceCard}>
      <Text style={s.balanceLabel}>Solde disponible</Text>
      <Text style={s.balance}>{formatMoney(total,currency)}</Text>
      <View style={s.cardDivider}/>
      <View style={s.balanceMeta}><View><Text style={s.cardSmall}>Ce mois-ci</Text><Text style={s.netValue}>{formatMoney(net,currency)}</Text><Text style={s.netHint}>Reste après revenus et dépenses enregistrés</Text></View><View style={s.netIcon}><Ionicons name="trending-up" size={23} color="#C9F2DE"/></View></View>
    </View>
    <View style={s.sectionHeader}><Text style={s.sectionTitle}>Vue rapide</Text><Pressable onPress={() => router.push("/(tabs)/reports")}><Text style={s.link}>Voir l'analyse</Text></Pressable></View>
    <View style={s.metrics}>
      <View style={s.metricCard}><View style={s.metricTop}><Ionicons name="arrow-down-circle" color={palette.green} size={19}/><Text style={s.metricLabel}>Revenus</Text></View><Text style={s.metricValue}>{formatMoney(totals.income,currency)}</Text></View>
      <View style={s.metricCard}><View style={s.metricTop}><Ionicons name="arrow-up-circle" color={palette.red} size={19}/><Text style={s.metricLabel}>Dépenses</Text></View><Text style={s.metricValue}>{formatMoney(totals.expenses,currency)}</Text></View>
    </View>
    <View style={s.sectionHeader}><Text style={s.sectionTitle}>Raccourcis</Text></View>
    <View style={s.shortcuts}>
      <Pressable onPress={() => router.push({pathname:"/(tabs)/transactions",params:{type:"income"}})} style={s.shortcut}><Ionicons name="add" size={23} color="#FFFFFF"/><Text style={s.shortcutText}>Revenu</Text></Pressable>
      <Pressable onPress={() => router.push({pathname:"/(tabs)/transactions",params:{type:"expense"}})} style={[s.shortcut,s.shortcutExpense]}><Ionicons name="remove" size={23} color={palette.ink}/><Text style={[s.shortcutText,{color:palette.ink}]}>Dépense</Text></Pressable>
      <Pressable onPress={() => router.push("/(tabs)/transactions")} style={[s.shortcut,s.shortcutNeutral]}><Ionicons name="swap-horizontal" size={22} color={palette.primary}/><Text style={[s.shortcutText,{color:palette.ink}]}>Transfert</Text></Pressable>
    </View>
    <View style={s.sectionHeader}><Text style={s.sectionTitle}>Dernières opérations</Text><Pressable onPress={() => router.push("/(tabs)/transactions")}><Text style={s.link}>Tout voir</Text></Pressable></View>
    {transactions.length === 0 ? <View style={s.empty}><Ionicons name="receipt-outline" size={28} color={palette.muted}/><Text style={s.emptyTitle}>Rien pour le moment</Text><Text style={s.emptyText}>Tes opérations apparaîtront ici.</Text></View> : transactions.map(t => <View key={t.id} style={s.transactionRow}>
      <View style={s.transactionIcon}><Ionicons name={t.type==="income"?"arrow-down":t.type==="expense"?"arrow-up":"swap-horizontal"} size={18} color={t.type==="income"?palette.green:t.type==="expense"?palette.red:palette.primary}/></View>
      <View style={{flex:1}}><Text style={s.transactionName}>{t.category}</Text><Text style={s.transactionDate}>{t.occurredAt.slice(0,10)}</Text></View>
      <Text style={[s.transactionAmount,t.type==="income"&&{color:palette.green},t.type==="expense"&&{color:palette.red}]}>{t.type==="expense"?"−":t.type==="income"?"+":""}{formatMoney(t.amountMinor,currency)}</Text>
    </View>)}
    <View style={s.sectionHeader}><Text style={s.sectionTitle}>Mon espace</Text></View>
    <View style={s.tools}>
      {[
        {label:"Objectifs",icon:"flag-outline" as const,path:"/(tabs)/goals" as const},
        {label:"Dettes",icon:"swap-vertical-outline" as const,path:"/(tabs)/debts" as const},
        {label:"Échéances",icon:"calendar-outline" as const,path:"/(tabs)/recurring" as const},
        {label:"Assistant",icon:"sparkles-outline" as const,path:"/(tabs)/assistant" as const},
        {label:"Transport",icon:"car-outline" as const,path:"/(tabs)/transport" as const},
        {label:"Calendrier",icon:"calendar-number-outline" as const,path:"/(tabs)/calendar" as const},
        {label:"Sauvegarde",icon:"shield-checkmark-outline" as const,path:"/(tabs)/backup" as const}
      ].map(item => <Pressable key={item.label} onPress={() => router.push(item.path)} style={s.tool}><Ionicons name={item.icon} size={19} color={palette.primary}/><Text style={s.toolText}>{item.label}</Text></Pressable>)}
    </View>
  </ScrollView>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:palette.background},content:{padding:20,paddingTop:58,paddingBottom:35},
 header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:22},kicker:{color:palette.primary,fontSize: 12,fontWeight:"900",letterSpacing:1.7},greeting:{color:palette.ink,fontSize: 23,fontWeight:"900",marginTop:6},date:{color:palette.muted,fontSize: 13,marginTop:4},
 avatar:{width:44,height:44,borderRadius:16,backgroundColor:palette.primarySoft,alignItems:"center",justifyContent:"center"},
 balanceCard:{backgroundColor:palette.navy,borderRadius:27,padding:22,shadowColor:"#123D31",shadowOpacity:0.12,shadowRadius:18,shadowOffset:{width:0,height:9},elevation:4},
 balanceLabel:{color:"#C0D8CF",fontSize: 14},balance:{color:"#FFFFFF",fontSize: 30,fontWeight:"900",marginTop:9,letterSpacing:-0.5},cardDivider:{height:1,backgroundColor:"#356257",marginTop:19,marginBottom:15},
 balanceMeta:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},cardSmall:{color:"#C0D8CF",fontSize: 12},netValue:{color:"#FFFFFF",fontSize: 18,fontWeight:"800",marginTop:5},netHint:{color:"#A8C7BA",fontSize: 11,marginTop:4},netIcon:{width:42,height:42,borderRadius:15,backgroundColor:"#28634F",alignItems:"center",justifyContent:"center"},
 sectionHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:25,marginBottom:12},sectionTitle:{color:palette.ink,fontSize: 17,fontWeight:"800"},link:{color:palette.primary,fontSize: 13,fontWeight:"800"},
 metrics:{flexDirection:"row",gap:11},metricCard:{flex:1,backgroundColor:palette.surface,borderRadius:18,padding:15,borderWidth:1,borderColor:palette.border},metricTop:{flexDirection:"row",alignItems:"center",gap:7},metricLabel:{color:palette.muted,fontSize: 13,fontWeight:"700"},metricValue:{color:palette.ink,fontSize: 16,fontWeight:"900",marginTop:12},
 shortcuts:{flexDirection:"row",gap:10},shortcut:{flex:1,backgroundColor:palette.primary,borderRadius:16,padding:14,alignItems:"center",gap:6},shortcutExpense:{backgroundColor:"#FCEDEB"},shortcutNeutral:{backgroundColor:palette.primarySoft},shortcutText:{color:"#FFFFFF",fontSize: 13,fontWeight:"800"},
 empty:{backgroundColor:palette.surface,borderRadius:18,padding:22,alignItems:"center",borderWidth:1,borderColor:palette.border},emptyTitle:{color:palette.ink,fontSize: 15,fontWeight:"800",marginTop:9},emptyText:{color:palette.muted,fontSize: 13,marginTop:5},
 transactionRow:{flexDirection:"row",alignItems:"center",backgroundColor:palette.surface,padding:13,borderRadius:15,marginBottom:8,borderWidth:1,borderColor:palette.border},transactionIcon:{width:37,height:37,borderRadius:13,backgroundColor:palette.background,alignItems:"center",justifyContent:"center",marginRight:11},transactionName:{color:palette.ink,fontSize: 14,fontWeight:"800"},transactionDate:{color:palette.muted,fontSize: 12,marginTop:4},transactionAmount:{color:palette.ink,fontSize: 14,fontWeight:"900"},
 tools:{flexDirection:"row",flexWrap:"wrap",gap:9},tool:{width:"31%",backgroundColor:palette.surface,borderRadius:15,padding:13,alignItems:"center",gap:7,borderWidth:1,borderColor:palette.border},toolText:{color:palette.ink,fontSize: 12,fontWeight:"700"}
});
