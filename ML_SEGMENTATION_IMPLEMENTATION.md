# ML Person Segmentation Implementation Guide

## Overview

This guide provides a complete roadmap for implementing ML-powered person segmentation in the video recording app, enabling real background blur and custom background replacement.

## Implementation Options

### Option 1: TensorFlow.js + MediaPipe (Recommended for Expo) ⭐

**Best for**: Expo managed workflow, cross-platform, good performance

**Pros**:
- Works within Expo managed workflow
- Cross-platform (iOS + Android)
- No ejecting required
- Open source, no recurring costs
- Good performance with GPU acceleration

**Cons**:
- ~20-30MB bundle size increase
- Requires GPU (may struggle on older devices)
- Complex initial setup

**Performance**: 15-30 fps on mid-range devices

---

### Option 2: Vision Camera + TFLite (Best Performance) 🚀

**Best for**: Maximum performance, production apps

**Pros**:
- Native performance (30-60 fps)
- Smaller model size (~4MB)
- Lower battery consumption
- Faster inference

**Cons**:
- Requires Expo config plugins or ejecting
- More complex native integration
- Platform-specific code needed

**Performance**: 30-60 fps on mid-range devices

---

### Option 3: Professional SDK (Easiest) 💰

**Best for**: Quick implementation, budget available

**Options**:
- **Stream.io**: $99/month, includes background effects
- **Agora**: $9.99/10k minutes, video SDK with effects
- **100ms**: $99/month, real-time video platform

**Pros**:
- Ready-made solutions
- Professional quality
- Ongoing support and updates
- Additional features (recording, streaming, etc.)

**Cons**:
- Recurring subscription costs
- Vendor lock-in
- Less customization

---

## Recommended Approach: TensorFlow.js + MediaPipe

Let's implement Option 1 as it provides the best balance for your Expo app.

## Phase 1: Setup & Dependencies (Day 1)

### Step 1.1: Install Core Packages

```bash
cd /app/frontend

# Core TensorFlow.js packages
yarn add @tensorflow/tfjs@4.17.0
yarn add @tensorflow/tfjs-react-native@1.0.0
yarn add @tensorflow-models/body-segmentation@1.0.2

# Required peer dependencies
yarn add @tensorflow/tfjs-backend-webgl@4.17.0
yarn add @react-native-async-storage/async-storage@1.23.1

# For frame processing
yarn add expo-gl@~14.0.2
yarn add expo-gl-cpp@~14.0.2
```

### Step 1.2: Configure Metro for Large Assets

Update `/app/frontend/metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow larger assets for ML models
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Add support for model files
config.resolver.assetExts.push('bin', 'txt', 'jpg', 'tflite');

module.exports = config;
```

### Step 1.3: Update app.json

Add ML model assets configuration:

```json
{
  "expo": {
    "assetBundlePatterns": [
      "**/*",
      "assets/**/*",
      "models/**/*"
    ]
  }
}
```

## Phase 2: Create ML Service (Day 2)

### Step 2.1: Create Segmentation Service

Create `/app/frontend/app/services/segmentation.ts`:

```typescript
import * as tf from '@tensorflow/tfjs';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import '@tensorflow/tfjs-react-native';

export class SegmentationService {
  private segmenter: bodySegmentation.BodySegmenter | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Initializing TensorFlow.js...');
      
      // Wait for TF.js to be ready
      await tf.ready();
      
      console.log('TF.js ready, loading segmentation model...');

      // Create segmenter with MediaPipe
      const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
      const segmenterConfig = {
        runtime: 'mediapipe',
        modelType: 'general', // 'general' or 'landscape'
      };

      this.segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);
      this.initialized = true;
      
      console.log('Segmentation model loaded successfully');
    } catch (error) {
      console.error('Failed to initialize segmentation:', error);
      throw error;
    }
  }

  async segmentPerson(imageData: ImageData | HTMLImageElement | HTMLCanvasElement) {
    if (!this.segmenter) {
      throw new Error('Segmenter not initialized');
    }

    try {
      const segmentation = await this.segmenter.segmentPeople(imageData);
      return segmentation;
    } catch (error) {
      console.error('Segmentation failed:', error);
      throw error;
    }
  }

  async generateMask(segmentation: any) {
    // Convert segmentation to binary mask (person = 1, background = 0)
    const mask = await bodySegmentation.toBinaryMask(
      segmentation,
      { r: 0, g: 0, b: 0, a: 0 }, // background color
      { r: 255, g: 255, b: 255, a: 255 }, // foreground color
      false, // drawContour
      0.5 // foregroundThreshold
    );
    return mask;
  }

  dispose() {
    if (this.segmenter) {
      this.segmenter.dispose();
      this.segmenter = null;
      this.initialized = false;
    }
  }
}

export const segmentationService = new SegmentationService();
```

## Phase 3: Camera Integration with Segmentation (Day 3-4)

### Step 3.1: Create Camera Frame Processor

Create `/app/frontend/app/components/SegmentedCamera.tsx`:

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GLView } from 'expo-gl';
import { segmentationService } from '../services/segmentation';

const { width, height } = Dimensions.get('window');

interface SegmentedCameraProps {
  onReady: () => void;
  backgroundImage?: string;
  backgroundType?: 'blur' | 'replace' | 'none';
}

