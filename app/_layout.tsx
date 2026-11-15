import { useEffect } from "react";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, UIManager, Platform, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { initializeDatabase } from "@/src/database/schema";
import { palette } from "@/src/constants/theme";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

export default function RootLayout() {
  const scheme = useColorScheme();
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem("mon-budget-theme").then(value => {
      if (mounted && (value === "dark" || value === "light")) Appearance.setColorScheme(value);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);
  return <SQLiteProvider databaseName="equilibre.db" onInit={initializeDatabase}>
    <StatusBar style={scheme === "dark" ? "light" : "dark"} backgroundColor={scheme === "dark" ? "#101713" : "#F4F7F2"} />
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: palette.background },
      animation: "fade_from_bottom",
      animationDuration: 260,
      gestureEnabled: true
    }} />
  </SQLiteProvider>;
}
