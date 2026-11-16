import { describe, expect, it } from "vitest";
import { darkPalette, lightPalette } from "./theme";

function luminance(hex: string) {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("thèmes", () => {
  it("la palette sombre a exactement les mêmes clés que la claire", () => {
    expect(Object.keys(darkPalette).sort()).toEqual(Object.keys(lightPalette).sort());
  });
  it.each([["clair", lightPalette], ["sombre", darkPalette]] as const)("contrastes lisibles en mode %s", (_name, p) => {
    expect(contrast(p.ink, p.background)).toBeGreaterThanOrEqual(7);
    expect(contrast(p.ink, p.surface)).toBeGreaterThanOrEqual(7);
    expect(contrast(p.muted, p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.primary, p.surface)).toBeGreaterThanOrEqual(4);
    expect(contrast(p.expense, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.income, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#FFFFFF", p.navy)).toBeGreaterThanOrEqual(7);
  });
});
