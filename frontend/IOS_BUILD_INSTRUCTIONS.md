# Video Beautify - iOS Local Build Instructions

## QUICK START (Copy & Paste Ready)

Open Terminal on your Mac and run these commands **one at a time**:

### Step 1: Download Fresh Code from Emergent
1. Click the **"Code"** button in the Emergent interface
2. Select **"Download"** to get the latest version
3. Unzip the downloaded file
4. Open Terminal and navigate to the `frontend` folder:
   ```bash
   cd ~/Downloads/your-project-folder/frontend
   ```

### Step 2: Complete Clean Build
Run each command and wait for it to finish before running the next:

```bash
# 1. Remove old build artifacts
rm -rf node_modules
rm -rf ios
rm -rf .expo

# 2. Install fresh dependencies
npm install

# 3. Generate iOS native project
npx expo prebuild --platform ios --clean

# 4. Install CocoaPods dependencies
cd ios && pod install && cd ..

# 5. Open in Xcode
open ios/VideoBeautify.xcworkspace
```

---

## In Xcode:

### First Time Setup (Signing)
1. Click the **blue project icon** in the left sidebar
2. Select **"VideoBeautify"** target
3. Go to **"Signing & Capabilities"** tab
4. Check **"Automatically manage signing"**
5. Click **Team** dropdown → **"Add an Account..."**
6. Sign in with your Apple ID
7. Select **"Your Name (Personal Team)"**

### Build & Run
1. Connect your iPhone via USB cable
2. In Xcode's top bar, click the device dropdown → Select your iPhone
3. Click **Play ▶️** button (or press Cmd+R)
4. Wait for build to complete (~3-5 minutes first time)

---

## Trust Certificate on iPhone (First Time Only)
After first install, go to:
**Settings → General → VPN & Device Management → Your Developer App → Trust**

---

## Troubleshooting

### "Could not resolve dependencies" or Pod errors
```bash
cd ios
pod deintegrate
pod cache clean --all
pod install
cd ..
```

### Build fails with signing errors
- Make sure you selected your Personal Team
- Try: Product → Clean Build Folder (Cmd+Shift+K) in Xcode

### "Untrusted Developer" on iPhone
Go to Settings → General → VPN & Device Management → Trust your certificate

### Still having issues?
1. Make sure Xcode is updated to latest version
2. Make sure Command Line Tools are installed: `xcode-select --install`
3. Try restarting your Mac

---

## What This App Does (Current Version)
- ✅ Video recording with front/back camera
- ✅ Save videos to Photos library
- ✅ Basic camera controls (flip, audio toggle)
- ✅ Video preview before saving

**Note:** Background effects and touch-up filters are currently in preview mode. Full ML-powered effects will be added in a future update.

---

## Free Apple ID Limitations
- Apps expire after 7 days (just rebuild when needed)
- Maximum 3 apps can be installed at once
- Some advanced features may be restricted

Enjoy testing! 🎥✨
