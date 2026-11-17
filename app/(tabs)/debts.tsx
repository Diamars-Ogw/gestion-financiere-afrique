import { useCallback, useState, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Alert } from "@/src/utils/alert";
import { Text, TextInput } from "@/src/components/AppText";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { amountToMinorUnits, createDebt, formatMoney, listAccounts, listDebts, recordDebtPayment } from "@/src/database/finance";
import type { Account, Debt, DebtDirection } from "@/src/types/finance";
import type { Palette } from "@/src/constants/theme";
import { useTheme } from "@/src/components/ThemeProvider";

export default function Debts() {
  const palette = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const db = useSQLiteContext();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currency, setCurrency] = useState("XOF");
  const [label, setLabel] = useState("");
  const [person, setPerson] = useState("");
  const [direction, setDirection] = useState<DebtDirection>("i_owe");
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState("");
  const [selectedDebt, setSelectedDebt] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    let active = true;
    Promise.all([listDebts(db), listAccounts(db), db.getFirstAsync<{ currency: string }>("SELECT currency FROM profile WHERE id = 1")]).then(([d,a,p]) => {
      if (!active) return;
      setDebts(d); setAccounts(a); setCurrency(p?.currency ?? "XOF");
      if (accountId === null && a.length) setAccountId(a[0].id);
      if (selectedDebt === null && d.length) setSelectedDebt(d[0].id);
    });
    return () => { active = false; };
  }, [db, accountId, selectedDebt]);
  useFocusEffect(refresh);

  async function addDebt() {
    const amountMinor = amountToMinorUnits(amount, currency);
    if (!label.trim() || amountMinor === null) {
      Alert.alert("Informations incomplètes", "Indique un intitulé et un montant valide.");
      return;
    }
    setBusy(true);
    try {
      await createDebt(db, { label, person, direction, amountMinor });
      setLabel(""); setPerson(""); setAmount("");
      refresh();
    } catch (error) {
      Alert.alert("Dette non enregistrée", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally { setBusy(false); }
  }

  async function payDebt() {
    const amountMinor = amountToMinorUnits(payment, currency);
    if (selectedDebt === null || accountId === null || amountMinor === null) {
      Alert.alert("Paiement impossible", "Sélectionne une dette, un portefeuille et un montant valide.");
      return;
    }
    setBusy(true);
    try {
      await recordDebtPayment(db, { debtId: selectedDebt, accountId, amountMinor });
      setPayment("");
      refresh();
      Alert.alert("Paiement enregistré", "Le solde du portefeuille et le montant restant de la dette ont été mis à jour.");
    } catch (error) {
      Alert.alert("Paiement impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally { setBusy(false); }
  }

  const selected = debts.find(d => d.id === selectedDebt);
  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Dettes et créances</Text>
      <Text style={s.subtitle}>Suis ce que tu dois rembourser et ce que d'autres personnes doivent te rendre. Chaque règlement met à jour le portefeuille et le solde restant.</Text>
      <View style={s.form}>
        <Text style={s.formTitle}>Ajouter une dette ou une créance</Text>
        <View style={s.modeRow}>
          <Pressable onPress={() => setDirection("i_owe")} style={[s.mode, direction === "i_owe" && s.modeActive]}><Text style={[s.modeText, direction === "i_owe" && s.modeTextActive]}>Je dois</Text></Pressable>
          <Pressable onPress={() => setDirection("owed_to_me")} style={[s.mode, direction === "owed_to_me" && s.modeActive]}><Text style={[s.modeText, direction === "owed_to_me" && s.modeTextActive]}>On me doit</Text></Pressable>
        </View>
        <TextInput value={label} onChangeText={setLabel} placeholder="Intitulé (ex. Prêt familial)" style={s.input} />
        <TextInput value={person} onChangeText={setPerson} placeholder="Personne concernée (facultatif)" style={s.input} />
        <TextInput value={amount} onChangeText={setAmount} placeholder={"Montant en " + currency} keyboardType="decimal-pad" style={s.input} />
        <Pressable onPress={addDebt} disabled={busy} style={s.button}><Text style={s.buttonText}>{busy ? "En cours..." : "Enregistrer"}</Text></Pressable>
      </View>
      <Text style={s.sectionTitle}>Suivi des dettes</Text>
      {debts.length === 0 ? <View style={s.empty}><Text style={s.emptyTitle}>Aucune dette enregistrée</Text><Text style={s.emptyText}>Tes remboursements et créances apparaîtront ici.</Text></View> : debts.map(d => (
        <Pressable key={d.id} onPress={() => setSelectedDebt(d.id)} style={[s.debtCard, selectedDebt === d.id && s.selected]}>
          <View style={s.debtHeader}><Text style={s.debtName}>{d.label}</Text><Text style={[s.tag, d.direction === "i_owe" ? { color: palette.red } : { color: palette.green }]}>{d.direction === "i_owe" ? "À rembourser" : "À recevoir"}</Text></View>
          {d.person ? <Text style={s.person}>{d.person}</Text> : null}
          <Text style={s.remaining}>{formatMoney(d.remainingMinor, currency)} restant(s)</Text>
          <Text style={s.total}>Montant initial : {formatMoney(d.totalMinor, currency)}</Text>
          {d.remainingMinor === 0 ? <Text style={s.paid}>Soldé</Text> : null}
        </Pressable>
      ))}
      {selected && selected.remainingMinor > 0 ? <View style={s.form}>
        <Text style={s.formTitle}>Enregistrer un règlement</Text>
        <Text style={s.selectedName}>{selected.label} · reste {formatMoney(selected.remainingMinor, currency)}</Text>
        <Text style={s.label}>Portefeuille utilisé ou crédité</Text>
        <View style={s.chips}>{accounts.map(a => <Pressable key={a.id} onPress={() => setAccountId(a.id)} style={[s.chip, accountId === a.id && s.chipActive]}><Text style={[s.chipText, accountId === a.id && s.chipTextActive]}>{a.name}</Text></Pressable>)}</View>
        <TextInput value={payment} onChangeText={setPayment} placeholder={"Montant en " + currency} keyboardType="decimal-pad" style={s.input} />
        <Pressable onPress={payDebt} disabled={busy} style={s.button}><Text style={s.buttonText}>{busy ? "En cours..." : "Enregistrer le règlement"}</Text></Pressable>
      </View> : null}
    </ScrollView>
  );
}
const makeStyles = (palette: Palette) => StyleSheet.create({
  page:{flex:1,backgroundColor:palette.background},content:{padding:20,paddingTop: 18,paddingBottom:40},
  title:{color:palette.ink,fontSize: 29,fontWeight:"800"},subtitle:{color:palette.muted,fontSize: 14,lineHeight:19,marginTop:8},
  form:{backgroundColor:palette.surface,borderRadius:22,padding:15,marginTop:18},formTitle:{color:palette.ink,fontSize: 15,fontWeight:"800",marginBottom:10},
  modeRow:{flexDirection:"row",backgroundColor:palette.background,borderRadius:14,padding:4,marginTop:8},mode:{flex:1,padding:10,alignItems:"center",borderRadius:8},modeActive:{backgroundColor:palette.navy},modeText:{color:palette.muted,fontSize: 13,fontWeight:"700"},modeTextActive:{color:"#FFFFFF"},
  input:{backgroundColor:palette.background,borderWidth:1,borderColor:palette.border,borderRadius:14,padding:12,color:palette.ink,fontSize: 14,marginTop:9},
  button:{backgroundColor:palette.navy,borderRadius:14,padding:14,alignItems:"center",marginTop:13},buttonText:{color:"#FFFFFF",fontSize: 13,fontWeight:"800"},
  sectionTitle:{color:palette.ink,fontSize: 17,fontWeight:"800",marginTop:25,marginBottom:12},empty:{backgroundColor:palette.surface,borderRadius:15,padding:18},emptyTitle:{color:palette.ink,fontSize: 15,fontWeight:"800"},emptyText:{color:palette.muted,fontSize: 13,lineHeight:17,marginTop:6},
  debtCard:{backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,borderRadius:14,padding:14,marginBottom:9},selected:{borderColor:palette.primary},debtHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},debtName:{color:palette.ink,fontSize: 14,fontWeight:"800",flex:1},tag:{fontSize: 13,fontWeight:"800"},person:{color:palette.muted,fontSize: 13,marginTop:5},remaining:{color:palette.ink,fontSize: 16,fontWeight:"800",marginTop:8},total:{color:palette.muted,fontSize: 13,marginTop:4},paid:{color:palette.green,fontSize: 13,fontWeight:"800",marginTop:5},
  selectedName:{color:palette.ink,fontSize: 14,fontWeight:"800",marginTop:5},label:{color:palette.muted,fontSize: 13,fontWeight:"700",marginTop:12},chips:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:8},chip:{padding:9,borderRadius:9,borderWidth:1,borderColor:palette.border},chipActive:{backgroundColor:palette.primarySoft,borderColor:palette.primary},chipText:{color:palette.muted,fontSize: 13,fontWeight:"700"},chipTextActive:{color:palette.primary}
});
