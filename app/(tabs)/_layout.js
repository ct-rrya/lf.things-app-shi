import { Tabs, useRouter, usePathname } from 'expo-router';
import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../styles/theme';

// ── Nav items shared between sidebar and tab bar ───────────────
const NAV_ITEMS = [
  { name: 'home',          label: 'Home',          icon: 'home',          iconOutline: 'home-outline' },
  { name: 'my-items',      label: 'My Items',      icon: 'cube',          iconOutline: 'cube-outline' },
  { name: 'chat',          label: 'Chat',          icon: 'chatbubbles',   iconOutline: 'chatbubbles-outline' },
  { name: 'notifications', label: 'Notifications', icon: 'notifications', iconOutline: 'notifications-outline' },
  { name: 'profile',       label: 'Profile',       icon: 'person',        iconOutline: 'person-outline' },
];

// ── Mobile tab icon ────────────────────────────────────────────
function TabIcon({ name, focused, size }) {
  return (
    <View style={styles.tabIconWrap}>
      <Ionicons name={name} size={size} color={focused ? colors.accent : colors.muted} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

// ── Web Sidebar ────────────────────────────────────────────────
function WebSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const collapsed = width < 1024; // icon-only below 1024px

  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
      {/* Logo / Brand */}
      <View style={[styles.sidebarBrand, collapsed && styles.sidebarBrandCollapsed]}>
        <View style={styles.brandIcon}>
          <Ionicons name="shield-checkmark" size={22} color={colors.dark} />
        </View>
        {!collapsed && (
          <View>
    <Text style={styles.brandName}>LF</Text>
            <Text style={styles.brandSub}>Lost & Found</Text>
          </View>
        )}
      </View>

      {/* Nav links */}
      <View style={styles.sidebarNav}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === `/(tabs)/${item.name}` || pathname.endsWith(`/${item.name}`);
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.sidebarItem, active && styles.sidebarItemActive]}
              onPress={() => router.push(`/(tabs)/${item.name}`)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={active ? item.icon : item.iconOutline}
                size={20}
                color={active ? colors.dark : colors.muted}
              />
              {!collapsed && (
                <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>
                  {item.label}
                </Text>
              )}
              {active && !collapsed && <View style={styles.sidebarActivePill} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom: QR scan button */}
      <View style={styles.sidebarFooter}>
        <TouchableOpacity
          style={[styles.sidebarScanBtn, collapsed && styles.sidebarScanBtnCollapsed]}
          onPress={() => router.push('/qr-scanner')}
          activeOpacity={0.85}
        >
          <Ionicons name="qr-code-outline" size={20} color={colors.dark} />
          {!collapsed && <Text style={styles.sidebarScanLabel}>Scan QR</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Root layout ────────────────────────────────────────────────
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const router = useRouter();

  // Mobile responsive
  const tabBarHeight = (width >= 768 ? 80 : 70) + (isWeb ? 0 : insets.bottom);
  const tabBarPaddingBottom = isWeb ? 10 : Math.max(insets.bottom, 10);
  const iconSize = width >= 768 ? 26 : 22;
  const labelSize = width >= 768 ? 11 : 10;

  const tabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isWeb
          ? { display: 'none' }   // hide tab bar on web — sidebar handles nav
          : [
              styles.tabBar,
              { height: tabBarHeight, paddingBottom: tabBarPaddingBottom, paddingTop: width >= 768 ? 10 : 8 },
            ],
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: [styles.tabLabel, { fontSize: labelSize }],
      }}
    >
      {NAV_ITEMS.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          options={{
            title: item.label,
            tabBarLabel: item.label,
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? item.icon : item.iconOutline}
                focused={focused}
                size={iconSize}
              />
            ),
          }}
        />
      ))}

      {/* Hidden screens */}
      <Tabs.Screen name="register" options={{ href: null }} />
      <Tabs.Screen name="report-found" options={{ href: null }} />
    </Tabs>
  );

  // ── Web layout: sidebar + content ─────────────────────────────
  if (isWeb) {
    return (
      <View style={styles.webRoot}>
        <WebSidebar />
        <View style={styles.webMain}>
          {tabs}
        </View>
      </View>
    );
  }

  // ── Mobile layout: tabs + floating QR button ──────────────────
  return (
    <View style={{ flex: 1 }}>
      {tabs}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push('/qr-scanner')}
        activeOpacity={0.9}
      >
        <Ionicons name="qr-code-outline" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Web layout ──────────────────────────────────────────────
  webRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  webMain: {
    flex: 1,
    overflow: 'hidden',
  },

  // ── Sidebar ─────────────────────────────────────────────────
  sidebar: {
    width: 240,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
  },
  sidebarCollapsed: {
    width: 68,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },

  // Brand
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
  },
  sidebarBrandCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
    marginTop: -2,
  },

  // Nav
  sidebarNav: {
    flex: 1,
    gap: 4,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    position: 'relative',
  },
  sidebarItemActive: {
    backgroundColor: colors.accent,
  },
  sidebarLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
    flex: 1,
  },
  sidebarLabelActive: {
    color: colors.dark,
    fontWeight: '700',
  },
  sidebarActivePill: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dark,
    opacity: 0.4,
  },

  // Footer scan button
  sidebarFooter: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sidebarScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
  },
  sidebarScanBtnCollapsed: {
    justifyContent: 'center',
  },
  sidebarScanLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
  },

  // ── Mobile tab bar ───────────────────────────────────────────
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tabLabel: {
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },

  // ── Mobile floating QR button ────────────────────────────────
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
