import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Linking,
  Platform, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../styles/colors';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = Math.min(width * 0.7, 280);

export default function QRScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  async function handleBarCodeScanned({ data }) {
    if (scanned) return;
    
    setScanned(true);

    try {
      // Check if it's a valid URL
      if (!data.includes('http')) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not from LF',
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
        return;
      }

      // Parse the URL and navigate to the correct in-app route
      let path = data;
      try {
        const url = new URL(data);
        path = url.pathname; // e.g. /scan/abc-123 or /found/abc-123
      } catch (_) {
        // not a full URL, treat as path
      }

      // Extract the last two segments: route + id
      const parts = path.split('/').filter(Boolean);
      const id = parts[parts.length - 1];
      const route = parts[parts.length - 2]; // 'scan' or 'found'

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not from LF',
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
        return;
      }

      // Always go to /scan/ for item QR codes
      router.replace(`/scan/${id}`);
      
    } catch (err) {
      console.error('Error processing QR code:', err);
      Alert.alert(
        'Error',
        'Unable to process QR code',
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      );
    }
  }

  function handleOpenSettings() {
    Linking.openSettings();
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={64} color={colors.gold} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            Camera access is needed to scan QR codes.{'\n'}
            Please enable it in your phone settings.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleOpenSettings}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permissionButtonSecondary}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonTextSecondary}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        {/* Dark Overlay */}
        <View style={styles.overlay}>
          {/* Top Section */}
          <View style={styles.overlayTop}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Scan Area */}
          <View style={styles.scanAreaContainer}>
            <View style={[styles.scanArea, { width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE }]}>
              {/* Corner Brackets */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.overlayBottom}>
            <Text style={styles.instructionText}>
              Point your camera at an LF QR code
            </Text>
            {scanned && (
              <View style={styles.successIndicator}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text style={styles.successText}>QR Code Detected!</Text>
              </View>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  camera: {
    flex: 1,
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Permission ──
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.grape,
  },
  permissionIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(219,179,84,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.custard,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: 'rgba(222,207,157,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: colors.gold,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  permissionButtonSecondary: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
  },
  permissionButtonTextSecondary: {
    color: colors.custard,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // ── Overlay ──
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  overlayTop: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingRight: 20,
  },

  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // ── Scan Area ──
  scanAreaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanArea: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    position: 'relative',
  },

  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.gold,
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },

  // ── Bottom Section ──
  overlayBottom: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
