import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { amountToMinorUnits, ensureDefaultAccount, saveProfile } from "@/src/database/finance";
import { COUNTRIES } from "@/src/constants/countries";
import type { IncomeProfile } from "@/src/types/finance";
import { palette } from "@/src/constants/theme";

const profiles: { value: IncomeProfile; title: string; description: string }[] = [
  { value: "regular", title: "Revenus réguliers", description: "Salaire, pension ou revenu stable" },
  { value: "irregular", title: "Revenus variables", description: "Commerce, missions ou freelance" },
  { value: "multiple", title: "Plusieurs sources", description: "Plusieurs activités ou revenus" },
  { value: "none", title: "Pas de revenu personnel", description: "Études, recherche d'emploi ou soutien familial" }
];

const steps = ["Ton prénom", "Ton pays", "Tes revenus", "Ton solde"];

export default function Onboarding() {
  const db = useSQLiteContext();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("BJ");
  const [incomeProfile, setIncomeProfile] = useState<IncomeProfile>("regular");
  const [openingBalance, setOpeningBalance] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const country = COUNTRIES.find(c => c.code === countryCode) ?? COUNTRIES[0];
  const filteredCountries = useMemo(() => COUNTRIES.filter(c => c.label.toLocaleLowerCase("fr").includes(countrySearch.toLocaleLowerCase("fr"))), [countrySearch]);

  async function finish() {
    try {
      const openingMinor = openingBalance.trim() ? amountToMinorUnits(openingBalance, country.currency) : 0;
      if (openingMinor === null) throw new Error("Solde initial invalide. Vérifie le montant et la précision autorisée pour cette devise.");
      await saveProfile(db, { displayName: name.trim() || "Utilisateur", country: country.code, currency: country.currency, incomeProfile });
      await ensureDefaultAccount(db, country.currency, openingMinor);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Enregistrement impossible", error instanceof Error ? error.message : "Réessaie dans quelques instants.");
    }
  }

  function next() {
    if (step === 0 && !name.trim()) {
      Alert.alert("Ton prénom", "Ajoute un prénom pour personnaliser ton espace.");
      return;
    }
    if (step < steps.length - 1) setStep(step + 1);
    else void finish();
  }

  return (
    <View style={s.page}>
      <View style={s.top}>
        <Text style={s.brand}>MON BUDGET</Text>
        <Text style={s.stepText}>ÉTAPE {step + 1} SUR {steps.length}</Text>
        <View style={s.progressTrack}><View style={[s.progressFill, { width: ((step + 1) / steps.length * 100) + "%" as `${number}%` }]} /></View>
      </View>
      <View style={s.body}>
        {step === 0 && <View style={s.stepContent}>
          <View style={s.illustration}><Text style={s.illustrationEmoji}>👋</Text></View>
          <Text style={s.eyebrow}>BIENVENUE</Text>
          <Text style={s.title}>Comment on t'appelle ?</Text>
          <Text style={s.subtitle}>On commence simplement. Tu pourras modifier ces informations plus tard.</Text>
          <TextInput autoFocus value={name} onChangeText={setName} placeholder="Ton prénom" placeholderTextColor="#9BAAA2" style={s.input} returnKeyType="next" onSubmitEditing={next} />
        </View>}
        {step === 1 && <View style={s.stepContent}>
          <Text style={s.eyebrow}>TON ESPACE, TON PAYS</Text>
          <Text style={s.title}>Tu vis dans quel pays ?</Text>
          <Text style={s.subtitle}>On adaptera automatiquement la devise. XOF et XAF restent bien distincts.</Text>
          <TextInput value={countrySearch} onChangeText={setCountrySearch} placeholder="Rechercher un pays" placeholderTextColor="#9BAAA2" style={s.input} />
          <ScrollView style={s.countryList} keyboardShouldPersistTaps="handled">
            {filteredCountries.map(c => <Pressable key={c.code} onPress={() => setCountryCode(c.code)} style={[s.countryRow, countryCode === c.code && s.countrySelected]}>
              <View style={{flex:1}}><Text style={s.countryName}>{c.label}</Text><Text style={s.countryCurrency}>{c.currency}</Text></View>
              {countryCode === c.code && <Text style={s.check}>✓</Text>}
            </Pressable>)}
          </ScrollView>
          <View style={s.currencyNote}><Text style={s.currencyNoteTitle}>{country.currency} · {country.currencyLabel}</Text><Text style={s.currencyNoteText}>Tous les montants seront affichés dans cette devise.</Text></View>
        </View>}
        {step === 2 && <View style={s.stepContent}>
          <Text style={s.eyebrow}>TON QUOTIDIEN</Text>
          <Text style={s.title}>Comment arrives-tu à gagner de l'argent ?</Text>
          <Text style={s.subtitle}>Il n'y a pas de mauvaise réponse. On adapte les conseils à ta situation.</Text>
          {profiles.map(p => <Pressable key={p.value} onPress={() => setIncomeProfile(p.value)} style={[s.profileCard, incomeProfile === p.value && s.profileSelected]}>
            <View style={{flex:1}}><Text style={s.profileTitle}>{p.title}</Text><Text style={s.profileDescription}>{p.description}</Text></View>
            <View style={[s.radio, incomeProfile === p.value && s.radioOn]}>{incomeProfile === p.value && <View style={s.radioDot}/>}</View>
          </Pressable>)}
        </View>}
        {step === 3 && <View style={s.stepContent}>
          <Text style={s.eyebrow}>ON Y EST PRESQUE</Text>
          <Text style={s.title}>Combien as-tu actuellement ?</Text>
          <Text style={s.subtitle}>Indique ton solde de départ si tu le connais. Sinon, passe cette étape.</Text>
          <View style={s.balanceInputWrap}><TextInput value={openingBalance} onChangeText={setOpeningBalance} placeholder="0" placeholderTextColor="#9BAAA2" keyboardType="decimal-pad" style={s.balanceInput}/><Text style={s.currencyCode}>{country.currency}</Text></View>
          <Text style={s.helper}>Ce montant initialise ton portefeuille espèces. Il ne sera pas compté comme un revenu.</Text>
          <View style={s.privacyCard}><Text style={s.privacyIcon}>🔒</Text><Text style={s.privacyText}>Tes données financières restent sur ton téléphone. Aucun compte à créer.</Text></View>
        </View>}
      </View>
      <View style={s.footer}>
        {step > 0 ? <Pressable onPress={() => setStep(step - 1)} style={s.backButton}><Text style={s.backText}>Retour</Text></Pressable> : <View style={{width:76}}/>}
        <Pressable onPress={next} style={s.nextButton}><Text style={s.nextText}>{step === steps.length - 1 ? "Créer mon espace" : "Suivant"}</Text><Text style={s.nextArrow}>→</Text></Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:palette.background,paddingTop:58},
  top:{paddingHorizontal:25},
  brand:{color:palette.primary,fontSize: 14,fontWeight:"900",letterSpacing:2},
  stepText:{color:palette.muted,fontSize: 12,fontWeight:"800",letterSpacing:1,marginTop:27},
  progressTrack:{height:5,backgroundColor:palette.border,borderRadius:5,overflow:"hidden",marginTop:10},
  progressFill:{height:5,backgroundColor:palette.primary,borderRadius:5},
  body:{flex:1,justifyContent:"center",paddingHorizontal:25},
  stepContent:{width:"100%"},
  illustration:{width:64,height:64,borderRadius:22,backgroundColor:palette.primarySoft,alignItems:"center",justifyContent:"center",marginBottom:25},
  illustrationEmoji:{fontSize: 31},
  eyebrow:{color:palette.primary,fontSize: 12,fontWeight:"900",letterSpacing:1.6,marginBottom:12},
  title:{color:palette.ink,fontSize: 29,lineHeight:36,fontWeight:"900",letterSpacing:-0.7},
  subtitle:{color:palette.muted,fontSize: 15,lineHeight:22,marginTop:11,marginBottom:25},
  input:{height:58,backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,borderRadius:17,paddingHorizontal:17,color:palette.ink,fontSize: 17},
  countryList:{maxHeight:270,marginTop:12},
  countryRow:{flexDirection:"row",alignItems:"center",padding:14,backgroundColor:palette.surface,borderRadius:13,marginBottom:7,borderWidth:1,borderColor:palette.border},
  countrySelected:{borderColor:palette.primary,backgroundColor:palette.primarySoft},
  countryName:{color:palette.ink,fontSize: 15,fontWeight:"700"},
  countryCurrency:{color:palette.muted,fontSize: 13,marginTop:3},
  check:{color:palette.primary,fontSize: 20,fontWeight:"900"},
  currencyNote:{backgroundColor:palette.primarySoft,padding:13,borderRadius:14,marginTop:10},
  currencyNoteTitle:{color:palette.primary,fontSize: 14,fontWeight:"800"},
  currencyNoteText:{color:palette.muted,fontSize: 13,marginTop:4},
  profileCard:{flexDirection:"row",alignItems:"center",backgroundColor:palette.surface,borderRadius:16,padding:16,borderWidth:1,borderColor:palette.border,marginBottom:10},
  profileSelected:{borderColor:palette.primary,backgroundColor:palette.primarySoft},
  profileTitle:{color:palette.ink,fontSize: 15,fontWeight:"800"},
  profileDescription:{color:palette.muted,fontSize: 13,marginTop:4},
  radio:{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:palette.border,alignItems:"center",justifyContent:"center"},
  radioOn:{borderColor:palette.primary},
  radioDot:{width:10,height:10,borderRadius:5,backgroundColor:palette.primary},
  balanceInputWrap:{flexDirection:"row",alignItems:"center",backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,borderRadius:18,paddingHorizontal:18},
  balanceInput:{flex:1,height:68,color:palette.ink,fontSize: 27,fontWeight:"800"},
  currencyCode:{color:palette.primary,fontSize: 15,fontWeight:"900"},
  helper:{color:palette.muted,fontSize: 13,lineHeight:17,marginTop:10},
  privacyCard:{flexDirection:"row",alignItems:"center",backgroundColor:palette.surface,borderRadius:15,padding:15,marginTop:28,gap:11},
  privacyIcon:{fontSize: 19},
  privacyText:{flex:1,color:palette.muted,fontSize: 13,lineHeight:17},
  footer:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:25,paddingTop:14,paddingBottom:28},
  backButton:{paddingVertical:15,paddingHorizontal:12},
  backText:{color:palette.muted,fontSize: 15,fontWeight:"700"},
  nextButton:{height:56,backgroundColor:palette.primary,borderRadius:17,paddingHorizontal:22,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:15,minWidth:175},
  nextText:{color:"#FFFFFF",fontSize: 15,fontWeight:"800"},
  nextArrow:{color:"#FFFFFF",fontSize: 19,fontWeight:"700"}
});