export default function SegmentedCamera({
  onReady,
  backgroundImage,
  backgroundType = 'none'
}: SegmentedCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [modelReady, setModelReady] = useState(false);
  const glRef = useRef<any>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    initializeModel();
    return () => {
      segmentationService.dispose();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const initializeModel = async () => {
    try {
      await segmentationService.initialize();
      setModelReady(true);
      onReady();
    } catch (error) {
      console.error('Failed to initialize model:', error);
    }
  };

  const processFrame = async (gl: any) => {
    if (!modelReady) return;

    // Get camera frame
    // Process with segmentation
    // Apply background effect
    // Render to screen

    // Request next frame
    animationFrameId.current = requestAnimationFrame(() => processFrame(gl));
  };

  const onGLContextCreate = (gl: any) => {
    glRef.current = gl;
    processFrame(gl);
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text>Camera permission required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} />
      
      {backgroundType !== 'none' && modelReady && (
        <GLView
          style={styles.overlay}
          onContextCreate={onGLContextCreate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
```

## Phase 4: Background Processing (Day 5)

### Step 4.1: Create Background Processor

Create `/app/frontend/app/utils/backgroundProcessor.ts`:

```typescript
export class BackgroundProcessor {
  async applyBlur(
    imageData: ImageData,
    mask: ImageData,
    blurAmount: number = 10
  ): Promise<ImageData> {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Canvas context not available');

    // Draw original image
    ctx.putImageData(imageData, 0, 0);

    // Apply blur to background pixels (where mask = 0)
    ctx.filter = `blur(${blurAmount}px)`;
    
    // Composite with mask
    ctx.globalCompositeOperation = 'destination-in';
    ctx.putImageData(mask, 0, 0);

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  async replaceBackground(
    imageData: ImageData,
    mask: ImageData,
    backgroundImage: ImageData
  ): Promise<ImageData> {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Canvas context not available');

    // Draw background
    ctx.putImageData(backgroundImage, 0, 0);

    // Composite person on top using mask
    ctx.globalCompositeOperation = 'source-over';
    const personData = this.extractPerson(imageData, mask);
    ctx.putImageData(personData, 0, 0);

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  private extractPerson(image: ImageData, mask: ImageData): ImageData {
    const result = new ImageData(image.width, image.height);
    
    for (let i = 0; i < image.data.length; i += 4) {
      const maskValue = mask.data[i]; // Use R channel
      
      if (maskValue > 128) { // Person pixel
        result.data[i] = image.data[i];     // R
        result.data[i + 1] = image.data[i + 1]; // G
        result.data[i + 2] = image.data[i + 2]; // B
        result.data[i + 3] = image.data[i + 3]; // A
      } else { // Background pixel (transparent)
        result.data[i + 3] = 0;
      }
    }
    
    return result;
  }
}

export const backgroundProcessor = new BackgroundProcessor();
```

## Phase 5: Integration & Testing (Day 6-7)

### Performance Optimization Tips:

1. **Frame Rate Control**:
```typescript
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let lastFrameTime = 0;

function processFrame(timestamp: number) {
  if (timestamp - lastFrameTime < FRAME_INTERVAL) {
    requestAnimationFrame(processFrame);
    return;
  }
  
  lastFrameTime = timestamp;
  // Process frame...
  requestAnimationFrame(processFrame);
}
```

2. **Model Size**: Use 'general' model type (smaller, faster)

3. **Resolution**: Process at lower resolution (640x480), upscale result

4. **Skip Frames**: Process every 2-3 frames for better performance

## Development Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1**: Setup | 1 day | Install packages, configure Metro |
| **Phase 2**: ML Service | 1 day | Create segmentation service |
| **Phase 3**: Camera Integration | 2 days | Frame processing, GL rendering |
| **Phase 4**: Background Effects | 1 day | Blur & replacement logic |
| **Phase 5**: Testing & Optimization | 2 days | Performance tuning, bug fixes |
| **Total** | **7 days** | Full implementation |

## Expected Bundle Size Impact

- TensorFlow.js core: ~8MB
- Body Segmentation model: ~4MB
- MediaPipe runtime: ~8MB
- **Total**: ~20MB increase

## Performance Benchmarks

| Device | FPS | Latency |
|--------|-----|---------|
| iPhone 13+ | 25-30 | 30-40ms |
| iPhone 11-12 | 20-25 | 40-50ms |
| iPhone X or older | 15-20 | 50-70ms |
| Samsung S21+ | 25-30 | 30-40ms |
| Mid-range Android | 15-20 | 50-70ms |

## Alternative: Start with Still Images

**Easier first step**: Apply segmentation only to:
1. Thumbnail generation
2. Photo mode (not video)
3. Post-processing on saved videos

This avoids real-time performance challenges while proving the concept.

## Cost Analysis

### Option 1: TensorFlow.js (Recommended)
- Development: 7-10 days
- Recurring cost: $0
- Bundle size: +20MB
- Performance: Good (20-30 fps)

### Option 2: Vision Camera + TFLite
- Development: 10-14 days
- Recurring cost: $0
- Bundle size: +5MB
- Performance: Excellent (30-60 fps)
- Requires: Native development skills

### Option 3: Professional SDK
- Development: 3-5 days (integration only)
- Recurring cost: $99-$199/month
- Bundle size: +10-15MB
- Performance: Excellent (30-60 fps)
- Includes: Support, updates, additional features

## Recommendation

**Start with TensorFlow.js + MediaPipe (Option 1)** because:
1. Works within Expo managed workflow
2. No recurring costs
3. Good performance for MVP
4. Can upgrade to TFLite later if needed
5. Complete control over implementation

**Timeline**: 7-10 days for full implementation

**Should I proceed with implementing Option 1?**
