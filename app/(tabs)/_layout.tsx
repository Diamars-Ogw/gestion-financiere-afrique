import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "@/src/constants/theme";

export default function TabLayout() {
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: palette.muted,
    tabBarStyle: { height: 70, paddingTop: 9, paddingBottom: 9, borderTopColor: palette.border, backgroundColor: palette.surface, elevation: 8 },
    tabBarLabelStyle: { fontSize: 10, fontWeight: "700" }
  }}>
    <Tabs.Screen name="index" options={{ title: "Accueil", tabBarIcon: ({color,size}) => <Ionicons name="home-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="transactions" options={{ title: "Opérations", tabBarIcon: ({color,size}) => <Ionicons name="swap-horizontal-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="reports" options={{ title: "Analyse", tabBarIcon: ({color,size}) => <Ionicons name="analytics-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="budgets" options={{ title: "Budgets", tabBarIcon: ({color,size}) => <Ionicons name="pie-chart-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="more" options={{ title: "Plus", tabBarIcon: ({color,size}) => <Ionicons name="grid-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="settings" options={{ href: null }} />
    <Tabs.Screen name="assistant" options={{ href: null }} />
    <Tabs.Screen name="more" options={{ title: "Plus", tabBarIcon: ({color,size}) => <Ionicons name="grid-outline" color={color} size={size}/> }} />
    <Tabs.Screen name="backup" options={{ href: null }} />
    <Tabs.Screen name="calendar" options={{ href: null }} />
    <Tabs.Screen name="debts" options={{ href: null }} />
    <Tabs.Screen name="fuel-prices" options={{ href: null }} />
    <Tabs.Screen name="goals" options={{ href: null }} />
    <Tabs.Screen name="recurring" options={{ href: null }} />
    <Tabs.Screen name="transport" options={{ href: null }} />
  </Tabs>;
}
