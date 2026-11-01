import { Alert, Platform } from 'react-native';

/** Bestätigungsdialog (nativ: Alert, Web: window.confirm). */
export function confirm(opts: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${opts.title}\n\n${opts.message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(opts.title, opts.message, [
      { text: opts.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: opts.confirmLabel,
        style: opts.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') globalThis.alert?.(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}
