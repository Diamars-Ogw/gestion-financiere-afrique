import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { UIManager, Platform } from "react-native";
import { useFonts } from "expo-font";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold
} from "@expo-google-fonts/plus-jakarta-sans";
import * as Notifications from "expo-notifications";
import { initializeDatabase } from "@/src/database/schema";
import { ThemeProvider, useTheme, useThemeController } from "@/src/components/ThemeProvider";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

function RootStack() {
  const palette = useTheme();
  const { scheme } = useThemeController();
  return <SQLiteProvider databaseName="equilibre.db" onInit={initializeDatabase}>
    <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: palette.background },
      animation: "fade_from_bottom",
      animationDuration: 260,
      gestureEnabled: true
    }} />
  </SQLiteProvider>;
}

export default function RootLayout() {
  // Police embarquée dans l'application : aucun accès réseau, rendu identique sur tous les téléphones.
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold
  });
  if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);
  if (!fontsLoaded && !fontError) return null;
  return <ThemeProvider><RootStack /></ThemeProvider>;
}
