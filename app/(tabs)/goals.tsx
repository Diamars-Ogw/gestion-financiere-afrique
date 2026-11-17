import { useCallback, useState, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Alert } from "@/src/utils/alert";
import { Text, TextInput } from "@/src/components/AppText";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { amountToMinorUnits, contributeToGoal, createGoal, formatMoney, listAccounts, listGoals } from "@/src/database/finance";
import type { Account, SavingsGoal } from "@/src/types/finance";
import type { Palette } from "@/src/constants/theme";
import { useTheme } from "@/src/components/ThemeProvider";

export default function Goals() {
  const palette = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const db = useSQLiteContext();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currency, setCurrency] = useState("XOF");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [contribution, setContribution] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    let active = true;
    Promise.all([
      listGoals(db), listAccounts(db),
      db.getFirstAsync<{ currency: string }>("SELECT currency FROM profile WHERE id = 1")
    ]).then(([g, a, p]) => {
      if (!active) return;
      setGoals(g);
      setAccounts(a);
      setCurrency(p?.currency ?? "XOF");
      if (accountId === null && a.length) setAccountId(a[0].id);
      if (selectedGoal === null && g.length) setSelectedGoal(g[0].id);
    });
    return () => { active = false; };
  }, [db, accountId, selectedGoal]);
  useFocusEffect(refresh);

  async function addGoal() {
    const targetMinor = amountToMinorUnits(target, currency);
    if (!name.trim() || targetMinor === null) {
      Alert.alert("Informations incomplètes", "Indique un nom et un montant cible valide.");
      return;
    }
    setBusy(true);
    try {
      await createGoal(db, { name, targetMinor });
      setName("");
      setTarget("");
      refresh();
    } catch (error) {
      Alert.alert("Objectif non créé", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally { setBusy(false); }
  }

  async function addContribution() {
    const amountMinor = amountToMinorUnits(contribution, currency);
    if (selectedGoal === null || accountId === null || amountMinor === null) {
      Alert.alert("Versement impossible", "Sélectionne un objectif, un portefeuille et un montant valide.");
      return;
    }
    setBusy(true);
    try {
      await contributeToGoal(db, { goalId: selectedGoal, accountId, amountMinor });
      setContribution("");
      refresh();
      Alert.alert("Versement effectué", "Le montant a été déplacé vers le portefeuille Épargne. Il n'est pas compté comme une dépense.");
    } catch (error) {
      Alert.alert("Versement impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally { setBusy(false); }
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Objectifs d'épargne</Text>
      <Text style={s.subtitle}>Prépare un projet, une réserve d'urgence ou une dépense importante. Les versements déplacent réellement l'argent vers ton portefeuille Épargne.</Text>
      <View style={s.form}>
        <Text style={s.formTitle}>Créer un objectif</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Ex. Fonds d'urgence" style={s.input} />
        <TextInput value={target} onChangeText={setTarget} placeholder={"Montant cible en " + currency} keyboardType="decimal-pad" style={s.input} />
        <Pressable onPress={addGoal} disabled={busy} style={s.button}><Text style={s.buttonText}>{busy ? "En cours..." : "Créer l'objectif"}</Text></Pressable>
      </View>
      <Text style={s.sectionTitle}>Mes objectifs</Text>
      {goals.length === 0 ? <View style={s.empty}><Text style={s.emptyTitle}>Aucun objectif pour le moment</Text><Text style={s.emptyText}>Commence par définir une cible d'épargne concrète.</Text></View> : goals.map(goal => {
        const ratio = goal.currentMinor / goal.targetMinor;
        const percent = Math.round(ratio * 100);
        return (
          <Pressable key={goal.id} onPress={() => setSelectedGoal(goal.id)} style={[s.goalCard, selectedGoal === goal.id && s.goalSelected]}>
            <View style={s.goalHeader}><Text style={s.goalName}>{goal.name}</Text><Text style={s.percent}>{percent}%</Text></View>
            <View style={s.track}><View style={[s.fill, { width: (Math.min(percent, 100) + "%") as `${number}%` }]} /></View>
            <Text style={s.amount}>{formatMoney(goal.currentMinor, currency)} / {formatMoney(goal.targetMinor, currency)}</Text>
            {ratio >= 1 ? <Text style={s.complete}>Objectif atteint</Text> : <Text style={s.remaining}>Encore {formatMoney(goal.targetMinor - goal.currentMinor, currency)} à épargner</Text>}
          </Pressable>
        );
      })}
      {goals.length > 0 ? <View style={s.form}>
        <Text style={s.formTitle}>Faire un versement</Text>
        <Text style={s.label}>Objectif sélectionné</Text>
        <Text style={s.selectedName}>{goals.find(g => g.id === selectedGoal)?.name ?? "Sélectionne un objectif ci-dessus"}</Text>
        <Text style={s.label}>Depuis quel portefeuille ?</Text>
        <View style={s.chips}>{accounts.filter(a => a.type !== "savings").map(a => <Pressable key={a.id} onPress={() => setAccountId(a.id)} style={[s.chip, accountId === a.id && s.chipActive]}><Text style={[s.chipText, accountId === a.id && s.chipTextActive]}>{a.name}</Text></Pressable>)}</View>
        <TextInput value={contribution} onChangeText={setContribution} placeholder={"Montant en " + currency} keyboardType="decimal-pad" style={s.input} />
        <Pressable onPress={addContribution} disabled={busy} style={s.button}><Text style={s.buttonText}>{busy ? "En cours..." : "Verser sur cet objectif"}</Text></Pressable>
      </View> : null}
    </ScrollView>
  );
}

const makeStyles = (palette: Palette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, paddingTop: 18, paddingBottom: 40 },
  title: { color: palette.ink, fontSize: 29, fontWeight: "800" },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 19, marginTop: 8 },
  form: { backgroundColor: palette.surface, borderRadius: 22, padding: 15, marginTop: 18 },
  formTitle: { color: palette.ink, fontSize: 15, fontWeight: "800", marginBottom: 10 },
  input: { backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 13, color: palette.ink, marginTop: 9 },
  button: { backgroundColor: palette.navy, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 13 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "800", marginTop: 25, marginBottom: 12 },
  empty: { backgroundColor: palette.surface, borderRadius: 15, padding: 18 },
  emptyTitle: { color: palette.ink, fontSize: 15, fontWeight: "800" },
  emptyText: { color: palette.muted, fontSize: 13, lineHeight: 17, marginTop: 6 },
  goalCard: { backgroundColor: palette.surface, borderRadius: 15, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: palette.border },
  goalSelected: { borderColor: palette.primary },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalName: { color: palette.ink, fontWeight: "800", fontSize: 15 },
  percent: { color: palette.primary, fontWeight: "800", fontSize: 14 },
  track: { height: 8, borderRadius: 5, backgroundColor: palette.border, overflow: "hidden", marginTop: 12 },
  fill: { height: 8, borderRadius: 5, backgroundColor: palette.primary },
  amount: { color: palette.ink, fontSize: 13, fontWeight: "700", marginTop: 9 },
  remaining: { color: palette.muted, fontSize: 13, marginTop: 5 },
  complete: { color: palette.green, fontSize: 13, fontWeight: "800", marginTop: 5 },
  label: { color: palette.muted, fontSize: 13, fontWeight: "700", marginTop: 10 },
  selectedName: { color: palette.ink, fontSize: 15, fontWeight: "800", marginTop: 5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { padding: 9, borderRadius: 10, borderWidth: 1, borderColor: palette.border },
  chipActive: { backgroundColor: palette.primarySoft, borderColor: palette.primary },
  chipText: { color: palette.muted, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: palette.primary }
});
