import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      {/* CTU Logo Placeholder */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="school" size={64} color={colors.gold} />
        </View>
      </View>

      {/* App Name */}
      <Text style={styles.appName}>
        LF<Text style={styles.dot}>.</Text>things
      </Text>
      <Text style={styles.subtitle}>Lost & Found</Text>

      {/* Campus Name */}
      <View style={styles.campusBadge}>
        <Text style={styles.campusText}>CTU Daanbantayan Campus</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.gold}20`,
    borderWidth: 3,
    borderColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.grape,
    letterSpacing: 1,
    marginBottom: 8,
  },
  dot: {
    color: colors.ember,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(69,53,75,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  campusBadge: {
    backgroundColor: `${colors.grape}15`,
    borderWidth: 1.5,
    borderColor: `${colors.grape}30`,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  campusText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.grape,
    letterSpacing: 0.5,
  },
});
