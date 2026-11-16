import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkPalette, lightPalette, type Palette } from "@/src/constants/theme";

export type Scheme = "light" | "dark";
const STORAGE_KEY = "mon-budget-theme";

type ThemeValue = { scheme: Scheme; palette: Palette; setScheme: (scheme: Scheme) => void };
const ThemeContext = createContext<ThemeValue>({ scheme: "light", palette: lightPalette, setScheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setSchemeState] = useState<Scheme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => { if (active && (value === "dark" || value === "light")) setSchemeState(value); })
      .catch(() => {})
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  // Garde les éléments natifs (alertes, sélecteurs) alignés sur le thème choisi.
  useEffect(() => { Appearance.setColorScheme(scheme); }, [scheme]);

  const setScheme = useCallback((next: Scheme) => {
    setSchemeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ scheme, palette: scheme === "dark" ? darkPalette : lightPalette, setScheme }), [scheme, setScheme]);
  if (!ready) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette { return useContext(ThemeContext).palette; }
export function useThemeController() {
  const { scheme, setScheme } = useContext(ThemeContext);
  return { scheme, setScheme };
}
