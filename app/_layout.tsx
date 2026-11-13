import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { initializeDatabase } from "@/src/database/schema";
export default function RootLayout() {
  return <SQLiteProvider databaseName="equilibre.db" onInit={initializeDatabase}><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F4F6FA" } }} /></SQLiteProvider>;
}
