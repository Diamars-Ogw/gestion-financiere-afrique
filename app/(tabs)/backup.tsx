import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { createBackupData, restoreBackupData } from "@/src/database/finance";
import { palette } from "@/src/constants/theme";

export default function Backup() {
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    setBusy(true);
    try {
      const backup = await createBackupData(db);
      const filename = "mon-equilibre-sauvegarde-" + new Date().toISOString().slice(0,10) + ".json";
      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      await file.write(JSON.stringify(backup, null, 2));
      if (!(await Sharing.isAvailableAsync())) throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
      await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Sauvegarder Mon Équilibre" });
    } catch (error) {
      Alert.alert("Sauvegarde impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally { setBusy(false); }
  }

  async function chooseRestore() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/json"], copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets.length) return;
      const file = new File(result.assets[0].uri);
      const backup = JSON.parse(await file.text());
      Alert.alert(
        "Remplacer les données actuelles ?",
        "La restauration remplace les opérations, budgets, objectifs, échéances et dettes présents sur cet appareil. Fais une sauvegarde actuelle avant de continuer.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Restaurer", style: "destructive", onPress: async () => {
            setBusy(true);
            try {
              await restoreBackupData(db, backup);
              Alert.alert("Restauration terminée", "Les données de la sauvegarde ont été restaurées sur cet appareil.");
            } catch (error) {
              Alert.alert("Restauration impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
            } finally { setBusy(false); }
          }}
        ]
      );
    } catch (error) {
      Alert.alert("Fichier invalide", error instanceof Error ? error.message : "Impossible de lire ce fichier.");
    }
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Text style={s.title}>Sauvegarde et restauration</Text>
      <Text style={s.subtitle}>Tes données restent sur ton téléphone. Une sauvegarde te permet de les conserver si tu changes d'appareil ou si tu réinstalles l'application.</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>Exporter une sauvegarde</Text>
        <Text style={s.body}>Crée un fichier JSON contenant ton profil, tes portefeuilles, opérations, budgets, objectifs, échéances et dettes. Tu peux ensuite l'enregistrer dans tes fichiers ou un espace cloud de ton choix.</Text>
        <Pressable disabled={busy} onPress={exportBackup} style={s.button}><Text style={s.buttonText}>{busy ? "Préparation..." : "Exporter mes données"}</Text></Pressable>
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Restaurer une sauvegarde</Text>
        <Text style={s.body}>Sélectionne un fichier JSON Mon Équilibre précédemment exporté. La restauration remplace les données locales actuelles après confirmation.</Text>
        <Pressable disabled={busy} onPress={chooseRestore} style={s.secondary}><Text style={s.secondaryText}>Choisir un fichier de sauvegarde</Text></Pressable>
      </View>
      <View style={s.notice}>
        <Text style={s.noticeTitle}>À retenir</Text>
        <Text style={s.body}>La sauvegarde n'est pas envoyée automatiquement à nos serveurs. Conserve le fichier dans un endroit sûr. Toute personne qui possède ce fichier peut potentiellement lire tes informations financières.</Text>
      </View>
    </ScrollView>
  );
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:palette.background},content:{padding:20,paddingTop:58,paddingBottom:40},title:{color:palette.ink,fontSize:25,fontWeight:"800"},subtitle:{color:palette.muted,fontSize:12,lineHeight:19,marginTop:8},
 card:{backgroundColor:palette.surface,borderRadius:17,padding:16,marginTop:18},cardTitle:{color:palette.ink,fontSize:14,fontWeight:"800"},body:{color:palette.muted,fontSize:11,lineHeight:18,marginTop:8},button:{backgroundColor:palette.navy,borderRadius:11,padding:14,alignItems:"center",marginTop:15},buttonText:{color:"#FFFFFF",fontSize:11,fontWeight:"800"},secondary:{borderWidth:1,borderColor:palette.primary,borderRadius:11,padding:13,alignItems:"center",marginTop:15},secondaryText:{color:palette.primary,fontSize:11,fontWeight:"800"},notice:{backgroundColor:palette.primarySoft,borderRadius:14,padding:14,marginTop:17},noticeTitle:{color:palette.primary,fontSize:12,fontWeight:"800"}
});
