import { forwardRef } from "react";
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from "react-native";
import { fontFamilyFor } from "@/src/constants/theme";

function withFont<T>(style: T) {
  const flat = (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
  const { fontWeight, fontFamily, ...rest } = flat;
  const fontSize = typeof rest.fontSize === "number" ? Math.max(12, rest.fontSize) : rest.fontSize;
  return { ...rest, ...(fontSize !== undefined ? { fontSize } : {}), fontFamily: (fontFamily as string | undefined) ?? fontFamilyFor(fontWeight) };
}

/** Text avec la police embarquée : la graisse (fontWeight) choisit la bonne famille. */
export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...props }, ref) {
  return <RNText ref={ref} {...props} style={withFont(style) as never} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} {...props} style={withFont(style) as never} />;
});
