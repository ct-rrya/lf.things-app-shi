// Cross-platform Alert utility
// Works on mobile (native Alert) and web (custom modal)

import { Alert as RNAlert, Platform } from 'react-native';

let webAlertCallback = null;

// Register the web alert handler (called from app/index.js)
export function setWebAlertHandler(handler) {
  webAlertCallback = handler;
}

// Cross-platform alert function
export function showAlert(title, message, buttons = [{ text: 'OK' }]) {
  if (Platform.OS === 'web' && webAlertCallback) {
    // Use custom web modal
    webAlertCallback({ title, message, buttons });
  } else {
    // Use native Alert on mobile
    RNAlert.alert(title, message, buttons);
  }
}

// Convenience function for simple alerts
export function alert(title, message) {
  showAlert(title, message);
}
