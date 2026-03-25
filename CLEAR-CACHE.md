# Clear Cache and Restart

If you're seeing errors like "Identifier 'useState' has already been declared", follow these steps:

## Windows (PowerShell/CMD)

```powershell
# Stop the Metro bundler (Ctrl+C)

# Clear Expo cache
Remove-Item -Recurse -Force .expo

# Clear Metro cache
Remove-Item -Recurse -Force node_modules\.cache

# Clear watchman (if installed)
watchman watch-del-all

# Start fresh
npx expo start --clear
```

## Alternative: One-line command

```powershell
Remove-Item -Recurse -Force .expo, node_modules\.cache -ErrorAction SilentlyContinue; npx expo start --clear
```

## Mac/Linux

```bash
# Stop the Metro bundler (Ctrl+C)

# Clear all caches
rm -rf .expo node_modules/.cache
watchman watch-del-all  # if watchman is installed

# Start fresh
npx expo start --clear
```

## If issues persist

1. **Full clean**:
```powershell
Remove-Item -Recurse -Force .expo, node_modules\.cache, node_modules
npm install
npx expo start --clear
```

2. **Check for duplicate imports**:
   - Open `app/auth.js`
   - Ensure `useState` is only imported once at the top
   - Should be: `import { useState } from 'react';`

3. **Restart your editor** (VS Code, etc.)

4. **Check file encoding**:
   - Ensure all files are UTF-8 encoded
   - No hidden characters

## Common Causes

- Metro bundler cache corruption
- Expo cache issues
- File watcher issues
- Duplicate imports (check your files)
- Node modules corruption

## Quick Fix

The fastest solution is usually:
```powershell
npx expo start --clear
```

This clears the Metro bundler cache and restarts the development server.
