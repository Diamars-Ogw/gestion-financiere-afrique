import { useCallback, useState, useMemo } from "react";
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Alert } from "@/src/utils/alert";
import { Text, TextInput } from "@/src/components/AppText";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { formatMoney, amountToMinorUnits, listBudgets, saveBudget } from "@/src/database/finance";
import type { Budget } from "@/src/types/finance";
import type { Palette } from "@/src/constants/theme";
import { useTheme } from "@/src/components/ThemeProvider";

const categories = ["Alimentation", "Logement", "Transport", "Santé", "Éducation", "Factures", "Communication", "Famille", "Loisirs", "Autre dépense"];

function currentMonth() {
  const now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
}

export default function Budgets() {
  const palette = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const db = useSQLiteContext();
  const month = currentMonth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [currency, setCurrency] = useState("XOF");
  const [category, setCategory] = useState(categories[0]);
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    let active = true;
    Promise.all([
      listBudgets(db, month),
      db.getFirstAsync<{ currency: string }>("SELECT currency FROM profile WHERE id = 1")
    ]).then(([items, profile]) => {
      if (active) {
        setBudgets(items);
        setCurrency(profile?.currency ?? "XOF");
      }
    });
    return () => { active = false; };
  }, [db, month]);

  useFocusEffect(refresh);

  async function submit() {
    const limitMinor = amountToMinorUnits(limit, currency);
    if (limitMinor === null) {
      Alert.alert("Montant incorrect", "Saisis un plafond supérieur à zéro.");
      return;
    }
    setSaving(true);
    try {
      await saveBudget(db, { category, limitMinor, month });
      setLimit("");
      refresh();
    } catch (error) {
      Alert.alert("Budget non enregistré", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  const totalLimit = budgets.reduce((sum, item) => sum + item.limitMinor, 0);
  const totalSpent = budgets.reduce((sum, item) => sum + item.spentMinor, 0);
  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Budgets</Text>
      <Text style={s.subtitle}>Définis des plafonds mensuels réalistes. Seules les dépenses enregistrées dans une catégorie sont prises en compte.</Text>
      <View style={s.summary}>
        <Text style={s.summaryLabel}>Dépenses suivies ce mois</Text>
        <Text style={s.summaryValue}>{formatMoney(totalSpent, currency)}</Text>
        <Text style={s.summaryHint}>sur {formatMoney(totalLimit, currency)} de budgets définis</Text>
      </View>
      <View style={s.form}>
        <Text style={s.formTitle}>Créer ou modifier un budget</Text>
        <Text style={s.label}>Catégorie</Text>
        <View style={s.categories}>
          {categories.map(item => <Pressable key={item} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCategory(item); }} style={[s.category, category === item && s.categoryActive]}><Text style={[s.categoryText, category === item && s.categoryTextActive]}>{item}</Text></Pressable>)}
        </View>
        <Text style={s.label}>Plafond mensuel ({currency})</Text>
        <TextInput value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder="Ex. 50000" style={s.input} />
        <Pressable onPress={submit} disabled={saving} style={[s.button, saving && { opacity: 0.6 }]}><Text style={s.buttonText}>{saving ? "Enregistrement..." : "Enregistrer le budget"}</Text></Pressable>
      </View>
      <Text style={s.sectionTitle}>Vos budgets · {month}</Text>
      {budgets.length === 0 ? <View style={s.empty}><Text style={s.emptyTitle}>Aucun budget défini</Text><Text style={s.emptyText}>Commence par fixer un plafond pour une dépense importante comme l'alimentation ou le transport.</Text></View> : budgets.map(item => {
        const ratio = item.limitMinor > 0 ? item.spentMinor / item.limitMinor : 0;
        const percentage = Math.round(ratio * 100);
        return (
          <View key={item.id} style={s.budgetCard}>
            <View style={s.budgetHeader}><Text style={s.budgetName}>{item.category}</Text><Text style={[s.percentage, ratio > 1 && { color: palette.red }]}>{percentage}%</Text></View>
            <View style={s.track}><View style={[s.fill, { width: (Math.min(percentage, 100) + "%") as `${number}%` }, ratio > 1 && { backgroundColor: palette.red }]} /></View>
            <View style={s.budgetFooter}><Text style={s.spent}>{formatMoney(item.spentMinor, currency)} dépensés</Text><Text style={s.limitText}>sur {formatMoney(item.limitMinor, currency)}</Text></View>
            {ratio > 1 ? <Text style={s.warning}>Plafond dépassé de {formatMoney(item.spentMinor - item.limitMinor, currency)}.</Text> : <Text style={s.remaining}>Reste {formatMoney(item.limitMinor - item.spentMinor, currency)}.</Text>}
          </View>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (palette: Palette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, paddingTop: 18, paddingBottom: 40 },
  title: { color: palette.ink, fontSize: 29, fontWeight: "800" },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 19, marginTop: 8 },
  summary: { backgroundColor: palette.navy, borderRadius: 22, padding: 18, marginTop: 20 },
  summaryLabel: { color: palette.surfaceMuted, fontSize: 13 },
  summaryValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginTop: 8 },
  summaryHint: { color: palette.surfaceMuted, fontSize: 13, marginTop: 5 },
  form: { backgroundColor: palette.surface, borderRadius: 22, padding: 15, marginTop: 16 },
  formTitle: { color: palette.ink, fontSize: 15, fontWeight: "800" },
  label: { color: palette.ink, fontSize: 13, fontWeight: "800", marginTop: 15, marginBottom: 8 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  category: { padding: 9, borderRadius: 9, backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border },
  categoryActive: { backgroundColor: palette.primarySoft, borderColor: palette.primary },
  categoryText: { color: palette.muted, fontSize: 13, fontWeight: "700" },
  categoryTextActive: { color: palette.primary },
  input: { backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 13, color: palette.ink },
  button: { backgroundColor: palette.navy, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 15 },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "800", marginTop: 25, marginBottom: 12 },
  empty: { backgroundColor: palette.surface, borderRadius: 15, padding: 18 },
  emptyTitle: { color: palette.ink, fontSize: 15, fontWeight: "800" },
  emptyText: { color: palette.muted, fontSize: 13, lineHeight: 17, marginTop: 6 },
  budgetCard: { backgroundColor: palette.surface, borderRadius: 15, padding: 15, marginBottom: 10 },
  budgetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  budgetName: { color: palette.ink, fontWeight: "800", fontSize: 14 },
  percentage: { color: palette.primary, fontSize: 14, fontWeight: "800" },
  track: { height: 8, borderRadius: 5, backgroundColor: palette.border, overflow: "hidden", marginTop: 12 },
  fill: { height: 8, borderRadius: 5, backgroundColor: palette.primary },
  budgetFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  spent: { color: palette.ink, fontSize: 13, fontWeight: "700" },
  limitText: { color: palette.muted, fontSize: 12 },
  remaining: { color: palette.green, fontSize: 13, marginTop: 8, fontWeight: "700" },
  warning: { color: palette.red, fontSize: 13, marginTop: 8, fontWeight: "800" }
});
