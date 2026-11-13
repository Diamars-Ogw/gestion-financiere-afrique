import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "@/src/constants/theme";
export default function TabLayout(){return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:palette.primary,tabBarInactiveTintColor:palette.muted,tabBarStyle:{height:66,paddingTop:8,paddingBottom:8,borderTopColor:palette.border,backgroundColor:palette.surface},tabBarLabelStyle:{fontSize:10,fontWeight:"600"}}}>
<Tabs.Screen name="index" options={{title:"Accueil",tabBarIcon:({color,size})=><Ionicons name="grid-outline" color={color} size={size}/>}}/>
<Tabs.Screen name="transactions" options={{title:"Opérations",tabBarIcon:({color,size})=><Ionicons name="swap-horizontal-outline" color={color} size={size}/>}}/>
<Tabs.Screen name="budgets" options={{title:"Budgets",tabBarIcon:({color,size})=><Ionicons name="pie-chart-outline" color={color} size={size}/>}}/>
<Tabs.Screen name="settings" options={{title:"Profil",tabBarIcon:({color,size})=><Ionicons name="person-circle-outline" color={color} size={size}/>}}/>
</Tabs>;}
