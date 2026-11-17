import { useEffect, useState } from "react";
import { Image, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/src/components/AppText";
import { useTheme } from "@/src/components/ThemeProvider";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaInstallPrompt() {
  const palette = useTheme();
  const [visible, setVisible] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const browser = window as Window & { navigator: Navigator & { standalone?: boolean } };
    const installed = window.matchMedia("(display-mode: standalone)").matches || browser.navigator.standalone === true;
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (installed || !mobile) return;

    try {
      if (sessionStorage.getItem("mon-budget-install-dismissed") === "1") return;
    } catch {}

    const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIos(isAppleMobile);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => setVisible(true), 1100);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (Platform.OS !== "web") return null;

  function close() {
    setVisible(false);
    try {
      sessionStorage.setItem("mon-budget-install-dismissed", "1");
    } catch {}
  }

  async function install() {
    if (installEvent) {
      try {
        await installEvent.prompt();
        const choice = await installEvent.userChoice;
        setInstallEvent(null);
        if (choice.outcome === "accepted") {
          close();
          return;
        }
      } catch {
        // Fall back to browser-specific installation instructions.
      }
    }
    setInstructions(true);
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={[styles.logo, { backgroundColor: palette.primarySoft }]}>
            <Image source={{ uri: "/icons/icon-192.png" }} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={[styles.title, { color: palette.ink }]}>
            {instructions ? "Installer Mon Budget" : "Emporte ton budget partout"}
          </Text>
          <Text style={[styles.description, { color: palette.muted }]}>
            {instructions
              ? ios
                ? "Sur iPhone, ouvre cette page dans Safari. Touche Partager, fais défiler les options, choisis « Sur l’écran d’accueil », puis touche « Ajouter »."
                : "Si tu es dans WhatsApp ou une autre application, ouvre d’abord ce lien dans Chrome. Dans le menu ⋮, choisis « Installer l’application » ou « Ajouter à l’écran d’accueil »."
              : "Ajoute Mon Budget à l’écran d’accueil pour l’ouvrir comme une application, sans rechercher le lien à chaque fois."}
          </Text>
          {instructions ? (
            <Pressable onPress={close} style={[styles.primaryButton, { backgroundColor: palette.navy }]}>
              <Text style={styles.primaryText}>J’ai compris</Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={install} style={[styles.primaryButton, { backgroundColor: palette.navy }]}>
                <Text style={styles.primaryText}>Installer Mon Budget</Text>
              </Pressable>
              <Pressable onPress={close} style={styles.secondaryButton}>
                <Text style={[styles.secondaryText, { color: palette.muted }]}>Continuer sur le navigateur</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4, 24, 17, 0.58)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22
  },
  card: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center"
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17
  },
  logoImage: { width: 58, height: 58, borderRadius: 15 },
  title: { fontSize: 21, fontWeight: "800", textAlign: "center" },
  description: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 10, marginBottom: 20 },
  primaryButton: { width: "100%", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  secondaryButton: { padding: 12, marginTop: 5 },
  secondaryText: { fontSize: 13, fontWeight: "700" }
});
