# Video Beautify - iOS Development Build Instructions

## Test on Your iPhone for FREE (No Apple Developer Account Required)

This guide will help you build and run the app on your physical iPhone using Xcode with a free Apple ID.

---

## Prerequisites

1. **Mac computer** with macOS Monterey or later
2. **Xcode 15+** (free from App Store)
3. **iPhone** running iOS 15 or later
4. **USB cable** to connect iPhone to Mac
5. **Apple ID** (free, regular account - NOT Developer account)

---

## Step-by-Step Instructions

### Step 1: Install Dependencies

Open Terminal and navigate to the `frontend` folder:

```bash
cd frontend
npm install
```

### Step 2: Install CocoaPods (if not installed)

```bash
sudo gem install cocoapods
```

### Step 3: Generate iOS Native Project

This creates the native iOS project with all the ML and camera capabilities:

```bash
npx expo prebuild --platform ios --clean
```

Wait for this to complete (may take a few minutes).

### Step 4: Install iOS Dependencies

```bash
cd ios
pod install
cd ..
```

### Step 5: Open in Xcode

```bash
open ios/VideoBeautify.xcworkspace
```

**Important:** Open the `.xcworkspace` file, NOT the `.xcodeproj` file.

### Step 6: Configure Signing (One-time Setup)

1. In Xcode, click on the project name in the left sidebar (blue icon)
2. Select the "VideoBeautify" target
3. Go to the **"Signing & Capabilities"** tab
4. Check ✅ **"Automatically manage signing"**
5. For **Team**: Click the dropdown and select **"Add an Account..."**
6. Sign in with your Apple ID
7. Select your **"Personal Team"** (shows as "Your Name (Personal Team)")

If you see a "Change Bundle Identifier" dialog, click "OK".

### Step 7: Trust Your Developer Certificate on iPhone

**First time only:**
1. Connect your iPhone via USB
2. On iPhone: Go to **Settings → General → VPN & Device Management**
3. Find your Apple ID under "Developer App"
4. Tap it and tap **"Trust"**

### Step 8: Build & Run

1. Connect your iPhone to your Mac via USB
2. In Xcode's top bar, click the device selector (shows "Any iOS Device")
3. Select your iPhone from the list
4. Click the **Play ▶️** button (or press Cmd+R)
5. Wait for the build to complete (first build takes ~5 minutes)
6. The app will install and launch on your iPhone!

---

## Troubleshooting

### "Untrusted Developer" Error
Go to iPhone Settings → General → VPN & Device Management → Trust your developer certificate

### "Could not launch app" Error
1. Disconnect and reconnect your iPhone
2. In Xcode: Product → Clean Build Folder (Cmd+Shift+K)
3. Try building again

### "Signing requires a development team"
Make sure you selected your Personal Team in Step 6

### Build Fails with Pod Errors
```bash
cd ios
pod deintegrate
pod install
cd ..
```
Then try building again.

---

## Important Notes

### Free Account Limitations:
- **App expires after 7 days** - Just rebuild when it expires
- **3 app limit** - You can only have 3 apps installed via free account
- **Some capabilities restricted** - But camera + ML works fine!

### What Works in This Build:
- ✅ Real-time camera with ML segmentation
- ✅ Background blur effect
- ✅ Background color replacement  
- ✅ Real-time beauty filters (brightness, contrast, saturation)
- ✅ Video recording with effects
- ✅ Save to Photos library

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Generate iOS project
npx expo prebuild --platform ios --clean

# Install pods
cd ios && pod install && cd ..

# Open Xcode
open ios/VideoBeautify.xcworkspace

# Clean and rebuild (if issues)
cd ios && pod deintegrate && pod install && cd ..
```

---

## Need Help?

If you encounter issues:
1. Make sure Xcode is fully updated
2. Ensure your iPhone iOS version matches Xcode's supported versions
3. Try restarting Xcode and your iPhone
4. Run `pod install` again after any errors

Enjoy testing your Video Beautify app! 🎥✨
