# Console Warnings & Errors - Quick Fix Guide

## Current Issues

### 1. Authentication Error (400) ❌ CRITICAL
```
Failed to load resource: the server responded with a status of 400
```

**Cause**: Invalid login credentials (wrong email or password)

**Fix**: 
- Check that you're using the correct email and password
- Make sure the account exists (sign up first if needed)
- Verify email format is correct
- Ensure password is at least 6 characters

---

### 2. Shadow Props Deprecation ⚠️ NON-CRITICAL
```
"shadow*" style props are deprecated. Use "boxShadow"
```

**Cause**: React Native Web prefers CSS-style `boxShadow` over individual shadow props

**Impact**: Works fine, just shows warnings in console

**Fix**: Replace shadow props with boxShadow in styles
```javascript
// OLD (deprecated)
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,

// NEW (recommended for web)
boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
```

**Note**: Keep both for cross-platform compatibility:
```javascript
// Mobile
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 2,
// Web
...(Platform.OS === 'web' && {
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
}),
```

---

### 3. TextShadow Props Deprecation ⚠️ NON-CRITICAL
```
"textShadow*" style props are deprecated. Use "textShadow"
```

**Cause**: Same as above, React Native Web prefers CSS-style

**Fix**: Replace with CSS textShadow
```javascript
// OLD
textShadowColor: 'rgba(0, 0, 0, 0.1)',
textShadowOffset: { width: 0, height: 1 },
textShadowRadius: 2,

// NEW
textShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
```

---

### 4. PointerEvents Deprecation ⚠️ NON-CRITICAL
```
props.pointerEvents is deprecated. Use style.pointerEvents
```

**Cause**: pointerEvents should be in style object, not as a prop

**Fix**: Move to style
```javascript
// OLD
<View pointerEvents="none">

// NEW
<View style={{ pointerEvents: 'none' }}>
```

---

### 5. Expo Notifications Warning ℹ️ INFORMATIONAL
```
[expo-notifications] Listening to push token changes is not yet fully supported on web
```

**Cause**: Push notifications aren't fully supported on web platform

**Impact**: None - this is expected behavior

**Fix**: None needed, or conditionally disable on web:
```javascript
if (Platform.OS !== 'web') {
  // Setup push notifications
}
```

---

## Priority

### 🔴 High Priority (Fix Now)
1. **Authentication Error (400)** - User cannot sign in

### 🟡 Medium Priority (Fix When Convenient)
2. Shadow props deprecation - Clean up warnings
3. TextShadow props deprecation - Clean up warnings
4. PointerEvents deprecation - Clean up warnings

### 🟢 Low Priority (Ignore)
5. Expo notifications warning - Expected on web

---

## Quick Action Plan

### Immediate (Fix Authentication)
1. Verify Supabase credentials in `.env`
2. Check that user account exists
3. Try signing up a new account
4. Test with correct credentials

### Later (Clean Up Warnings)
1. Search for `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` in styles
2. Replace with `boxShadow` for web (keep both for cross-platform)
3. Search for `textShadowColor`, `textShadowOffset`, `textShadowRadius`
4. Replace with `textShadow` for web
5. Search for `pointerEvents` as prop
6. Move to style object

---

## Testing After Fixes

1. **Authentication**: Try signing in with valid credentials
2. **Styles**: Check that shadows still appear correctly on mobile and web
3. **Console**: Verify warnings are gone

---

## Notes

- The deprecation warnings don't affect functionality
- They're just React Native Web's way of encouraging CSS-compatible syntax
- The authentication error is the only real issue that needs immediate attention
- All other warnings can be fixed gradually without breaking anything
