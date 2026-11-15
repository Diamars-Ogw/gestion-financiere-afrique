import { DynamicColorIOS, Platform, PlatformColor } from "react-native";

/**
 * Semantic colors follow the native light/dark appearance. Keeping these
 * tokens centralized means every screen using the design system changes
 * together when the user switches appearance.
 */
function adaptive(light: string, dark: string, androidResource: string) {
  if (Platform.OS === "android") return PlatformColor(androidResource);
  if (Platform.OS === "ios") return DynamicColorIOS({ light, dark });
  return light;
}

export const palette = {
  emerald: "#0B9B61",
  emeraldDark: "#075B3D",
  primary: "#087A4B",
  primarySoft: adaptive("#E7F5EC", "#153B2B", "?android:attr/colorBackground"),
  green: "#15965B",
  greenSoft: adaptive("#E5F5EB", "#173B2B", "?android:attr/colorBackground"),
  navy: "#064A35",
  navySoft: "#0A6748",
  ink: adaptive("#142F25", "#F1F5F1", "?android:attr/textColorPrimary"),
  muted: adaptive("#718078", "#A8B5AD", "?android:attr/textColorSecondary"),
  background: adaptive("#F4F7F2", "#101713", "?android:attr/colorBackground"),
  surface: adaptive("#FFFFFF", "#19231D", "?android:attr/colorBackground"),
  surfaceMuted: adaptive("#D5E5DA", "#34483B", "?android:attr/colorBackground"),
  surfaceSoft: adaptive("#EDF5EE", "#202D25", "?android:attr/colorBackground"),
  border: adaptive("#E2EAE2", "#34443A", "?android:attr/colorForeground"),
  orange: "#9A5A08",
  orangeSoft: adaptive("#FFF4E3", "#3A2C18", "?android:attr/colorBackground"),
  red: "#B93636",
  redSoft: adaptive("#FDEEEE", "#3B2020", "?android:attr/colorBackground"),
  shadow: "#123D2B"
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 12, md: 18, lg: 26, xl: 32, pill: 999 };
