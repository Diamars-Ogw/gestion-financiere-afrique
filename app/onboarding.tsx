import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { amountToMinorUnits, ensureDefaultAccount, saveProfile } from "@/src/database/finance";
import { COUNTRIES } from "@/src/constants/countries";
import type { IncomeProfile } from "@/src/types/finance";
import { palette } from "@/src/constants/theme";

const profiles: { value: IncomeProfile; title: string; description: string }[] = [
  { value: "regular", title: "Revenus réguliers", description: "Salaire, pension ou revenu stable" },
  { value: "irregular", title: "Revenus variables", description: "Commerce, missions, freelance, commissions" },
  { value: "multiple", title: "Plusieurs sources", description: "Plusieurs activités ou revenus" },
  { value: "none", title: "Pas de revenu personnel", description: "Études, recherche d'emploi ou soutien familial" }
];

export default function Onboarding() {
  const db = useSQLiteContext();
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("BJ");
  const [incomeProfile, setIncomeProfile] = useState<IncomeProfile>("regular");
  const [openingBalance, setOpeningBalance] = useState("");
  const country = COUNTRIES.find(c => c.code === countryCode) ?? COUNTRIES[0];

  async function finish() {
    try {
      await saveProfile(db, {
        displayName: name,
        country: country.code,
        currency: country.currency,
        incomeProfile
      });
      const openingMinor = openingBalance.trim() ? amountToMinorUnits(openingBalance, country.currency) : 0;
      if (openingMinor === null) throw new Error("Solde initial invalide.");
      await ensureDefaultAccount(db, country.currency, openingMinor);
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Enregistrement impossible", "Réessaie dans quelques instants.");
    }
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.eyebrow}>MON ÉQUILIBRE · BIENVENUE</Text>
      <Text style={s.title}>Votre argent mérite un plan.</Text>
      <Text style={s.subtitle}>Quelques informations pour adapter votre espace financier à votre réalité.</Text>
      <Text style={s.label}>Comment souhaitez-vous être appelé ?</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Votre prénom (facultatif)" style={s.input} />
      <Text style={s.label}>Votre pays</Text>
      <View style={s.countries}>
        {COUNTRIES.map(c => (
          <Pressable key={c.code} onPress={() => setCountryCode(c.code)} style={[s.country, countryCode === c.code && s.selected]}>
            <Text style={s.optionTitle}>{c.label}</Text>
            <Text style={s.hint}>{c.currency}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.currencyInfo}>
        <Text style={s.currencyLabel}>Devise utilisée</Text>
        <Text style={s.currencyValue}>{country.currency} · {country.currencyLabel}</Text>
        <Text style={s.currencyNote}>Elle sera utilisée pour vos montants et vos budgets. Vous pourrez modifier votre pays dans les paramètres.</Text>
      </View>
      <Text style={s.label}>Solde actuel de ton portefeuille espèces (facultatif)</Text>
      <TextInput value={openingBalance} onChangeText={setOpeningBalance} placeholder={"Montant en " + country.currency} keyboardType="decimal-pad" style={s.input} />
      <Text style={s.hint}>Ce montant est un solde de départ, pas un revenu du mois.</Text>
      <Text style={s.label}>Comment sont vos revenus ?</Text>
      {profiles.map(p => (
        <Pressable key={p.value} onPress={() => setIncomeProfile(p.value)} style={[s.profile, incomeProfile === p.value && s.selected]}>
          <View style={{ flex: 1 }}>
            <Text style={s.optionTitle}>{p.title}</Text>
            <Text style={s.hint}>{p.description}</Text>
          </View>
          <View style={[s.radio, incomeProfile === p.value && s.radioOn]} />
        </Pressable>
      ))}
      <Pressable onPress={finish} style={s.button}>
        <Text style={s.buttonText}>Créer mon espace financier</Text>
      </Pressable>
      <Text style={s.privacy}>Vos données financières restent stockées sur cet appareil.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, paddingTop: 62, paddingBottom: 48 },
  eyebrow: { color: palette.primary, fontWeight: "800", letterSpacing: 1.4, fontSize: 11 },
  title: { color: palette.ink, fontSize: 32, lineHeight: 38, fontWeight: "800", marginTop: 16 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 23, marginTop: 10, marginBottom: 20 },
  label: { color: palette.ink, fontSize: 14, fontWeight: "700", marginBottom: 10, marginTop: 18 },
  input: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 15, fontSize: 15 },
  countries: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  country: { width: "48%", backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 12, padding: 11 },
  selected: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  optionTitle: { color: palette.ink, fontWeight: "700", fontSize: 12 },
  hint: { color: palette.muted, fontSize: 10, marginTop: 4 },
  currencyInfo: { backgroundColor: palette.primarySoft, borderRadius: 14, padding: 14, marginTop: 14 },
  currencyLabel: { color: palette.primary, fontWeight: "800", fontSize: 10, textTransform: "uppercase" },
  currencyValue: { color: palette.ink, fontWeight: "800", fontSize: 14, marginTop: 5 },
  currencyNote: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  profile: { flexDirection: "row", alignItems: "center", backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 9 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: palette.border },
  radioOn: { borderColor: palette.primary, backgroundColor: palette.primary },
  button: { backgroundColor: palette.navy, borderRadius: 15, padding: 17, alignItems: "center", marginTop: 28 },
  buttonText: { color: "white", fontWeight: "800", fontSize: 15 },
  privacy: { textAlign: "center", color: palette.muted, fontSize: 11, marginTop: 14 }
});
