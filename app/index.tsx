import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { Redirect } from "expo-router";
import { getProfile } from "@/src/database/finance";
export default function Index() {
 const db=useSQLiteContext(); const [destination,setDestination]=useState<"/onboarding"|"/(tabs)"|null>(null);
 useEffect(()=>{getProfile(db).then(p=>setDestination(p?.onboardingCompleted ? "/(tabs)" : "/onboarding")).catch(()=>setDestination("/onboarding"));},[db]);
 if(!destination) return <View style={{flex:1,alignItems:"center",justifyContent:"center"}}><ActivityIndicator color="#5268E8" /></View>;
 return <Redirect href={destination} />;
}
