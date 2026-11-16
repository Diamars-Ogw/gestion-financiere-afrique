import { useCallback, useEffect, useState, useMemo } from "react";
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getProfile, listAccounts, listRecentTransactions, getMonthTotals, getExpenseCategories, listCalendarEvents, formatMoney } from "@/src/database/finance";
import { currencyFractionDigits } from "@/src/utils/money";
import type { Account, Transaction, UserProfile } from "@/src/types/finance";
import { gradients } from "@/src/constants/theme";
import type { Palette } from "@/src/constants/theme";
import { useTheme, useThemeController } from "@/src/components/ThemeProvider";
import { Text } from "@/src/components/AppText";

type CategoryRow = { category: string; amountMinor: number };
const HIDE_KEY = "mon-budget-hide-balance";
const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Alimentation: "restaurant-outline", Transport: "car-outline", Logement: "home-outline",
  Santé: "heart-outline", Shopping: "bag-handle-outline", Loisirs: "game-controller-outline",
  Éducation: "school-outline", Factures: "receipt-outline"
};

function monthKey(date: Date) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0"); }
function dayKey(date: Date) { return monthKey(date) + "-" + String(date.getDate()).padStart(2, "0"); }
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
/** Montant court pour le dessus des barres : 12 500 -> « 13 k », 1 250 000 -> « 1,3 M ». */
function compact(amountMinor: number, currency: string) {
  const value = amountMinor / 10 ** currencyFractionDigits(currency);
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",") + " M";
  if (value >= 1_000) return Math.round(value / 1_000) + " k";
  return String(Math.round(value));
}

function WalletArt() {
  return <Svg width={104} height={86} viewBox="0 0 120 100">
    <Rect x={20} y={6} width={74} height={44} rx={8} fill="#CFF5DE" transform="rotate(-12 57 28)" />
    <Rect x={30} y={12} width={74} height={44} rx={8} fill="#A8E8C2" transform="rotate(6 67 34)" />
    <Rect x={6} y={30} width={100} height={64} rx={16} fill="#1FA86E" />
    <Path d="M6 46 Q6 30 22 30 H90 Q106 30 106 46 Z" fill="#3CC88A" />
    <Rect x={74} y={50} width={42} height={28} rx={11} fill="#0A6B45" />
    <Circle cx={90} cy={64} r={5.5} fill="#E7FFF0" />
  </Svg>;
}

