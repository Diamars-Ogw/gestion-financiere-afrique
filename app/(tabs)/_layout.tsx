import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { palette } from "@/src/constants/theme";

export default function TabLayout() {
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: "#91A098",
    tabBarStyle: { height: 76, paddingTop: 9, paddingBottom: 10, borderTopColor: "#E8EDE7", backgroundColor: "#FFFFFF", elevation: 12, shadowColor: "#17352A", shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: -4 } },
    tabBarLabelStyle: { fontSize: 10, fontWeight: "700" }
  }}>
    <Tabs.Screen name="index" options={{ title: "Accueil", tabBarIcon: ({color,size}) => <Ionicons name="home" color={color} size={size}/> }} />
    <Tabs.Screen name="budgets" options={{ title: "Budgets", tabBarIcon: ({color,size}) => <Ionicons name="pie-chart-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="transactions" options={{ title: "", tabBarLabel: () => null, tabBarIcon: () => <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center", marginTop: -25, borderWidth: 5, borderColor: "#FFFFFF", shadowColor: "#075B3D", shadowOpacity: 0.24, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}><Ionicons name="add" size={29} color="#FFFFFF"/></View> }} />
    <Tabs.Screen name="reports" options={{ title: "Analyse", tabBarIcon: ({color,size}) => <Ionicons name="stats-chart-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="more" options={{ title: "Plus", tabBarIcon: ({color,size}) => <Ionicons name="grid-outline" color={color} size={size}/> }} />
    {["settings","assistant","backup","calendar","debts","fuel-prices","goals","recurring","transport"].map(name => <Tabs.Screen key={name} name={name as any} options={{ href: null }} />)}
  </Tabs>;
}
