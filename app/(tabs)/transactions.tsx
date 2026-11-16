import { useCallback, useEffect, useState, useMemo } from "react";
import { Alert, LayoutAnimation, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/src/components/AppText";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import { amountToMinorUnits, createTransaction, formatMoney, listAccounts, listRecentTransactions, transferBetweenAccounts } from "@/src/database/finance";
import type { Account, Transaction, TransactionType } from "@/src/types/finance";
import type { Palette } from "@/src/constants/theme";
import { useTheme } from "@/src/components/ThemeProvider";

type EntryMode = "income" | "expense" | "transfer";
const categories = {
  income: ["Salaire", "Commerce", "Freelance", "Aide familiale", "Prime", "Autre revenu"],
  expense: ["Alimentation", "Logement", "Transport", "Santé", "Éducation", "Factures", "Communication", "Famille", "Loisirs", "Autre dépense"]
};

function groupAmountInput(value: string) {
  const normalized = value.replace(/[^0-9,.\s]/g, "").replace(/\s/g, "");
  const separatorIndex = normalized.search(/[,.]/);
  const whole = separatorIndex < 0 ? normalized : normalized.slice(0, separatorIndex);
  const fraction = separatorIndex < 0 ? "" : normalized.slice(separatorIndex + 1).replace(/[,.]/g, "");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return separatorIndex < 0 ? grouped : grouped + normalized[separatorIndex] + fraction;
}

function displayDate(value: string) {
  const date = new Date(value.slice(0, 10) + "T12:00:00");
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(date);
}

export default function Transactions() {
  const palette = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ type?: string }>();
  const [mode, setMode] = useState<EntryMode>(params.type === "income" ? "income" : "expense");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState("XOF");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories.expense[0]);
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.type === "income" || params.type === "expense") {
      setMode(params.type);
      setCategory(categories[params.type][0]);
    }
  }, [params.type]);

  const refresh = useCallback(() => {
    let active = true;
    Promise.all([
      listAccounts(db),
      listRecentTransactions(db, 30),
      db.getFirstAsync<{ currency: string }>("SELECT currency FROM profile WHERE id = 1")
    ]).then(([a, h, p]) => {
      if (!active) return;
      setAccounts(a);
      setHistory(h);
      setCurrency(p?.currency ?? "XOF");
      if (accountId === null && a.length) setAccountId(a[0].id);
      if (toAccountId === null && a.length > 1) setToAccountId(a[1].id);
    });
    return () => { active = false; };
  }, [db, accountId, toAccountId]);

  useFocusEffect(refresh);

  function changeMode(next: EntryMode) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(next);
    if (next !== "transfer") setCategory(categories[next][0]);
  }

  async function saveOperation(amountMinor: number) {
    if (accountId === null) return;
    setSaving(true);
    try {
      if (mode === "transfer") {
        if (toAccountId === null) throw new Error("Ajoute un deuxième portefeuille pour effectuer un transfert.");
        await transferBetweenAccounts(db, { fromAccountId: accountId, toAccountId, amountMinor, note });
      } else {
        await createTransaction(db, { accountId, type: mode, amountMinor, category, note });
      }
      setAmount("");
      setNote("");
      refresh();
      Alert.alert("Opération enregistrée", mode === "transfer" ? "Le transfert a été enregistré. Il ne compte ni comme revenu ni comme dépense." : "Le solde du portefeuille a été mis à jour.");
    } catch (error) {
      Alert.alert("Enregistrement impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  function submit() {
    const amountMinor = amountToMinorUnits(amount, selectedCurrency);
    if (amountMinor === null) {
      Alert.alert("Montant incorrect", "Saisis un montant supérieur à zéro.");
      return;
    }
    if (accountId === null) {
      Alert.alert("Portefeuille manquant", "Crée ou sélectionne un portefeuille.");
      return;
    }
    const selectedAccount = accounts.find(a => a.id === accountId);
    if (mode === "expense" && selectedAccount && selectedAccount.balanceMinor < amountMinor) {
      Alert.alert(
        "Solde suivi insuffisant",
        "Cette dépense dépasse le solde actuellement enregistré dans ce portefeuille. Tu peux quand même l'ajouter : le solde passera en négatif. Vérifie simplement que tu n'as pas oublié un revenu ou un solde de départ.",
        [{ text: "Corriger", style: "cancel" }, { text: "Enregistrer quand même", onPress: () => void saveOperation(amountMinor) }]
      );
      return;
    }
    void saveOperation(amountMinor);
  }

  const selectedCurrency = accounts.find(a => a.id === accountId)?.currency ?? currency;
  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Opérations</Text>
      <Text style={s.subtitle}>Chaque mouvement est enregistré sur ton téléphone et met à jour le portefeuille choisi.</Text>
      <View style={s.modeRow}>
        {(["income", "expense", "transfer"] as EntryMode[]).map(item => (
          <Pressable key={item} onPress={() => changeMode(item)} style={[s.modeButton, mode === item && s.modeActive]}>
            <Text style={[s.modeText, mode === item && s.modeTextActive]}>{item === "income" ? "Revenu" : item === "expense" ? "Dépense" : "Transfert"}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.form}>
        <Text style={s.label}>Montant ({selectedCurrency})</Text>
        <TextInput value={amount} onChangeText={value => setAmount(groupAmountInput(value))} placeholder="0" keyboardType="decimal-pad" style={s.amountInput} />
        <Text style={s.label}>{mode === "transfer" ? "Depuis le portefeuille" : "Portefeuille"}</Text>
        <View style={s.chips}>
          {accounts.map(a => <Pressable key={a.id} onPress={() => setAccountId(a.id)} style={[s.chip, accountId === a.id && s.chipActive]}><Text style={[s.chipText, accountId === a.id && s.chipTextActive]}>{a.name}</Text></Pressable>)}
        </View>
        {mode === "transfer" ? <>
          <Text style={s.label}>Vers le portefeuille</Text>
          <View style={s.chips}>
            {accounts.filter(a => a.id !== accountId).map(a => <Pressable key={a.id} onPress={() => setToAccountId(a.id)} style={[s.chip, toAccountId === a.id && s.chipActive]}><Text style={[s.chipText, toAccountId === a.id && s.chipTextActive]}>{a.name}</Text></Pressable>)}
          </View>
          <Text style={s.helper}>Un transfert déplace ton argent entre deux portefeuilles sans modifier tes revenus ni tes dépenses.</Text>
        </> : <>
          <Text style={s.label}>Catégorie</Text>
          <View style={s.categoryGrid}>
            {categories[mode].map(item => <Pressable key={item} onPress={() => setCategory(item)} style={[s.category, category === item && s.categoryActive]}><Text style={[s.categoryText, category === item && s.categoryTextActive]}>{item}</Text></Pressable>)}
          </View>
        </>}
        <Text style={s.label}>Note (facultatif)</Text>
        <TextInput value={note} onChangeText={setNote} placeholder="Précision sur cette opération" style={s.noteInput} />
        <Pressable disabled={saving} onPress={submit} style={[s.submit, saving && { opacity: 0.6 }]}>
          <Text style={s.submitText}>{saving ? "Enregistrement..." : "Enregistrer l'opération"}</Text>
        </Pressable>
      </View>
      <Text style={s.sectionTitle}>Historique récent</Text>
      {history.length === 0 ? <View style={s.empty}><Text style={s.emptyTitle}>Aucune opération enregistrée</Text><Text style={s.helper}>Tes revenus et dépenses apparaîtront ici.</Text></View> : history.map(item => (
        <View key={item.id} style={s.historyRow}>
          <View style={s.historyIcon}><Ionicons name={item.type === "income" ? "arrow-down" : item.type === "expense" ? "arrow-up" : "swap-horizontal"} size={17} color={item.type === "income" ? palette.green : item.type === "expense" ? palette.red : palette.primary} /></View>
          <View style={{ flex: 1 }}><Text style={s.historyTitle}>{item.category}</Text><Text style={s.historyDate}>{displayDate(item.occurredAt)}{item.note ? " · " + item.note : ""}</Text></View>
          <Text style={[s.historyAmount, item.type === "income" && { color: palette.green }, item.type === "expense" && { color: palette.red }]}>{item.type === "expense" ? "−" : item.type === "income" ? "+" : ""}{formatMoney(item.amountMinor, currency)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (palette: Palette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, paddingTop: 18, paddingBottom: 40 },
  title: { fontSize: 29, fontWeight: "800", color: palette.ink },
  subtitle: { color: palette.muted, marginTop: 8, lineHeight: 21, fontSize: 14 },
  modeRow: { flexDirection: "row", backgroundColor: palette.surface, padding: 5, borderRadius: 14, marginTop: 20 },
  modeButton: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 10 },
  modeActive: { backgroundColor: palette.navy },
  modeText: { color: palette.muted, fontWeight: "700", fontSize: 13 },
  modeTextActive: { color: "#FFFFFF" },
  form: { backgroundColor: palette.surface, borderRadius: 22, padding: 16, marginTop: 14 },
  label: { color: palette.ink, fontSize: 14, fontWeight: "800", marginTop: 14, marginBottom: 8 },
  amountInput: { color: palette.ink, fontSize: 28, fontWeight: "800", borderBottomWidth: 1, borderBottomColor: palette.border, paddingVertical: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border },
  chipActive: { backgroundColor: palette.primarySoft, borderColor: palette.primary },
  chipText: { color: palette.muted, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: palette.primary },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: { padding: 10, borderRadius: 10, backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border },
  categoryActive: { backgroundColor: palette.primarySoft, borderColor: palette.primary },
  categoryText: { color: palette.muted, fontSize: 13, fontWeight: "600" },
  categoryTextActive: { color: palette.primary },
  noteInput: { backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 12, color: palette.ink, fontSize: 14 },
  helper: { color: palette.muted, fontSize: 13, lineHeight: 16, marginTop: 8 },
  submit: { backgroundColor: palette.navy, borderRadius: 12, padding: 15, alignItems: "center", marginTop: 20 },
  submitText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "800", marginTop: 25, marginBottom: 12 },
  empty: { backgroundColor: palette.surface, padding: 18, borderRadius: 14 },
  emptyTitle: { color: palette.ink, fontWeight: "800", fontSize: 14 },
  historyRow: { flexDirection: "row", alignItems: "center", backgroundColor: palette.surface, borderRadius: 13, padding: 12, marginBottom: 8 },
  historyIcon: { width: 34, height: 34, borderRadius: 14, backgroundColor: palette.primarySoft, alignItems: "center", justifyContent: "center", marginRight: 10 },
  historyTitle: { color: palette.ink, fontWeight: "800", fontSize: 13 },
  historyDate: { color: palette.muted, fontSize: 13, marginTop: 4 },
  historyAmount: { color: palette.ink, fontWeight: "700", fontSize: 14 }
});
