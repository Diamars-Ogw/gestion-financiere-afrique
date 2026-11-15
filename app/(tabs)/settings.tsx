import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { amountToMinorUnits, createAccount, deleteEmptyAccount, getProfile, listAccounts, updateProfileSettings } from "@/src/database/finance";
import { COUNTRIES } from "@/src/constants/countries";
import type { Account, AccountType, IncomeProfile, UserProfile } from "@/src/types/finance";
import { palette } from "@/src/constants/theme";

const incomeOptions: { value: IncomeProfile; label: string }[] = [
  { value: "regular", label: "Revenus réguliers" },
  { value: "irregular", label: "Revenus variables" },
  { value: "multiple", label: "Plusieurs sources" },
  { value: "none", label: "Pas de revenu personnel" }
];
const accountOptions: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Espèces" },
  { value: "bank", label: "Banque" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "savings", label: "Épargne" },
  { value: "other", label: "Autre" }
];

export default function Settings() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("BJ");
  const [incomeProfile, setIncomeProfile] = useState<IncomeProfile>("regular");
  const [accountName, setAccountName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("mobile_money");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    let active = true;
    Promise.all([getProfile(db), listAccounts(db)]).then(([p, a]) => {
      if (!active) return;
      setProfile(p);
      setAccounts(a);
      if (p) {
        setName(p.displayName);
        setCountryCode(p.country);
        setIncomeProfile(p.incomeProfile);
      }
    });
    return () => { active = false; };
  }, [db]);
  useFocusEffect(refresh);

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) ?? COUNTRIES[0];

  async function saveSettings() {
    if (!selectedCountry) return;
    setSaving(true);
    try {
      await updateProfileSettings(db, { displayName: name, country: selectedCountry.code, currency: selectedCountry.currency, incomeProfile });
      refresh();
      Alert.alert("Profil mis à jour", "Tes préférences ont été enregistrées.");
    } catch (error) {
      Alert.alert("Modification refusée", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally { setSaving(false); }
  }

  async function addAccount() {
    if (!profile || !accountName.trim()) {
      Alert.alert("Nom manquant", "Donne un nom à ce portefeuille.");
      return;
    }
    try {
      const openingMinor = openingBalance.trim() ? amountToMinorUnits(openingBalance, profile.currency) : 0;
      if (openingMinor === null) throw new Error("Vérifie le solde initial.");
      await createAccount(db, { name: accountName, type: accountType, currency: profile.currency, openingBalanceMinor: openingMinor });
      setAccountName("");
      setOpeningBalance("");
      refresh();
    } catch (error) {
      Alert.alert("Création impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  }

  function removeAccount(account: Account) {
    Alert.alert("Supprimer ce portefeuille ?", account.name + " sera supprimé uniquement s'il est vide et sans historique.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        try { await deleteEmptyAccount(db, account.id); refresh(); }
        catch (error) { Alert.alert("Suppression impossible", error instanceof Error ? error.message : "Une erreur est survenue."); }
      }}
    ]);
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Text style={s.title}>Profil et portefeuilles</Text>
      <Text style={s.subtitle}>Adapte l'application à ton pays et organise tes différents moyens de conserver ton argent.</Text>
      <View style={s.panel}>
        <Text style={s.panelTitle}>Informations personnelles</Text>
        <Text style={s.label}>Nom affiché</Text>
        <TextInput placeholderTextColor={palette.placeholder} selectionColor={palette.primary} value={name} onChangeText={setName} placeholder="Ton prénom" style={s.input} />
        <Text style={s.label}>Pays et devise</Text>
        <View style={s.countryGrid}>
          {COUNTRIES.map(c => <Pressable key={c.code} onPress={() => setCountryCode(c.code)} style={[s.country, countryCode === c.code && s.selected]}><Text style={s.optionText}>{c.label}</Text><Text style={s.optionHint}>{c.currency}</Text></Pressable>)}
        </View>
        <View style={s.currencyBox}><Text style={s.currencyText}>{selectedCountry.currency} · {selectedCountry.currencyLabel}</Text></View>
        <Text style={s.label}>Profil de revenus</Text>
        {incomeOptions.map(item => <Pressable key={item.value} onPress={() => setIncomeProfile(item.value)} style={[s.option, incomeProfile === item.value && s.selected]}><Text style={s.optionText}>{item.label}</Text></Pressable>)}
        <Pressable onPress={saveSettings} disabled={saving} style={s.button}><Text style={s.buttonText}>{saving ? "Enregistrement..." : "Enregistrer le profil"}</Text></Pressable>
      </View>
      <View style={s.panel}>
        <Text style={s.panelTitle}>Mes portefeuilles</Text>
        <Text style={s.panelHint}>Espèces, banque, Mobile Money ou épargne. Chaque portefeuille garde son propre solde.</Text>
        {accounts.map(a => <View key={a.id} style={s.accountRow}><View style={{ flex: 1 }}><Text style={s.optionText}>{a.name}</Text><Text style={s.optionHint}>{accountOptions.find(x => x.value === a.type)?.label ?? a.type} · {a.currency}</Text></View><Pressable onPress={() => removeAccount(a)} style={s.delete}><Text style={s.deleteText}>Supprimer</Text></Pressable></View>)}
        <Text style={s.label}>Ajouter un portefeuille</Text>
        <TextInput placeholderTextColor={palette.placeholder} selectionColor={palette.primary} value={accountName} onChangeText={setAccountName} placeholder="Ex. MTN Mobile Money" style={s.input} />
        <Text style={s.label}>Solde actuel (facultatif, {profile?.currency})</Text>
        <TextInput placeholderTextColor={palette.placeholder} selectionColor={palette.primary} value={openingBalance} onChangeText={setOpeningBalance} placeholder="0" keyboardType="decimal-pad" style={s.input} />
        <View style={s.countryGrid}>{accountOptions.map(item => <Pressable key={item.value} onPress={() => setAccountType(item.value)} style={[s.country, accountType === item.value && s.selected]}><Text style={s.optionText}>{item.label}</Text></Pressable>)}</View>
        <Pressable onPress={addAccount} style={s.button}><Text style={s.buttonText}>Ajouter le portefeuille</Text></Pressable>
      </View>
      <View style={s.panel}>
        <View style={s.appearanceRow}><View style={s.appearanceIcon}><Ionicons name="sunny" size={20} color={palette.primary}/></View><View style={{flex:1}}><Text style={s.panelTitle}>Apparence</Text><Text style={s.panelHint}>Mode clair stable</Text></View></View>
        <Text style={s.body}>Le mode clair est fixé pour garantir un contraste lisible sur tous les téléphones. Le mode sombre ne sera réactivé qu'après une vérification complète de chaque écran.</Text>
      </View>
      <View style={s.panel}>
        <Text style={s.panelTitle}>Confidentialité et fonctionnement</Text>
        <Text style={s.body}>Les opérations sont stockées dans une base SQLite sur cet appareil. Aucun compte en ligne ni serveur financier n'est requis pour les fonctions quotidiennes.</Text>
        <Text style={s.body}>Si tu changes de pays et de devise après avoir commencé à enregistrer des opérations, l'application bloque le changement pour éviter de mélanger des soldes exprimés dans des monnaies différentes.</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, paddingTop: 28, paddingBottom: 40 },
  title: { color: palette.ink, fontSize: 28, fontWeight: "800" },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 19, marginTop: 8 },
  panel: { backgroundColor: palette.surface, borderRadius: 22, padding: 15, marginTop: 17 },
  panelTitle: { color: palette.ink, fontSize: 15, fontWeight: "800" },
  panelHint: { color: palette.muted, fontSize: 13, lineHeight: 16, marginTop: 6 },
  label: { color: palette.ink, fontSize: 13, fontWeight: "800", marginTop: 15, marginBottom: 8 },
  input: { backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 12, color: palette.ink, fontSize: 14 },
  countryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  country: { width: "48%", borderWidth: 1, borderColor: palette.border, borderRadius: 10, padding: 10, backgroundColor: palette.background },
  selected: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  option: { borderWidth: 1, borderColor: palette.border, borderRadius: 10, padding: 11, marginBottom: 6, backgroundColor: palette.background },
  optionText: { color: palette.ink, fontSize: 13, fontWeight: "700" },
  optionHint: { color: palette.muted, fontSize: 13, marginTop: 4 },
  currencyBox: { backgroundColor: palette.primarySoft, borderRadius: 10, padding: 11, marginTop: 10 },
  currencyText: { color: palette.primary, fontSize: 13, fontWeight: "800" },
  button: { backgroundColor: palette.navy, borderRadius: 14, padding: 14, alignItems: "center", marginTop: 14 },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  accountRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: palette.border, paddingVertical: 11 },
  delete: { paddingVertical: 7, paddingHorizontal: 9, borderRadius: 8, backgroundColor: palette.background },
  deleteText: { color: palette.red, fontSize: 13, fontWeight: "800" },
  appearanceRow:{flexDirection:"row",alignItems:"center",gap:12},appearanceIcon:{width:42,height:42,borderRadius:14,backgroundColor:palette.primarySoft,alignItems:"center",justifyContent:"center"},
  body: { color: palette.muted, fontSize: 13, lineHeight: 18, marginTop: 8 }
});
