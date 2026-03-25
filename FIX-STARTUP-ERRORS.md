# Fix Startup Errors - CTU Daanbantayan App

## Error: "Identifier 'useState' has already been declared"

This is a **Metro bundler cache issue**, not an actual code problem. The code is correct.

### Quick Fix (Recommended)

**Windows:**
```powershell
# Run the provided batch file
start-clean.bat
```

**Or manually:**
```powershell
npx expo start --clear
```

### Full Fix (If quick fix doesn't work)

**Step 1: Stop the server**
- Press `Ctrl+C` in the terminal running Expo

**Step 2: Clear all caches**
```powershell
# Windows PowerShell
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
```

**Step 3: Start fresh**
```powershell
npx expo start --clear
```

### Nuclear Option (If nothing else works)

```powershell
# Delete everything and reinstall
Remove-Item -Recurse -Force .expo, node_modules\.cache, node_modules
npm install
npx expo start --clear
```

## Other Common Errors

### Error: "Unable to resolve ../../lib/..."

**Cause**: Missing library files or incorrect paths

**Fix**:
1. Check that these files exist:
   - `lib/supabase.js`
   - `lib/ctuConstants.js`
   - `lib/categoryForms.js`
   - `lib/aiMatching.js`

2. If missing, they should be in your project. Check the file tree.

3. Clear cache and restart:
```powershell
npx expo start --clear
```

### Error: "Route './chat/[match_id].js' is missing default export"

**Cause**: File exists but doesn't export a React component

**Fix**: This is just a warning, not a critical error. The app will still work.

To fix the warning, ensure `app/chat/[match_id].js` has:
```javascript
export default function ChatScreen() {
  // component code
}
```

## Verification Steps

After clearing cache and restarting:

1. **Check the terminal output**
   - Should see "Metro waiting on..."
   - No red error messages

2. **Try the app**
   - Press `a` for Android
   - Press `i` for iOS
   - Press `w` for web

3. **Test registration**
   - Should see splash screen
   - Login/register screen should load
   - No import errors

## Prevention

To avoid cache issues in the future:

1. **Always use `--clear` flag when having issues**:
   ```powershell
   npx expo start --clear
   ```

2. **Restart after major changes**:
   - After installing new packages
   - After modifying many files
   - After pulling from git

3. **Use the provided script**:
   ```powershell
   # Windows
   start-clean.bat
   ```

## Still Having Issues?

### Check Node/NPM versions
```powershell
node --version  # Should be 16+ or 18+
npm --version   # Should be 8+
```

### Reinstall dependencies
```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

### Check for file corruption
- Ensure all files are UTF-8 encoded
- No hidden characters
- Line endings are consistent (LF or CRLF)

### Verify imports in auth.js
Open `app/auth.js` and verify line 1 is:
```javascript
import { useState } from 'react';
```

Should only appear ONCE at the top of the file.

## Success Indicators

You'll know it's working when:
- ✅ No red errors in terminal
- ✅ "Metro waiting on..." message appears
- ✅ QR code displays (for mobile)
- ✅ App loads without errors
- ✅ Splash screen appears

## Quick Reference

| Problem | Solution |
|---------|----------|
| Cache errors | `npx expo start --clear` |
| Import errors | Clear cache + restart |
| Missing files | Check file exists, clear cache |
| Won't start | Delete node_modules, reinstall |
| Persistent issues | Restart computer, clear all caches |

## Contact

If you've tried everything and still have issues:
1. Check the error message carefully
2. Search for the specific error online
3. Check Expo documentation
4. Verify all files from CTU implementation are present

---

**Remember**: Most startup errors are cache-related and fixed with `npx expo start --clear`
