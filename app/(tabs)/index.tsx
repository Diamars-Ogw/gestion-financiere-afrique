import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import { getProfile, listAccounts, listRecentTransactions, getMonthTotals, getExpenseCategories, formatMoney } from "@/src/database/finance";
import type { Account, Transaction, UserProfile } from "@/src/types/finance";
import { palette } from "@/src/constants/theme";

type CategoryRow = { category: string; amountMinor: number };
const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Alimentation: "restaurant-outline", "Transport": "car-outline", "Logement": "home-outline",
  Santé: "heart-outline", "Shopping": "bag-handle-outline", "Loisirs": "game-controller-outline",
  "Éducation": "school-outline", "Factures": "receipt-outline"
};
function displayDate(value: string) {
  const date = new Date(value.slice(0, 10) + "T12:00:00");
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(date);
}
function accountIcon(type: Account["type"]): keyof typeof Ionicons.glyphMap {
  if (type === "mobile_money") return "phone-portrait-outline";
  if (type === "bank") return "business-outline";
  if (type === "savings") return "wallet-outline";
  if (type === "cash") return "cash-outline";
  return "layers-outline";
}
export default function Dashboard() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    const now = new Date();
    const month = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    Promise.all([getProfile(db), listAccounts(db), listRecentTransactions(db, 4), getMonthTotals(db, month), getExpenseCategories(db, month)]).then(([p,a,t,m,c]) => {
      if (active) { setProfile(p); setAccounts(a); setTransactions(t); setTotals(m); setCategories(c.slice(0,5)); }
    }).catch(() => {});
    return () => { active = false; };
  }, [db]));
  const total = accounts.reduce((sum,a) => sum + a.balanceMinor, 0);
  const currency = profile?.currency ?? "XOF";
  const net = totals.income - totals.expenses;
  const savingsRate = totals.income > 0 ? Math.max(0, Math.min(100, Math.round((net / totals.income) * 100))) : 0;
  const maxCategory = Math.max(1, ...categories.map(x => x.amountMinor));
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date());

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.header}>
      <View style={s.brandLine}><View style={s.brandMark}><Ionicons name="wallet" size={17} color="#FFFFFF"/></View><Text style={s.brand}>MON BUDGET</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Paramètres du profil" onPress={() => router.push("/(tabs)/settings")} style={s.avatar}><Ionicons name="person-outline" size={20} color={palette.primary}/></Pressable>
    </View>
    <View style={s.greetingRow}><View><Text style={s.greeting}>Bonjour{profile?.displayName ? " " + profile.displayName : ""}</Text><Text style={s.subtitle}>Voici où tu en es aujourd'hui.</Text></View><View style={s.statusDot}/></View>

    <View style={s.balanceCard}>
      <View style={s.balanceTop}><Text style={s.balanceLabel}>SOLDE TOTAL DISPONIBLE</Text><View style={s.eye}><Ionicons name="eye-outline" size={17} color="#D6F2E2"/></View></View>
      <Text style={s.balance}>{formatMoney(total,currency)}</Text>
      <View style={s.balanceBottom}><View style={s.balanceTrend}><Ionicons name="trending-up" size={16} color="#B7F2CF"/><Text style={s.balanceTrendText}>Ton argent, en un seul aperçu</Text></View><View style={s.walletBadge}><Ionicons name="wallet-outline" size={17} color="#FFFFFF"/></View></View>
      <View style={s.orbOne}/><View style={s.orbTwo}/>
    </View>

    <View style={s.sectionHead}><Text style={s.sectionTitle}>Ce mois-ci</Text><Text style={s.period}>{monthLabel}</Text></View>
    <View style={s.summaryRow}>
      <View style={s.summaryCard}><View style={s.summaryTop}><View style={[s.summaryIcon,{backgroundColor:palette.primarySoft}]}><Ionicons name="arrow-down" size={17} color="#16834F"/></View><Text style={s.summaryLabel}>Revenus</Text></View><Text style={s.summaryValue}>{formatMoney(totals.income,currency)}</Text><Text style={s.summaryCaption}>Argent reçu</Text></View>
      <View style={s.summaryCard}><View style={s.summaryTop}><View style={[s.summaryIcon,{backgroundColor:"#FFF0ED"}]}><Ionicons name="arrow-up" size={17} color="#D65B4F"/></View><Text style={s.summaryLabel}>Dépenses</Text></View><Text style={s.summaryValue}>{formatMoney(totals.expenses,currency)}</Text><Text style={s.summaryCaption}>Argent dépensé</Text></View>
    </View>

    <View style={s.savingCard}>
      <View style={s.savingCopy}><Text style={s.savingTitle}>Capacité d'épargne</Text><Text style={s.savingSub}>{totals.income > 0 ? "Part de tes revenus non dépensée" : "Ajoute tes revenus pour suivre ton épargne."}</Text><Text style={s.savingValue}>{formatMoney(net,currency)}</Text></View>
      <View style={s.ring}><View style={s.ringInner}><Text style={s.ringPercent}>{savingsRate}%</Text><Text style={s.ringLabel}>épargné</Text></View></View>
    </View>

    <View style={s.sectionHead}><Text style={s.sectionTitle}>Mes portefeuilles</Text><Pressable onPress={() => router.push("/(tabs)/settings")}><Text style={s.link}>Gérer</Text></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.walletScroll}>
      {accounts.map(account=><View key={account.id} style={s.walletCard}><View style={s.walletIcon}><Ionicons name={accountIcon(account.type)} size={19} color={palette.primary}/></View><Text style={s.walletName} numberOfLines={1}>{account.name}</Text><Text style={s.walletType}>{account.type==="mobile_money"?"Mobile Money":account.type==="bank"?"Banque":account.type==="savings"?"Épargne":account.type==="cash"?"Espèces":"Autre"}</Text><Text style={s.walletBalance}>{formatMoney(account.balanceMinor,account.currency)}</Text></View>)}
      <Pressable onPress={() => router.push("/(tabs)/settings")} style={[s.walletCard,s.addWallet]}><View style={s.addWalletIcon}><Ionicons name="add" size={22} color={palette.primary}/></View><Text style={s.addWalletText}>Ajouter</Text></Pressable>
    </ScrollView>

    <View style={s.sectionHead}><Text style={s.sectionTitle}>Dépenses par catégorie</Text><Pressable onPress={() => router.push("/(tabs)/reports")}><Text style={s.link}>Analyse</Text></Pressable></View>
    <View style={s.panel}>
      {categories.length === 0 ? <View style={s.empty}><Ionicons name="pie-chart-outline" size={25} color={palette.muted}/><Text style={s.emptyText}>Tes dépenses apparaîtront ici.</Text></View> : categories.map(item=><View key={item.category} style={s.categoryRow}><View style={s.categoryIcon}><Ionicons name={categoryIcons[item.category] ?? "pricetag-outline"} size={17} color={palette.primary}/></View><View style={s.categoryMain}><View style={s.categoryHeader}><Text style={s.categoryName}>{item.category}</Text><Text style={s.categoryAmount}>{formatMoney(item.amountMinor,currency)}</Text></View><View style={s.track}><View style={[s.bar,{width:(item.amountMinor/maxCategory*100+"%") as `${number}%`} ]}/></View></View></View>)}
    </View>

    <View style={s.sectionHead}><Text style={s.sectionTitle}>Dernières opérations</Text><Pressable onPress={() => router.push("/(tabs)/transactions")}><Text style={s.link}>Tout voir</Text></Pressable></View>
    <View style={s.panel}>
      {transactions.length === 0 ? <View style={s.empty}><Ionicons name="receipt-outline" size={25} color={palette.muted}/><Text style={s.emptyText}>Aucune opération pour le moment.</Text></View> : transactions.map(t => <View key={t.id} style={s.transactionRow}><View style={[s.transactionIcon,{backgroundColor:t.type==="income"?"#E8F6ED":t.type==="expense"?"#FFF0ED":"#EAF3EF"}]}><Ionicons name={t.type==="income"?"arrow-down":t.type==="expense"?"arrow-up":"swap-horizontal"} size={17} color={t.type==="income"?"#16834F":t.type==="expense"?"#D65B4F":palette.primary}/></View><View style={{flex:1}}><Text style={s.transactionName}>{t.category}</Text><Text style={s.transactionDate}>{displayDate(t.occurredAt)}</Text></View><Text style={[s.transactionAmount,t.type==="income"&&{color:"#16834F"},t.type==="expense"&&{color:"#D65B4F"}]}>{t.type==="expense"?"−":t.type==="income"?"+":""}{formatMoney(t.amountMinor,currency)}</Text></View>)}
    </View>
    <View style={s.bottomSpace}/>
  </ScrollView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:palette.background},content:{paddingHorizontal:20,paddingTop:18,paddingBottom:30},
 header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:22},brandLine:{flexDirection:"row",alignItems:"center",gap:9},brandMark:{width:32,height:32,borderRadius:11,backgroundColor:palette.primary,alignItems:"center",justifyContent:"center"},brand:{color:palette.primary,fontSize:13,fontWeight:"900",letterSpacing:1.8},avatar:{width:43,height:43,borderRadius:15,backgroundColor:palette.primarySoft,alignItems:"center",justifyContent:"center"},
 greetingRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:17},greeting:{color:palette.ink,fontSize:23,fontWeight:"800",letterSpacing:-0.5},subtitle:{color:palette.muted,fontSize:13,marginTop:5},statusDot:{width:9,height:9,borderRadius:5,backgroundColor:"#24A765",marginRight:4},
 balanceCard:{backgroundColor:"#075B3D",borderRadius:25,padding:21,overflow:"hidden",shadowColor:"#06442F",shadowOpacity:0.19,shadowRadius:17,shadowOffset:{width:0,height:9},elevation:5},balanceTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},balanceLabel:{color:"#C5E9D4",fontSize:11,fontWeight:"800",letterSpacing:1.2},eye:{width:30,height:30,borderRadius:10,backgroundColor:"#FFFFFF20",alignItems:"center",justifyContent:"center"},balance:{color:"#FFFFFF",fontSize:31,fontWeight:"900",letterSpacing:-0.8,marginTop:9},balanceBottom:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:19},balanceTrend:{flexDirection:"row",alignItems:"center",gap:7},balanceTrendText:{color:"#D0EBDD",fontSize:12,fontWeight:"600"},walletBadge:{width:39,height:39,borderRadius:14,backgroundColor:"#FFFFFF20",alignItems:"center",justifyContent:"center"},orbOne:{position:"absolute",width:150,height:150,borderRadius:75,borderWidth:1,borderColor:"#FFFFFF18",right:-49,top:-72},orbTwo:{position:"absolute",width:100,height:100,borderRadius:50,borderWidth:1,borderColor:"#FFFFFF15",right:9,top:-44},
 sectionHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:25,marginBottom:12},sectionTitle:{color:palette.ink,fontSize:17,fontWeight:"800",letterSpacing:-0.25},period:{color:palette.muted,fontSize:12,textTransform:"capitalize"},link:{color:palette.primary,fontSize:13,fontWeight:"800"},
 summaryRow:{flexDirection:"row",gap:11},summaryCard:{flex:1,backgroundColor:palette.surface,borderRadius:18,padding:14,borderWidth:1,borderColor:palette.border},summaryTop:{flexDirection:"row",alignItems:"center",gap:8},summaryIcon:{width:29,height:29,borderRadius:10,alignItems:"center",justifyContent:"center"},summaryLabel:{color:palette.muted,fontSize:12,fontWeight:"700"},summaryValue:{color:palette.ink,fontSize:17,fontWeight:"900",marginTop:13},summaryCaption:{color:palette.muted,fontSize:11,marginTop:4},
 savingCard:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:"#EFF7F0",borderRadius:19,padding:17,marginTop:12,borderWidth:1,borderColor:"#DFECE0"},savingCopy:{flex:1,paddingRight:8},savingTitle:{color:palette.ink,fontSize:14,fontWeight:"800"},savingSub:{color:palette.muted,fontSize:11,lineHeight:15,marginTop:4},savingValue:{color:palette.primary,fontSize:17,fontWeight:"900",marginTop:10},ring:{width:76,height:76,borderRadius:38,borderWidth:7,borderColor:"#42A96F",backgroundColor:palette.surface,alignItems:"center",justifyContent:"center"},ringInner:{alignItems:"center"},ringPercent:{color:palette.primary,fontSize:17,fontWeight:"900"},ringLabel:{color:palette.muted,fontSize:9,fontWeight:"700"},
 walletScroll:{gap:10,paddingRight:4},walletCard:{width:148,backgroundColor:palette.surface,borderRadius:17,padding:13,borderWidth:1,borderColor:palette.border},walletIcon:{width:34,height:34,borderRadius:11,backgroundColor:palette.primarySoft,alignItems:"center",justifyContent:"center",marginBottom:10},walletName:{color:palette.ink,fontSize:13,fontWeight:"800"},walletType:{color:palette.muted,fontSize:11,marginTop:3},walletBalance:{color:palette.ink,fontSize:14,fontWeight:"900",marginTop:10},addWallet:{alignItems:"center",justifyContent:"center",borderStyle:"dashed",backgroundColor:palette.background},addWalletIcon:{width:35,height:35,borderRadius:18,backgroundColor:palette.primarySoft,alignItems:"center",justifyContent:"center"},addWalletText:{color:palette.primary,fontSize:12,fontWeight:"800",marginTop:8},
 panel:{backgroundColor:palette.surface,borderRadius:19,padding:15,borderWidth:1,borderColor:palette.border},empty:{alignItems:"center",paddingVertical:17,gap:8},emptyText:{color:palette.muted,fontSize:12},categoryRow:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:14},categoryIcon:{width:34,height:34,borderRadius:11,backgroundColor:palette.primarySoft,alignItems:"center",justifyContent:"center"},categoryMain:{flex:1},categoryHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:7},categoryName:{color:palette.ink,fontSize:12,fontWeight:"700"},categoryAmount:{color:palette.ink,fontSize:12,fontWeight:"800"},track:{height:6,backgroundColor:palette.surfaceMuted,borderRadius:5,overflow:"hidden"},bar:{height:6,backgroundColor:"#24A765",borderRadius:5},
 transactionRow:{flexDirection:"row",alignItems:"center",paddingVertical:10,borderBottomWidth:1,borderBottomColor:palette.border},transactionIcon:{width:36,height:36,borderRadius:12,alignItems:"center",justifyContent:"center",marginRight:11},transactionName:{color:palette.ink,fontSize:13,fontWeight:"800"},transactionDate:{color:palette.muted,fontSize:11,marginTop:3},transactionAmount:{color:palette.ink,fontSize:12,fontWeight:"900"},bottomSpace:{height:8}
});
