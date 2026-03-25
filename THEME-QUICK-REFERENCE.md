# Theme Quick Reference Card

## Import Statement
```javascript
import { colors, typography, spacing, components } from '../../styles/theme';
```

## Colors Cheat Sheet
```javascript
colors.background  // '#F5F0E8' - Screen backgrounds
colors.surface     // '#FFFFFF' - Cards, modals
colors.dark        // '#1A1611' - Primary text
colors.muted       // '#8A8070' - Secondary text
colors.accent      // '#F5C842' - Primary buttons, active
colors.danger      // '#E53935' - Lost, delete
colors.success     // '#43A047' - Recovered, verified
colors.warning     // '#FB8C00' - Located
colors.border      // '#E8E0D0' - Borders, dividers
colors.overlay     // 'rgba(26,22,17,0.5)' - Modal overlay
```

## Typography Quick Use
```javascript
...typography.h1      // 28px bold - Page titles
...typography.h2      // 22px bold - Section headers
...typography.h3      // 18px semibold - Card titles
...typography.body    // 15px regular - Body text
...typography.small   // 13px regular - Secondary
...typography.label   // 11px semibold uppercase - Labels
...typography.button  // 15px semibold - Buttons
```

## Spacing Quick Use
```javascript
spacing.xs   // 4px
spacing.sm   // 8px
spacing.md   // 16px  ← Most common
spacing.lg   // 24px  ← Section gaps
spacing.xl   // 32px
spacing.xxl  // 48px
```

## Common Patterns

### Screen Container
```javascript
container: {
  flex: 1,
  backgroundColor: colors.background,
}
```

### Card
```javascript
card: {
  ...components.card,
  // Includes: white bg, border, radius 16, padding 16, shadow
}
```

### Primary Button
```javascript
button: {
  ...components.button.primary,
  // Yellow bg, 52px height, radius 12
}
buttonText: {
  ...components.button.primaryText,
  // Dark text, 15px semibold
}
```

### Secondary Button
```javascript
button: {
  ...components.button.secondary,
  // Transparent bg, dark border
}
buttonText: {
  ...components.button.secondaryText,
}
```

### Danger Button
```javascript
button: {
  ...components.button.danger,
  // Red bg, white text
}
buttonText: {
  ...components.button.dangerText,
}
```

### Input Field
```javascript
input: {
  ...components.input,
  // White bg, border, 52px height
}

// Focused state
inputFocused: {
  ...components.input,
  ...components.inputFocused,
  // Yellow border
}

// Error state
inputError: {
  ...components.input,
  ...components.inputError,
  // Red border
}
```

### Status Badge
```javascript
import { getStatusBadgeStyle } from '../../styles/theme';

const badgeStyle = getStatusBadgeStyle('lost');

<View style={badgeStyle.container}>
  <Text style={badgeStyle.text}>{badgeStyle.label}</Text>
</View>

// Available statuses: safe, lost, located, recovered, pending, confirmed, rejected
```

### Modal
```javascript
modalOverlay: {
  ...components.modal.overlay,
}
modalContent: {
  ...components.modal.content,
}
modalHeader: {
  ...components.modal.header,
}
modalTitle: {
  ...components.modal.title,
}
modalBody: {
  ...components.modal.body,
}
modalFooter: {
  ...components.modal.footer,
}
```

### Shadows
```javascript
...components.shadow.small   // Subtle
...components.shadow.medium  // Cards
...components.shadow.large   // Modals, floating buttons
```

### Divider
```javascript
divider: {
  ...components.divider,
  // 1px height, border color
}
```

### Empty State
```javascript
emptyContainer: {
  ...components.empty.container,
}
emptyTitle: {
  ...components.empty.title,
}
emptyDescription: {
  ...components.empty.description,
}
```

