import { Alert as NativeAlert, Platform } from "react-native";

type DialogButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

export const Alert = {
  alert(title: string, message?: string, buttons?: DialogButton[]) {
    if (Platform.OS !== "web") {
      NativeAlert.alert(title, message, buttons as never);
      return;
    }

    const content = message ? title + "\n\n" + message : title;
    if (!buttons?.length) {
      window.alert(content);
      return;
    }

    const cancel = buttons.find(button => button.style === "cancel");
    const action = [...buttons].reverse().find(button => button.style !== "cancel") ?? buttons[0];

    if (cancel && action !== cancel) {
      if (window.confirm(content)) action.onPress?.();
      else cancel.onPress?.();
      return;
    }

    window.alert(content);
    buttons[0].onPress?.();
  }
};
