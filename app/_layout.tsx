import { Component, type ErrorInfo, type ReactNode } from "react";
import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { UIManager, Platform, View, Text as NativeText } from "react-native";
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
import PwaInstallPrompt from "@/src/components/PwaInstallPrompt";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
}

class WebStartupErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error?.message || String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Mon Budget] Erreur au démarrage Web:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, minHeight: "100vh" as any, justifyContent: "center", padding: 24, backgroundColor: "#FFFFFF" }}>
        <NativeText style={{ color: "#075B3D", fontSize: 21, fontWeight: "800", marginBottom: 10 }}>Mon Budget n’a pas pu démarrer</NativeText>
        <NativeText selectable style={{ color: "#263238", fontSize: 14, lineHeight: 21 }}>Erreur technique : {this.state.error}</NativeText>
        <NativeText style={{ color: "#667085", fontSize: 12, marginTop: 16 }}>Recharge cette page. Si le problème continue, transmets ce message au support.</NativeText>
      </View>
    );
  }
}

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
  const app = <ThemeProvider><><RootStack /><PwaInstallPrompt /></></ThemeProvider>;
  return Platform.OS === "web" ? <WebStartupErrorBoundary>{app}</WebStartupErrorBoundary> : app;
}