function Ring({ percent }: { percent: number }) {
  const palette = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const size = 88, stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={palette.surfaceMuted} strokeWidth={stroke} fill="none" />
        {percent > 0 && <Circle cx={size / 2} cy={size / 2} r={r} stroke={palette.primary} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(c * percent) / 100} ${c}`} />}
      </G>
    </Svg>
    <View style={{ position: "absolute", alignItems: "center" }}>
      <Text style={s.ringPercent}>{percent}%</Text>
      <Text style={s.ringLabel}>gardé</Text>
    </View>
  </View>;
}

export default function Dashboard() {
  const palette = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { scheme } = useThemeController();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [previous, setPrevious] = useState({ income: 0, expenses: 0 });
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [dueSoon, setDueSoon] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HIDE_KEY).then(value => setHidden(value === "1")).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => {
    setStatusBarStyle("light");
    return () => setStatusBarStyle(scheme === "dark" ? "light" : "dark");
  }, [scheme]));
  useFocusEffect(useCallback(() => {
    let active = true;
    const now = new Date();
    const limit = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    Promise.all([
      getProfile(db), listAccounts(db), listRecentTransactions(db, 4),
      getMonthTotals(db, monthKey(now)), getMonthTotals(db, monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))),
      getExpenseCategories(db, monthKey(now)), listCalendarEvents(db)
    ]).then(([p, a, t, m, pm, c, events]) => {
      if (!active) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setProfile(p); setAccounts(a); setTransactions(t); setTotals(m); setPrevious(pm); setCategories(c.slice(0, 5));
      setDueSoon(events.some(e => !e.isDone && e.dueDate <= dayKey(limit)));
    }).catch(() => {});
    return () => { active = false; };
  }, [db]));

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    AsyncStorage.setItem(HIDE_KEY, next ? "1" : "0").catch(() => {});
  }

  const total = accounts.reduce((sum, a) => sum + a.balanceMinor, 0);
  const currency = profile?.currency ?? "XOF";
  const net = totals.income - totals.expenses;
  const hasActivity = totals.income > 0 || totals.expenses > 0;
  const savingsRate = totals.income > 0 ? Math.max(0, Math.min(100, Math.round((net / totals.income) * 100))) : 0;
  const base = Math.max(totals.income, totals.expenses, 1);
  const maxCategory = Math.max(1, ...categories.map(x => x.amountMinor));
  const expenseChange = previous.expenses > 0 && totals.expenses > 0 ? Math.round(((totals.expenses - previous.expenses) / previous.expenses) * 100) : null;
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date());
  const money = (amount: number) => hidden ? "••••••" : formatMoney(amount, currency);

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <LinearGradient colors={gradients.header} style={[s.hero, { paddingTop: insets.top + 12 }]}>
      <View style={s.header}>
        <View style={s.brandLine}><View style={s.brandMark}><Ionicons name="wallet" size={17} color="#FFFFFF" /></View><Text style={s.brand}>MON BUDGET</Text></View>
        <View style={s.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={dueSoon ? "Échéances à venir" : "Calendrier des échéances"} onPress={() => router.push("/(tabs)/calendar")} style={s.iconButton}>
            <Ionicons name="notifications-outline" size={21} color="#FFFFFF" />
            {dueSoon && <View style={s.badge} />}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Paramètres du profil" onPress={() => router.push("/(tabs)/settings")} style={s.iconButton}><Ionicons name="person-outline" size={20} color="#FFFFFF" /></Pressable>
        </View>
      </View>
      <Text style={s.greeting}>Bonjour{profile?.displayName ? " " + profile.displayName : ""} 👋</Text>
      <Text style={s.subtitle}>Voici ton aperçu financier.</Text>

      <View style={s.balanceCard}>
        <View style={s.balanceTop}>
          <Text style={s.balanceLabel}>SOLDE TOTAL DISPONIBLE</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? "Afficher le solde" : "Masquer le solde"} onPress={toggleHidden} hitSlop={10}>
            <Ionicons name={hidden ? "eye-off-outline" : "eye-outline"} size={19} color="#D6F2E2" />
          </Pressable>
        </View>
        <View style={s.balanceAmountBox}>
          <Text style={s.balance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{money(total)}</Text>
        </View>
        <View style={s.trendLine}>
          <Ionicons name={!hasActivity || net >= 0 ? "trending-up" : "trending-down"} size={16} color={!hasActivity || net >= 0 ? palette.mint : "#FFB4A8"} />
          <Text style={s.trendText} numberOfLines={1}>{hasActivity ? (net >= 0 ? "+" : "−") + (hidden ? "••••" : formatMoney(Math.abs(net), currency)) + " ce mois-ci" : "Aucune opération ce mois-ci"}</Text>
        </View>
        {expenseChange !== null && <Text style={s.compareText}>Dépenses {expenseChange > 0 ? "+" : expenseChange < 0 ? "−" : ""}{Math.abs(expenseChange)} % vs mois dernier</Text>}
        <View style={s.walletArt} pointerEvents="none"><WalletArt /></View>
      </View>
    </LinearGradient>

    <View style={s.body}>
      <View style={s.sectionHead}><Text style={s.sectionTitle}>Revenus et dépenses</Text><Text style={s.period}>{monthLabel}</Text></View>
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <View style={s.summaryTop}><View style={[s.summaryIcon, { backgroundColor: palette.incomeSoft }]}><Ionicons name="arrow-down" size={17} color={palette.income} /></View><Text style={s.summaryLabel}>Revenus</Text></View>
          <Text style={s.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{money(totals.income)}</Text>
          <View style={s.track}><View style={[s.fill, { backgroundColor: palette.green, width: (totals.income / base * 100 + "%") as `${number}%` }]} /></View>
        </View>
        <View style={s.summaryCard}>
          <View style={s.summaryTop}><View style={[s.summaryIcon, { backgroundColor: palette.expenseSoft }]}><Ionicons name="arrow-up" size={17} color={palette.expense} /></View><Text style={s.summaryLabel}>Dépenses</Text></View>
          <Text style={s.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{money(totals.expenses)}</Text>
          <View style={s.track}><View style={[s.fill, { backgroundColor: palette.expense, width: (totals.expenses / base * 100 + "%") as `${number}%` }]} /></View>
        </View>
      </View>

      <View style={s.savingCard}>
        <View style={s.savingCopy}>
          <Text style={s.savingTitle}>Capacité d'épargne</Text>
          <Text style={s.savingSub}>{totals.income > 0 ? "Part de tes revenus non dépensée" : "Ajoute tes revenus pour la suivre."}</Text>
          <Text style={s.savingValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{money(net)}</Text>
        </View>
        <Ring percent={savingsRate} />
      </View>

      <View style={s.sectionHead}><Text style={s.sectionTitle}>Mes portefeuilles</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/settings")}><Text style={s.link}>Gérer</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.walletScroll}>
        {accounts.map(account => <View key={account.id} style={s.walletCard}>
          <View style={s.walletIcon}><Ionicons name={accountIcon(account.type)} size={19} color={palette.primary} /></View>
          <Text style={s.walletName} numberOfLines={1}>{account.name}</Text>
          <Text style={s.walletType}>{account.type === "mobile_money" ? "Mobile Money" : account.type === "bank" ? "Banque" : account.type === "savings" ? "Épargne" : account.type === "cash" ? "Espèces" : "Autre"}</Text>
          <Text style={s.walletBalance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{money(account.balanceMinor)}</Text>
        </View>)}
        <Pressable accessibilityRole="button" accessibilityLabel="Ajouter un portefeuille" onPress={() => router.push("/(tabs)/settings")} style={[s.walletCard, s.addWallet]}><View style={s.addWalletIcon}><Ionicons name="add" size={22} color={palette.primary} /></View><Text style={s.addWalletText}>Ajouter</Text></Pressable>
      </ScrollView>

      <View style={s.sectionHead}><Text style={s.sectionTitle}>Dépenses par catégorie</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/reports")}><Text style={s.link}>Analyse</Text></Pressable></View>
      <View style={s.panel}>
        {categories.length === 0
          ? <View style={s.empty}><Ionicons name="pie-chart-outline" size={26} color={palette.muted} /><Text style={s.emptyText}>Tes dépenses apparaîtront ici.</Text></View>
          : <View style={s.chart}>{categories.map(item => <View key={item.category} style={s.barCol}>
              <Text style={s.barValue} numberOfLines={1}>{hidden ? "•••" : compact(item.amountMinor, currency)}</Text>
              <View style={s.barArea}><LinearGradient colors={gradients.bar} style={[s.bar, { height: Math.max(10, (item.amountMinor / maxCategory) * 104) }]} /></View>
              <View style={s.barIcon}><Ionicons name={categoryIcons[item.category] ?? "pricetag-outline"} size={16} color={palette.primary} /></View>
              <Text style={s.barName} numberOfLines={1}>{item.category}</Text>
            </View>)}</View>}
      </View>

      <View style={s.sectionHead}><Text style={s.sectionTitle}>Dernières opérations</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/transactions")}><Text style={s.link}>Tout voir</Text></Pressable></View>
      <View style={s.panel}>
        {transactions.length === 0
          ? <View style={s.empty}><Ionicons name="receipt-outline" size={26} color={palette.muted} /><Text style={s.emptyText}>Aucune opération pour le moment.</Text></View>
          : transactions.map((t, index) => <View key={t.id} style={[s.transactionRow, index === transactions.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[s.transactionIcon, { backgroundColor: t.type === "income" ? palette.incomeSoft : t.type === "expense" ? palette.expenseSoft : palette.surfaceSoft }]}>
                <Ionicons name={t.type === "income" ? "arrow-down" : t.type === "expense" ? "arrow-up" : "swap-horizontal"} size={17} color={t.type === "income" ? palette.income : t.type === "expense" ? palette.expense : palette.primary} />
              </View>
              <View style={{ flex: 1 }}><Text style={s.transactionName} numberOfLines={1}>{t.category}</Text><Text style={s.transactionDate}>{displayDate(t.occurredAt)}</Text></View>
              <Text style={[s.transactionAmount, t.type === "income" && { color: palette.income }, t.type === "expense" && { color: palette.expense }]}>{hidden ? "••••" : (t.type === "expense" ? "−" : t.type === "income" ? "+" : "") + formatMoney(t.amountMinor, currency)}</Text>
            </View>)}
      </View>
    </View>
  </ScrollView>;
}

const makeStyles = (palette: Palette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  content: { paddingBottom: 36 },
  hero: { paddingHorizontal: 20, paddingBottom: 26, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  brandLine: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: { width: 32, height: 32, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  brand: { color: "#D6F2E2", fontSize: 13, fontWeight: "800", letterSpacing: 1.6 },
  headerActions: { flexDirection: "row", gap: 10 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: "#FF8A75", borderWidth: 1.5, borderColor: "#0A6B45" },
  greeting: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { color: "#C5E9D4", fontSize: 14, marginTop: 4, marginBottom: 18 },
  balanceCard: { backgroundColor: "rgba(255,255,255,0.11)", borderWidth: 1, borderColor: "rgba(255,255,255,0.20)", borderRadius: 24, padding: 18, overflow: "hidden", minHeight: 150 },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { color: "#C5E9D4", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  balanceAmountBox: { maxWidth: "66%", marginTop: 10 },
  balance: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", letterSpacing: -0.6, fontVariant: ["tabular-nums"] },
  trendLine: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12, maxWidth: "68%" },
  trendText: { color: "#E4F7EC", fontSize: 13, fontWeight: "600", flexShrink: 1 },
  compareText: { color: "#B7E3C9", fontSize: 12, marginTop: 6, maxWidth: "68%" },
  walletArt: { position: "absolute", right: 8, bottom: 6 },
  body: { paddingHorizontal: 20, paddingTop: 6 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 12 },
  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  period: { color: palette.muted, fontSize: 13, textTransform: "capitalize" },
  link: { color: palette.primary, fontSize: 14, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryCard: { flex: 1, backgroundColor: palette.surface, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: palette.border },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  summaryLabel: { color: palette.muted, fontSize: 13, fontWeight: "600" },
  summaryValue: { color: palette.ink, fontSize: 18, fontWeight: "800", marginTop: 12, fontVariant: ["tabular-nums"] },
  track: { height: 6, backgroundColor: palette.surfaceMuted, borderRadius: 4, overflow: "hidden", marginTop: 12 },
  fill: { height: 6, borderRadius: 4 },
  savingCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: palette.surface, borderRadius: 20, padding: 16, marginTop: 12, borderWidth: 1, borderColor: palette.border },
  savingCopy: { flex: 1, paddingRight: 10 },
  savingTitle: { color: palette.ink, fontSize: 15, fontWeight: "800" },
  savingSub: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  savingValue: { color: palette.primary, fontSize: 19, fontWeight: "800", marginTop: 10, fontVariant: ["tabular-nums"] },
  ringPercent: { color: palette.primary, fontSize: 19, fontWeight: "800" },
  ringLabel: { color: palette.muted, fontSize: 11, fontWeight: "600" },
  walletScroll: { gap: 10, paddingRight: 4 },
  walletCard: { width: 156, backgroundColor: palette.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: palette.border },
  walletIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  walletName: { color: palette.ink, fontSize: 14, fontWeight: "700" },
  walletType: { color: palette.muted, fontSize: 12, marginTop: 2 },
  walletBalance: { color: palette.ink, fontSize: 15, fontWeight: "800", marginTop: 10, fontVariant: ["tabular-nums"] },
  addWallet: { alignItems: "center", justifyContent: "center", borderStyle: "dashed", backgroundColor: palette.background },
  addWalletIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.primarySoft, alignItems: "center", justifyContent: "center" },
  addWalletText: { color: palette.primary, fontSize: 13, fontWeight: "700", marginTop: 8 },
  panel: { backgroundColor: palette.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: palette.border },
  empty: { alignItems: "center", paddingVertical: 18, gap: 8 },
  emptyText: { color: palette.muted, fontSize: 13 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  barCol: { flex: 1, alignItems: "center" },
  barValue: { color: palette.ink, fontSize: 11, fontWeight: "700", marginBottom: 6, fontVariant: ["tabular-nums"] },
  barArea: { height: 104, justifyContent: "flex-end" },
  bar: { width: 30, borderRadius: 10 },
  barIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: palette.primarySoft, alignItems: "center", justifyContent: "center", marginTop: 10 },
  barName: { color: palette.muted, fontSize: 11, fontWeight: "600", marginTop: 5, maxWidth: "100%" },
  transactionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.border },
  transactionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 12 },
  transactionName: { color: palette.ink, fontSize: 14, fontWeight: "700" },
  transactionDate: { color: palette.muted, fontSize: 12, marginTop: 2 },
  transactionAmount: { color: palette.ink, fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] }
});
