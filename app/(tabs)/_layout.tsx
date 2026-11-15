import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { palette } from "@/src/constants/theme";

export default function TabLayout() {
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: "#91A098",
    tabBarStyle: { height: 78, paddingTop: 9, paddingBottom: 11, borderTopColor: "#E8EDE7", backgroundColor: "#FFFFFF", elevation: 14, shadowColor: "#17352A", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: -5 } },
    tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
    animation: "fade"
  }}>
    <Tabs.Screen name="index" options={{ title: "Accueil", tabBarIcon: ({color,size}) => <Ionicons name="home" color={color} size={size}/> }} />
    <Tabs.Screen name="budgets" options={{ title: "Budgets", tabBarIcon: ({color,size}) => <Ionicons name="pie-chart-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="transactions" options={{ title: "", tabBarLabel: () => null, tabBarIcon: () => <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center", marginTop: -27, borderWidth: 5, borderColor: "#FFFFFF", shadowColor: "#075B3D", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 7 }}><Ionicons name="add" size={29} color="#FFFFFF"/></View> }} />
    <Tabs.Screen name="reports" options={{ title: "Analyse", tabBarIcon: ({color,size}) => <Ionicons name="stats-chart-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="more" options={{ title: "Plus", tabBarIcon: ({color,size}) => <Ionicons name="grid-outline" color={color} size={size}/> }} />
    {["settings","assistant","backup","calendar","debts","fuel-prices","goals","recurring","transport"].map(name => <Tabs.Screen key={name} name={name as any} options={{ href: null }} />)}
  </Tabs>;
}
