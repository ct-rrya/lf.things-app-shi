# iOS Installation Guide - Fixing Google OAuth Error

## 🔍 Understanding the Issue

Your app uses **Supabase email/password authentication**, NOT Google OAuth. The error your classmate is seeing is likely due to:

1. iOS build configuration
2. Expo Go limitations
3. Installation method used

---

## ✅ Solution 1: Use Expo Go (Recommended for Testing)

**Best for**: Quick testing, demos, development

### For You (Developer):

1. **Start the development server**:
```bash
npx expo start
```

2. **Share the connection**:
   - You'll see a QR code in terminal
   - Or get the URL (looks like: `exp://192.168.x.x:8081`)
   - Share this with your classmate

### For Your Classmate (iOS User):

1. **Install Expo Go**:
   - Open App Store
   - Search "Expo Go"
   - Install the app

2. **Connect to your app**:
   - Open Expo Go
   - Tap "Scan QR code"
   - Scan the QR code from your terminal
   - OR tap "Enter URL manually" and paste the exp:// URL

3. **App will load**:
   - First load takes 30-60 seconds
   - App runs inside Expo Go
   - All features work normally

**Important**: Your development server must be running and both devices must be on the same WiFi network.

---

## ✅ Solution 2: Build Standalone iOS App

**Best for**: Permanent installation, distribution

### Prerequisites:

1. **Apple Developer Account** (Required)
   - Free account: Can install on your own devices only
   - Paid account ($99/year): Can distribute via TestFlight

2. **EAS CLI installed**:
```bash
npm install -g eas-cli
```

3. **Login to Expo**:
```bash
eas login
```

### Step 1: Configure iOS Build

Update `app.config.js` to ensure proper iOS configuration:

```javascript
export default {
  expo: {
    // ... existing config
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.lf.app',
      buildNumber: '1.0.0',
      // Add this if not present
      infoPlist: {
        NSCameraUsageDescription: 'This app uses the camera to scan QR codes on lost items.',
        NSPhotoLibraryUsageDescription: 'This app needs access to your photo library to upload item photos.',
      },
    },
  },
};
```

### Step 2: Update Supabase Configuration

In your Supabase dashboard:

1. Go to Authentication → URL Configuration
2. Add iOS redirect URL:
   ```
   lf://
   ```
3. Add to "Redirect URLs" list

### Step 3: Build for iOS

**Option A: Internal Distribution (TestFlight)**

```bash
# Build for iOS
eas build --platform ios --profile preview

# This will:
# 1. Ask for Apple credentials
# 2. Create provisioning profile
# 3. Build the app (takes 10-20 minutes)
# 4. Give you a download link
```

**Option B: Development Build (Install directly)**

```bash
# Build development version
eas build --platform ios --profile development

# Register her device first:
eas device:create
# She'll get a link to register her device
```

### Step 4: Install on iOS Device

**Via TestFlight** (if using preview profile):
1. You'll get an IPA file link
2. Upload to TestFlight via App Store Connect
3. Invite testers via email
4. They install via TestFlight app

**Via Direct Install** (if using development profile):
1. Download IPA file from EAS build
2. Install using Apple Configurator or Xcode
3. Or use `eas build:run` command

---

## ✅ Solution 3: Web Version (Easiest Alternative)

Since your app supports web, she can use it in Safari:

### Deploy to Vercel (if not already):

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts
```

### Or use Expo web:

```bash
# Start web version
npx expo start --web

# Share the localhost URL (if on same network)
# Or deploy to a hosting service
```

---

## 🔧 Troubleshooting

### Error: "Google OAuth not configured"

**Cause**: iOS is detecting OAuth-related code even though you're not using it.

**Fix**: This is likely a false positive. Your app uses Supabase email/password auth, which doesn't require Google OAuth.

**Verify in code**:
```javascript
// Your auth code (app/index.js)
await supabase.auth.signInWithPassword({ email, password });
// ✅ This is email/password, NOT Google OAuth
```

### Error: "App not trusted"

**Cause**: iOS doesn't trust the developer certificate.

**Fix**:
1. Go to Settings → General → VPN & Device Management
2. Find your developer profile
3. Tap "Trust"

### Error: "Unable to install"

**Cause**: Provisioning profile doesn't include her device.

**Fix**:
1. Register her device UDID
2. Rebuild with updated provisioning profile

---

## 📱 Quick Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Expo Go** | ✅ Instant<br>✅ No build needed<br>✅ Free | ❌ Requires dev server<br>❌ Same network | Testing, Demos |
| **TestFlight** | ✅ Standalone<br>✅ Easy distribution<br>✅ Professional | ❌ Requires Apple account<br>❌ 20min build time | Beta testing |
| **Development Build** | ✅ Full features<br>✅ Standalone | ❌ Complex setup<br>❌ Device registration | Development |
| **Web Version** | ✅ No installation<br>✅ Works anywhere | ❌ Limited features<br>❌ No camera on web | Quick access |

---

## 🎯 Recommended Approach for Your Defense

### For Demo/Testing (Next Few Days):

**Use Expo Go**:
1. Start dev server: `npx expo start`
2. Share QR code with classmates
3. They scan with Expo Go
4. Works immediately

**Advantages**:
- No build time
- No Apple account needed
- Easy to update
- Perfect for demos

### For Permanent Distribution (After Defense):

**Build with EAS**:
1. Get Apple Developer account
2. Build iOS app: `eas build --platform ios`
3. Distribute via TestFlight
4. Professional deployment

---

## 🚀 Quick Start for Your Classmate

**Right Now (5 minutes)**:

1. **You**: Run `npx expo start` on your laptop
2. **You**: Share the QR code (screenshot or show screen)
3. **Her**: Install "Expo Go" from App Store
4. **Her**: Open Expo Go and scan QR code
5. **Done**: App loads and works!

**Requirements**:
- Both on same WiFi network
- Your laptop stays on with server running
- Takes 30-60 seconds to load first time

---

## 💡 Why This Happens

Your app doesn't actually use Google OAuth. The error might appear because:

1. **Supabase includes OAuth libraries** - Even if you don't use them, they're in the package
2. **iOS is strict** - Detects OAuth-related code and requires configuration
3. **Build vs Development** - Different behavior in Expo Go vs standalone builds

**Your actual auth code**:
```javascript
// app/index.js - Line 45
await supabase.auth.signInWithPassword({
  email: email.trim(),
  password,
});
```

This is **email/password authentication**, not Google OAuth!

---

## 📞 Need Help?

If issues persist:

1. **Check Expo Go version** - Update to latest
2. **Verify network** - Same WiFi for both devices
3. **Check firewall** - Allow Expo on your network
4. **Try web version** - `npx expo start --web`

---

## ✅ Checklist for iOS Installation

### Using Expo Go:
- [ ] Expo Go installed on iOS device
- [ ] Development server running (`npx expo start`)
- [ ] Both devices on same WiFi
- [ ] QR code scanned or URL entered
- [ ] App loads successfully

### Using Standalone Build:
- [ ] Apple Developer account ready
- [ ] EAS CLI installed
- [ ] iOS build completed
- [ ] App installed on device
- [ ] Device trusted in Settings

---

**Bottom Line**: For your defense and testing, use **Expo Go**. It's the fastest and easiest solution. Build a standalone iOS app later if you want permanent distribution.

