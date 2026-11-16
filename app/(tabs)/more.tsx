import { useMemo } from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import { Text } from "@/src/components/AppText";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Palette } from "@/src/constants/theme";
import { useTheme } from "@/src/components/ThemeProvider";

const groups = [
  { title: "Préparer l'avenir", items: [
    { label: "Objectifs d'épargne", hint: "Suivre ce que tu veux mettre de côté", icon: "flag-outline" as const, route: "/(tabs)/goals" as const },
    { label: "Échéances récurrentes", hint: "Factures et revenus attendus", icon: "repeat-outline" as const, route: "/(tabs)/recurring" as const }
  ]},
  { title: "Garder le contrôle", items: [
    { label: "Dettes et créances", hint: "Ce que tu dois ou ce qu'on te doit", icon: "swap-vertical-outline" as const, route: "/(tabs)/debts" as const },
    { label: "Transport", hint: "Carburant, entretien et déplacements", icon: "car-outline" as const, route: "/(tabs)/transport" as const },
    { label: "Calendrier", hint: "Événements et rappels", icon: "calendar-outline" as const, route: "/(tabs)/calendar" as const },
    { label: "Prix du carburant", hint: "Tes prix enregistrés par date", icon: "speedometer-outline" as const, route: "/(tabs)/fuel-prices" as const }
  ]},
  { title: "Outils", items: [
    { label: "Assistant financier", hint: "Des repères calculés à partir de tes données", icon: "sparkles-outline" as const, route: "/(tabs)/assistant" as const },
    { label: "Sauvegarde", hint: "Exporter ou restaurer tes données", icon: "shield-checkmark-outline" as const, route: "/(tabs)/backup" as const },
    { label: "Profil et paramètres", hint: "Pays, devise et portefeuilles", icon: "settings-outline" as const, route: "/(tabs)/settings" as const }
  ]}
];

export default function More() {
  const palette = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
 return <ScrollView style={s.page} contentContainerStyle={s.content}>
  <Text style={s.kicker}>TON ESPACE</Text><Text style={s.title}>Plus de fonctionnalités</Text>
  <Text style={s.subtitle}>Les outils complémentaires sont regroupés ici pour garder l'accueil simple.</Text>
  {groups.map(group=><View key={group.title}>
    <Text style={s.groupTitle}>{group.title}</Text>
    <View style={s.panel}>{group.items.map((item,index)=><Pressable key={item.label} onPress={()=>router.push(item.route)} style={[s.item,index>0&&s.separator]}>
      <View style={s.icon}><Ionicons name={item.icon} size={21} color={palette.primary}/></View>
      <View style={{flex:1}}><Text style={s.itemTitle}>{item.label}</Text><Text style={s.hint}>{item.hint}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={palette.muted}/>
    </Pressable>)}</View>
  </View>)}
 </ScrollView>;
}
const makeStyles = (palette: Palette) => StyleSheet.create({
 page:{flex:1,backgroundColor:palette.background},content:{padding:22,paddingTop: 18,paddingBottom:40},kicker:{color:palette.primary,fontSize: 13,fontWeight: "800",letterSpacing:1.5},title:{color:palette.ink,fontSize:28,fontWeight: "800",marginTop:7},subtitle:{color:palette.muted,fontSize:15,lineHeight:23,marginTop:9,marginBottom:10},
 groupTitle:{color:palette.ink,fontSize:17,fontWeight: "800",marginTop:23,marginBottom:11},panel:{backgroundColor:palette.surface,borderRadius:20,paddingHorizontal:15,borderWidth:1,borderColor:palette.border},
 item:{flexDirection:"row",alignItems:"center",paddingVertical:16,gap:13},separator:{borderTopWidth:1,borderTopColor:palette.border},icon:{width:44,height:44,borderRadius:15,backgroundColor:palette.primarySoft,alignItems:"center",justifyContent:"center"},itemTitle:{color:palette.ink,fontSize:15,fontWeight:"800"},hint:{color:palette.muted,fontSize: 13,lineHeight:17,marginTop:4}
});
