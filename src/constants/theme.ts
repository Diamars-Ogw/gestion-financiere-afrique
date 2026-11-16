/**
 * Design tokens de Mon Budget.
 * Palettes claire et sombre, statiques : elles rendent de la même façon sur tous
 * les appareils (aucune dépendance aux couleurs système ni à la police du téléphone).
 * Les écrans les lisent via useTheme() (src/components/ThemeProvider.tsx).
 */
export const lightPalette = {
  emerald: "#0B9B61",
  emeraldDark: "#075B3D",
  primary: "#087A4B",
  primarySoft: "#E3F4EA",
  green: "#15965B",
  greenSoft: "#E3F4EA",
  navy: "#064A35",
  navySoft: "#0A6748",
  ink: "#10261C",
  muted: "#5F7168",
  background: "#F2F8F4",
  surface: "#FFFFFF",
  surfaceMuted: "#D9E8DE",
  surfaceSoft: "#EAF5EE",
  border: "#E0EBE3",
  orange: "#9A5A08",
  orangeSoft: "#FFF4E3",
  red: "#B93636",
  redSoft: "#FDECEA",
  expense: "#C4473B",
  expenseSoft: "#FDECEA",
  income: "#12804F",
  incomeSoft: "#E3F4EA",
  mint: "#9BEFC3",
  shadow: "#123D2B"
};
export type Palette = typeof lightPalette;

/** Palette sombre : vert très profond, textes clairs, mêmes clés que la palette claire. */
export const darkPalette: Palette = {
  emerald: "#14B56F",
  emeraldDark: "#0B3B2A",
  primary: "#10905A",
  primarySoft: "#1A3A2B",
  green: "#3FCB8A",
  greenSoft: "#1A3A2B",
  navy: "#0F4A34",
  navySoft: "#14603F",
  ink: "#EAF3EE",
  muted: "#9DB2A6",
  background: "#0D1612",
  surface: "#15221B",
  surfaceMuted: "#2A3D32",
  surfaceSoft: "#1B2B22",
  border: "#2A3B31",
  orange: "#E8A94B",
  orangeSoft: "#3A2E18",
  red: "#FF7B6B",
  redSoft: "#3A2321",
  expense: "#FF8A78",
  expenseSoft: "#3A2321",
  income: "#4FD79A",
  incomeSoft: "#17382A",
  mint: "#9BEFC3",
  shadow: "#000000"
};


export const gradients = {
  header: ["#0C7A4F", "#075B3D", "#043D2B"] as const,
  bar: ["#4CCB8B", "#0E8A58"] as const,
  tabBar: ["#075B3D", "#043D2B"] as const
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 12, md: 18, lg: 26, xl: 32, pill: 999 };

/** Familles de la police embarquée (Plus Jakarta Sans), chargées dans app/_layout.tsx. */
export const fontFamilies = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold"
};

export function fontFamilyFor(weight: unknown) {
  switch (String(weight ?? "400")) {
    case "500": return fontFamilies.medium;
    case "600": return fontFamilies.semibold;
    case "700": case "bold": return fontFamilies.bold;
    case "800": case "900": return fontFamilies.extrabold;
    default: return fontFamilies.regular;
  }
}