## Icon Colors by Context
```javascript
// Danger/Lost
<Ionicons name="alert-circle" color={colors.danger} />

// Success/Recovered
<Ionicons name="checkmark-circle" color={colors.success} />

// Warning/Located
<Ionicons name="location" color={colors.warning} />

// Accent/Active/Primary
<Ionicons name="star" color={colors.accent} />

// Muted/Inactive/Secondary
<Ionicons name="time" color={colors.muted} />

// Dark/Primary text
<Ionicons name="menu" color={colors.dark} />
```

## Common Layouts

### Screen with Header
```javascript
<View style={styles.container}>
  <View style={styles.header}>
    <Text style={typography.h2}>Title</Text>
  </View>
  <ScrollView style={styles.body}>
    {/* Content */}
  </ScrollView>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: {
    flex: 1,
  },
});
```

### Card List
```javascript
<View style={styles.list}>
  {items.map(item => (
    <View key={item.id} style={styles.card}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardText}>{item.description}</Text>
    </View>
  ))}
</View>

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    ...components.card,
  },
  cardTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  cardText: {
    ...typography.body,
  },
});
```

### Form
```javascript
<View style={styles.form}>
  <Text style={styles.label}>Name</Text>
  <TextInput
    style={styles.input}
    placeholder="Enter name"
    placeholderTextColor={colors.muted}
  />
  
  <TouchableOpacity style={styles.button}>
    <Text style={styles.buttonText}>Submit</Text>
  </TouchableOpacity>
</View>

const styles = StyleSheet.create({
  form: {
    padding: spacing.md,
    gap: spacing.md,
  },
  label: {
    ...typography.label,
  },
  input: {
    ...components.input,
  },
  button: {
    ...components.button.primary,
  },
  buttonText: {
    ...components.button.primaryText,
  },
});
```

## Find & Replace Guide

```
// Old → New
'#F2EAD0' → colors.background
'#F5F0E8' → colors.background
'#FFFFFF' → colors.surface
'#45354B' → colors.dark
'#1A1611' → colors.dark
'#DECF9D' → colors.accent
'#DBB354' → colors.accent
'#F5C842' → colors.accent
'#D00803' → colors.danger
'#E53935' → colors.danger
'#43A047' → colors.success
'#FB8C00' → colors.warning
'rgba(69,53,75,0.08)' → colors.border
'rgba(69,53,75,0.5)' → colors.muted
'rgba(69,53,75,0.6)' → colors.muted

// Spacing
padding: 16 → padding: spacing.md
gap: 12 → gap: spacing.md
marginBottom: 24 → marginBottom: spacing.lg
paddingHorizontal: 16 → paddingHorizontal: spacing.md

// Typography
fontSize: 28, fontWeight: '700' → ...typography.h1
fontSize: 22, fontWeight: '700' → ...typography.h2
fontSize: 18, fontWeight: '600' → ...typography.h3
fontSize: 15, fontWeight: '400' → ...typography.body
fontSize: 13 → ...typography.small
fontSize: 11, textTransform: 'uppercase' → ...typography.label
```

## Pro Tips

1. **Always use theme constants** - Never hardcode colors or spacing
2. **Spread component styles first** - Then override specific properties
3. **Use typography helpers** - Ensures consistent text styling
4. **Status badges** - Use helper function for automatic styling
5. **Responsive spacing** - Use getResponsiveSpacing() for tablet/web
6. **Test on multiple screens** - Ensure consistency across app
7. **Check contrast** - Dark text on light backgrounds, light on dark
8. **Use semantic names** - accent for primary actions, danger for destructive

## Common Mistakes to Avoid

❌ `color: '#1A1611'` → ✅ `color: colors.dark`
❌ `padding: 16` → ✅ `padding: spacing.md`
❌ `fontSize: 15` → ✅ `...typography.body`
❌ Hardcoded status colors → ✅ `getStatusBadgeStyle(status)`
❌ Inconsistent shadows → ✅ `...components.shadow.medium`
❌ Custom button styles → ✅ `...components.button.primary`
