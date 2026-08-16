// utils/crossPlatformAlerts.js
// -----------------------------------------------------------------------------
// Alert.alert() with a button array (e.g. [Cancel, Delete]) isn't implemented
// by react-native-web — it silently no-ops in a browser. These helpers fall
// back to the browser's native confirm()/alert() on web, and use the real
// Alert.alert on iOS/Android where it works correctly.
//
// (Currently duplicated inline in EditClass.js from when this was first
// fixed — feel free to delete that copy and import from here instead so
// there's a single source of truth.)
// -----------------------------------------------------------------------------

import { Alert, Platform } from 'react-native';

export function confirmDialog(title, message) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title, message, onDismiss) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    onDismiss?.();
  } else {
    Alert.alert(title, message, onDismiss ? [{ text: 'OK', onPress: onDismiss }] : undefined);
  }
}
