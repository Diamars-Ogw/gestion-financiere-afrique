import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontFamilies } from "@/src/constants/theme";
import { useTheme } from "@/src/components/ThemeProvider";

export default function TabLayout() {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{
    headerShown: false,
    sceneStyle: { backgroundColor: palette.background, paddingTop: insets.top },
    tabBarActiveTintColor: palette.mint,
    tabBarInactiveTintColor: "#8FB8A3",
    tabBarStyle: { height: 62 + bottom, paddingTop: 10, paddingBottom: bottom, backgroundColor: palette.navy, borderTopWidth: 0, borderTopLeftRadius: 26, borderTopRightRadius: 26, elevation: 16, shadowColor: "#04261B", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
    tabBarLabelStyle: { fontSize: 11, fontFamily: fontFamilies.bold },
    animation: "fade"
  }}>
    <Tabs.Screen name="index" options={{ title: "Accueil", sceneStyle: { backgroundColor: palette.background }, tabBarIcon: ({color,size}) => <Ionicons name="home" color={color} size={size}/> }} />
    <Tabs.Screen name="budgets" options={{ title: "Budgets", tabBarIcon: ({color,size}) => <Ionicons name="pie-chart-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="transactions" options={{ title: "Opération", tabBarAccessibilityLabel: "Ajouter une opération", tabBarLabel: () => null, tabBarIcon: () => <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#14B56F", alignItems: "center", justifyContent: "center", marginTop: -30, borderWidth: 5, borderColor: palette.navy, shadowColor: "#0B9B61", shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10 }}><Ionicons name="add" size={30} color="#FFFFFF"/></View> }} />
    <Tabs.Screen name="reports" options={{ title: "Analyse", tabBarIcon: ({color,size}) => <Ionicons name="stats-chart-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="more" options={{ title: "Plus", tabBarIcon: ({color,size}) => <Ionicons name="grid-outline" color={color} size={size}/> }} />
    {["settings","assistant","backup","calendar","debts","fuel-prices","goals","recurring","transport"].map(name => <Tabs.Screen key={name} name={name as any} options={{ href: null }} />)}
  </Tabs>;
}
