import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { initializeDatabase } from "@/src/database/schema";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
export default function RootLayout() {
  return <SQLiteProvider databaseName="equilibre.db" onInit={initializeDatabase}><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F4F6FA" } }} /></SQLiteProvider>;
}
