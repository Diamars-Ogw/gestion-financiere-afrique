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
    Promise.all([getProfile(db), listAccounts(db), listRecentTransactions(db, 5), getMonthTotals(db, month)]).then(([p, a, t, m]) => {
      if (active) { setProfile(p); setAccounts(a); setTransactions(t); setTotals(m); }
    });
    return () => { active = false; };
  }, [db]));
  const total = accounts.reduce((sum, a) => sum + a.balanceMinor, 0);
  const currency = profile?.currency ?? "XOF";
  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <View style={s.header}>
        <View><Text style={s.kicker}>VOTRE ESPACE FINANCIER</Text><Text style={s.greeting}>Bonjour{profile?.displayName ? ", " + profile.displayName : ""} 👋</Text></View>
        <Pressable onPress={() => router.push("/(tabs)/settings")} style={s.avatar}><Ionicons name="person" size={19} color={palette.primary} /></Pressable>
      </View>
      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>Solde total enregistré</Text>
        <Text style={s.balance}>{formatMoney(total, currency)}</Text>
        <Text style={s.balanceNote}>Sur {accounts.length} portefeuille(s) · Données locales</Text>
        <View style={s.cardFooter}>
          <View><Text style={s.cardSmall}>Revenus du mois</Text><Text style={s.cardValue}>{formatMoney(totals.income, currency)}</Text></View>
          <View><Text style={s.cardSmall}>Dépenses du mois</Text><Text style={s.cardValue}>{formatMoney(totals.expenses, currency)}</Text></View>
        </View>
      </View>
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Accès rapide</Text></View>
      <View style={s.quickGrid}>
        <Pressable onPress={() => router.push({ pathname: "/(tabs)/transactions", params: { type: "income" } })} style={s.quickItem}><Ionicons name="add-circle-outline" size={22} color={palette.green} /><Text style={s.quickLabel}>Ajouter revenu</Text></Pressable>
        <Pressable onPress={() => router.push({ pathname: "/(tabs)/transactions", params: { type: "expense" } })} style={s.quickItem}><Ionicons name="remove-circle-outline" size={22} color={palette.red} /><Text style={s.quickLabel}>Ajouter dépense</Text></Pressable>
        <Pressable onPress={() => router.push("/(tabs)/transactions")} style={s.quickItem}><Ionicons name="swap-horizontal-outline" size={22} color={palette.primary} /><Text style={s.quickLabel}>Faire un transfert</Text></Pressable>
        <Pressable onPress={() => router.push("/(tabs)/budgets")} style={s.quickItem}><Ionicons name="pie-chart-outline" size={22} color={palette.primary} /><Text style={s.quickLabel}>Mes budgets</Text></Pressable>
        <Pressable onPress={() => router.push("/(tabs)/goals")} style={s.quickItem}><Ionicons name="flag-outline" size={22} color={palette.primary} /><Text style={s.quickLabel}>Objectifs d’épargne</Text></Pressable>
        <Pressable onPress={() => router.push("/(tabs)/debts")} style={s.quickItem}><Ionicons name="swap-vertical-outline" size={22} color={palette.primary} /><Text style={s.quickLabel}>Dettes et créances</Text></Pressable>
        <Pressable onPress={() => router.push("/(tabs)/recurring")} style={s.quickItem}><Ionicons name="calendar-outline" size={22} color={palette.primary} /><Text style={s.quickLabel}>Échéances régulières</Text></Pressable>
        <Pressable onPress={() => router.push("/(tabs)/assistant")} style={s.quickItem}><Ionicons name="bulb-outline" size={22} color={palette.primary} /><Text style={s.quickLabel}>Assistant financier</Text></Pressable>
        <Pressable onPress={() => router.push("/(tabs)/reports")} style={s.quickItem}><Ionicons name="stats-chart-outline" size={22} color={palette.primary} /><Text style={s.quickLabel}>Statistiques</Text></Pressable>
        <Pressable onPress={() => router.push("/(tabs)/backup")} style={s.quickItem}><Ionicons name="cloud-download-outline" size={22} color={palette.primary} /><Text style={s.quickLabel}>Sauvegarder</Text></Pressable>
      </View>
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Comptes et portefeuilles</Text><Pressable onPress={() => router.push("/(tabs)/settings")}><Text style={s.link}>Gérer</Text></Pressable></View>
      {accounts.length === 0 ? <View style={s.empty}><Ionicons name="wallet-outline" size={25} color={palette.muted} /><Text style={s.emptyTitle}>Aucun portefeuille</Text><Text style={s.emptyText}>Ajoutez votre portefeuille espèces, banque ou Mobile Money.</Text></View> : accounts.map(a => (
        <View key={a.id} style={s.row}><View style={s.accountIcon}><Ionicons name="wallet-outline" size={18} color={palette.primary} /></View><View style={{ flex: 1 }}><Text style={s.accountName}>{a.name}</Text><Text style={s.accountType}>{a.type}</Text></View><Text style={s.accountBalance}>{formatMoney(a.balanceMinor, a.currency)}</Text></View>
      ))}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Dernières opérations</Text><Pressable onPress={() => router.push("/(tabs)/transactions")}><Text style={s.link}>Historique</Text></Pressable></View>
      {transactions.length === 0 ? <View style={s.empty}><Text style={s.emptyTitle}>Votre historique commencera ici</Text><Text style={s.emptyText}>Chaque opération enregistrée aidera à construire votre bilan financier.</Text></View> : transactions.map(t => (
        <View key={t.id} style={s.row}><View style={s.accountIcon}><Ionicons name={t.type === "income" ? "arrow-down" : t.type === "expense" ? "arrow-up" : "swap-horizontal"} size={18} color={t.type === "income" ? palette.green : t.type === "expense" ? palette.red : palette.primary} /></View><View style={{ flex: 1 }}><Text style={s.accountName}>{t.category}</Text><Text style={s.accountType}>{t.occurredAt.slice(0, 10)}</Text></View><Text style={[s.accountBalance, t.type === "income" && { color: palette.green }, t.type === "expense" && { color: palette.red }]}>{t.type === "expense" ? "−" : t.type === "income" ? "+" : ""}{formatMoney(t.amountMinor, currency)}</Text></View>
      ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, paddingTop: 58, paddingBottom: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  kicker: { color: palette.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  greeting: { color: palette.ink, fontSize: 24, fontWeight: "800", marginTop: 6 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: palette.primarySoft, alignItems: "center", justifyContent: "center" },
  balanceCard: { backgroundColor: palette.navy, borderRadius: 22, padding: 21 },
  balanceLabel: { color: "#B7C1D2", fontSize: 12 },
  balance: { color: "white", fontSize: 29, fontWeight: "800", marginTop: 9 },
  balanceNote: { color: "#B7C1D2", fontSize: 10, marginTop: 7 },
  cardFooter: { flexDirection: "row", borderTopColor: "#344156", borderTopWidth: 1, marginTop: 20, paddingTop: 15, justifyContent: "space-between" },
  cardSmall: { color: "#B7C1D2", fontSize: 10 },
  cardValue: { color: "white", fontSize: 13, fontWeight: "700", marginTop: 5 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 25, marginBottom: 12 },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: "800" },
  link: { color: palette.primary, fontSize: 11, fontWeight: "700" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  quickItem: { width: "48%", backgroundColor: palette.surface, borderRadius: 15, padding: 14, minHeight: 82, justifyContent: "center", gap: 8 },
  quickLabel: { color: palette.ink, fontSize: 11, fontWeight: "700" },
  empty: { backgroundColor: palette.surface, borderRadius: 16, padding: 20, alignItems: "center" },
  emptyTitle: { color: palette.ink, fontSize: 13, fontWeight: "700", marginTop: 8 },
  emptyText: { color: palette.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 5 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: palette.surface, padding: 13, borderRadius: 14, marginBottom: 8 },
  accountIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.primarySoft, alignItems: "center", justifyContent: "center", marginRight: 11 },
  accountName: { color: palette.ink, fontWeight: "700", fontSize: 12 },
  accountType: { color: palette.muted, fontSize: 10, marginTop: 3 },
  accountBalance: { color: palette.ink, fontSize: 12, fontWeight: "800" }
});
