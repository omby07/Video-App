# EAS Build Instructions - Video Beautify

## Overview
This app uses native ML libraries that require a custom build (not Expo Go). 
We use **EAS Build** to build in the cloud - no local Xcode setup needed!

---

## Step 1: Create an Expo Account

1. Go to **https://expo.dev/signup**
2. Create a free account
3. Verify your email

---

## Step 2: Install EAS CLI (on your Mac)

Open Terminal and run:

```bash
npm install -g eas-cli
```

Then login:

```bash
eas login
```

Enter your Expo account credentials.

---

## Step 3: Download the Project Code

1. Click **"Code"** button in Emergent
2. Select **"Download"**
3. Unzip the file
4. Open Terminal and navigate to the frontend folder:

```bash
cd ~/Downloads/[your-project-folder]/frontend
```

---

## Step 4: Install Dependencies

```bash
npm install
```

---

## Step 5: Configure EAS Build

Run the setup command:

```bash
eas build:configure
```

This will link your project to your Expo account.

---

## Step 6: Build for iOS

### Option A: Development Build (for testing)

```bash
eas build --platform ios --profile development
```

This creates a build you can install via:
- **Internal distribution** (direct download to your device)
- Requires registering your device UDID first

### Option B: Preview Build (TestFlight)

```bash
eas build --platform ios --profile preview
```

Then submit to TestFlight:

```bash
eas submit --platform ios
```

---

## Step 7: Install on Your iPhone

### For Development/Preview builds:

1. EAS will email you when the build is ready
2. Open the email on your iPhone
3. Tap the download link
4. Install the app

### For TestFlight:

1. Download **TestFlight** app from the App Store
2. Accept the beta invitation
3. Install from TestFlight

---

## Registering Your Device (for Development builds)

If you see "Device not registered" error:

1. Run: `eas device:create`
2. Follow the prompts to register your iPhone
3. Rebuild

---

## Apple Developer Account

**Free Account:** 
- Apps expire after 7 days
- Limited to 100 installs
- No App Store submission

**Paid Account ($99/year):**
- Apps don't expire
- TestFlight access
- App Store submission

For soft-launch testing, the free account works fine!

---

## Troubleshooting

### "Build failed" error
- Check the build logs on expo.dev
- Common issues: missing native dependencies, code signing

### "No devices registered"
- Run `eas device:create` and follow the prompts

### "Code signing error"
- EAS handles this automatically for most cases
- For App Store, you'll need an Apple Developer account

---

## What's Included in the Build

✅ **react-native-vision-camera** - Advanced camera with frame processors
✅ **@shopify/react-native-skia** - GPU-accelerated graphics
✅ **react-native-reanimated** - Smooth animations
✅ **react-native-worklets-core** - Background processing

These enable:
- Background blur with ML edge detection
- Background replacement
- Touch-up filters (brightness, contrast, saturation)
- Smooth 60fps camera preview

---

## Quick Commands Reference

```bash
# Login to EAS
eas login

# Build for iOS (development)
eas build --platform ios --profile development

# Build for iOS (preview/TestFlight)
eas build --platform ios --profile preview

# Build for iOS (production)
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios

# Register a device
eas device:create

# View build status
eas build:list
```

---

## Need Help?

- **EAS Docs:** https://docs.expo.dev/build/introduction/
- **Vision Camera:** https://react-native-vision-camera.com/
- **Skia:** https://shopify.github.io/react-native-skia/

Happy building! 🚀
