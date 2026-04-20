import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

export default function SplashScreen() {
  // Animation values
  const blobOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.8)).current;
  const titleSlide = useRef(new Animated.Value(16)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const dividerOpacity = useRef(new Animated.Value(0)).current;
  const badgeSlide = useRef(new Animated.Value(16)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const loadBarWidth = useRef(new Animated.Value(0)).current;
  const loadOpacity = useRef(new Animated.Value(0)).current;
  const dotBounce = useRef(new Animated.Value(0)).current;

  const useNative = Platform.OS !== 'web'; // Only use native driver on mobile

  useEffect(() => {
    // Background blobs
    Animated.timing(blobOpacity, {
      toValue: 1, duration: 1200, useNativeDriver: useNative,
    }).start();

    // Ring spin (looping)
    Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: useNative,
      })
    ).start();

    // Pulse ring (looping)
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScale, {
          toValue: 1.5, duration: 2500, easing: Easing.out(Easing.ease), useNativeDriver: useNative,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0, duration: 2500, useNativeDriver: useNative,
        }),
      ])
    ).start();

    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: useNative, damping: 12, stiffness: 120 }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, delay: 300, useNativeDriver: useNative }),
    ]).start();

    // Staggered text reveals
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 600, delay: 500, useNativeDriver: useNative }),
        Animated.timing(titleSlide, { toValue: 0, duration: 600, delay: 500, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }),
      ]),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 600, delay: 650, useNativeDriver: useNative }),
      Animated.timing(dividerOpacity, { toValue: 1, duration: 600, delay: 750, useNativeDriver: useNative }),
      Animated.parallel([
        Animated.timing(badgeOpacity, { toValue: 1, duration: 600, delay: 850, useNativeDriver: useNative }),
        Animated.timing(badgeSlide, { toValue: 0, duration: 600, delay: 850, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }),
      ]),
    ]).start();

    // Loading bar
    Animated.timing(loadOpacity, { toValue: 1, duration: 400, delay: 1000, useNativeDriver: false }).start();
    Animated.timing(loadBarWidth, {
      toValue: 1, duration: 2200, delay: 1200,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();

    // Dot bounce loop
    Animated.delay(1500).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotBounce, { toValue: -4, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: useNative }),
          Animated.timing(dotBounce, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: useNative }),
          Animated.delay(1200),
        ])
      ).start();
    });
  }, []);

  const spin = ringRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const barInterpolated = loadBarWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      {/* Background blobs */}
      <Animated.View style={[styles.blob1, { opacity: blobOpacity }]} />
      <Animated.View style={[styles.blob2, { opacity: blobOpacity }]} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        {/* Pulse ring */}
        <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
        {/* Rotating outer ring */}
        <Animated.View style={[styles.logoRing, { transform: [{ rotate: spin }] }]}>
          <View style={styles.ringDash} />
        </Animated.View>
        {/* Static inner circle */}
        <View style={styles.logoCircle}>
          <Ionicons name="school" size={36} color={colors.gold} />
        </View>
      </Animated.View>

      {/* App Name */}
      <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleSlide }] }}>
        <Text style={styles.appName}>
          LF
          <Animated.Text style={[styles.dot, { transform: [{ translateY: dotBounce }] }]}>.</Animated.Text>
          things
        </Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Lost & Found
      </Animated.Text>

      {/* Divider */}
      <Animated.View style={[styles.divider, { opacity: dividerOpacity }]}>
        <View style={styles.dividerLine} />
        <View style={styles.dividerDiamond} />
        <View style={styles.dividerLine} />
      </Animated.View>

      {/* Campus Badge */}
      <Animated.View style={[styles.campusBadge, { opacity: badgeOpacity, transform: [{ translateY: badgeSlide }] }]}>
        <Text style={styles.campusText}>CTU Daanbantayan Campus</Text>
        <Text style={styles.campusSub}>Cebu Technological University</Text>
      </Animated.View>

      {/* Loading bar */}
      <Animated.View style={[styles.loadingWrap, { opacity: loadOpacity }]}>
        <Text style={styles.loadingLabel}>Loading</Text>
        <View style={styles.loadingTrack}>
          <Animated.View style={[styles.loadingBar, { width: barInterpolated }]} />
        </View>
      </Animated.View>
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
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: 280, height: 280,
    borderRadius: 140,
    backgroundColor: `${colors.gold}18`,
    top: -60, right: -80,
  },
  blob2: {
    position: 'absolute',
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: `${colors.grape}12`,
    bottom: -40, left: -60,
  },
  logoWrap: {
    width: 120, height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 130, height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: `${colors.gold}55`,
  },
  logoRing: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: `${colors.gold}55`,
    borderStyle: 'dashed',
  },
  logoCircle: {
    width: 88, height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.gold}14`,
    borderWidth: 2,
    borderColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.grape,
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  dot: { color: colors.ember },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: `${colors.grape}77`,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    width: '70%',
  },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: `${colors.grape}25` },
  dividerDiamond: {
    width: 5, height: 5,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  campusBadge: {
    backgroundColor: `${colors.grape}0d`,
    borderWidth: 1,
    borderColor: `${colors.grape}22`,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
  },
  campusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.grape,
    letterSpacing: 0.5,
  },
  campusSub: {
    fontSize: 9,
    fontWeight: '500',
    color: `${colors.grape}66`,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  loadingWrap: {
    position: 'absolute',
    bottom: 48,
    left: 40,
    right: 40,
  },
  loadingLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: `${colors.grape}55`,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  loadingTrack: {
    height: 2,
    backgroundColor: `${colors.grape}12`,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBar: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
});