// SOS Design System Theme
// Centralized styling for consistent design across the app

export const colors = {
  background: '#F5F0E8',  // warm off-white — all screen backgrounds
  surface: '#FFFFFF',     // white — cards, modals, input fields
  dark: '#1A1611',        // near black — primary text, headers
  muted: '#8A8070',       // warm grey — secondary text, placeholders
  accent: '#F5C842',      // yellow — primary buttons, active tabs, badges
  accentDark: '#D4A800',  // darker yellow — button pressed state
  danger: '#E53935',      // red — lost status, delete, sign out
  success: '#43A047',     // green — recovered status, verified badge
  warning: '#FB8C00',     // orange — located status
  border: '#E8E0D0',      // warm light grey — card borders, dividers
  overlay: 'rgba(26,22,17,0.5)', // dark overlay for modals
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', color: colors.dark },
  h2: { fontSize: 22, fontWeight: '700', color: colors.dark },
  h3: { fontSize: 18, fontWeight: '600', color: colors.dark },
  body: { fontSize: 15, fontWeight: '400', color: colors.dark },
  small: { fontSize: 13, fontWeight: '400', color: colors.muted },
  label: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: colors.muted,
    textTransform: 'uppercase', 
    letterSpacing: 0.8 
  },
  button: { fontSize: 15, fontWeight: '600', color: colors.dark },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const components = {
  // Buttons
  button: {
    primary: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    primaryText: {
      ...typography.button,
      color: colors.dark,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.dark,
      borderRadius: 12,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    secondaryText: {
      ...typography.button,
      color: colors.dark,
    },
    danger: {
      backgroundColor: colors.danger,
      borderRadius: 12,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    dangerText: {
      ...typography.button,
      color: colors.surface,
    },
    disabled: {
      backgroundColor: colors.border,
      borderRadius: 12,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    disabledText: {
      ...typography.button,
      color: colors.muted,
    },
  },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Input Fields
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.dark,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  inputError: {
    borderColor: colors.danger,
  },

  // Status Badges
  badge: {
    safe: {
      backgroundColor: '#E8F5E9',
      color: colors.success,
      label: 'Safe',
    },
    lost: {
      backgroundColor: '#FFEBEE',
      color: colors.danger,
      label: 'Lost',
    },
    located: {
      backgroundColor: '#FFF3E0',
      color: colors.warning,
      label: 'Located',
    },
    recovered: {
      backgroundColor: '#E8F5E9',
      color: colors.success,
      label: 'Recovered',
    },
    pending: {
      backgroundColor: '#FFF8E1',
      color: colors.accent,
      label: 'Pending',
    },
    confirmed: {
      backgroundColor: '#E8F5E9',
      color: colors.success,
      label: 'Confirmed',
    },
    rejected: {
      backgroundColor: '#FFEBEE',
      color: colors.danger,
      label: 'Rejected',
    },
  },
  badgeStyle: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Bottom Navigation
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 60,
  },
  tabActive: {
    color: colors.accent,
  },
  tabInactive: {
    color: colors.muted,
  },

  // Screen Headers
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
  },
  headerBack: {
    color: colors.dark,
  },

  // Floating QR Button
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

  // Modals
  modal: {
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    content: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      ...typography.h3,
    },
    body: {
      padding: spacing.lg,
    },
    footer: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  },

  // Empty States
  empty: {
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    icon: {
      color: colors.muted,
      opacity: 0.4,
    },
    title: {
      ...typography.h3,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    description: {
      ...typography.small,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
  },

  // Dividers
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Shadows
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};

// Helper function to get status badge style
export function getStatusBadgeStyle(status) {
  const statusLower = status?.toLowerCase() || 'pending';
  const badgeConfig = components.badge[statusLower] || components.badge.pending;
  
  return {
    container: {
      ...components.badgeStyle,
      backgroundColor: badgeConfig.backgroundColor,
    },
    text: {
      ...components.badgeText,
      color: badgeConfig.color,
    },
    label: badgeConfig.label,
  };
}

// Helper function for responsive spacing
export function getResponsiveSpacing(isTablet) {
  return {
    horizontal: isTablet ? spacing.lg : spacing.md,
    vertical: isTablet ? spacing.xl : spacing.lg,
    section: isTablet ? spacing.xl : spacing.lg,
  };
}
