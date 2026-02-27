import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Image } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { Worklets } from 'react-native-worklets-core';
import { getSelfieSegments } from 'react-native-vision-camera-selfie-segmentation';

interface VisionCameraViewProps {
  facing: 'front' | 'back';
  audioEnabled?: boolean;
  backgroundType?: 'none' | 'blur' | 'color' | 'image';
  backgroundColor?: { r: number; g: number; b: number };
  backgroundImage?: string;
  isRecording?: boolean;
  onCameraReady?: () => void;
  showFPS?: boolean;
  children?: React.ReactNode;
}

export default function VisionCameraView({
  facing,
  audioEnabled = true,
  backgroundType = 'none',
  backgroundColor,
  backgroundImage,
  isRecording = false,
  onCameraReady,
  showFPS = false,
  children,
}: VisionCameraViewProps) {
  const cameraRef = useRef<Camera>(null);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(facing);
  
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [fps, setFps] = useState(0);
  const [segmentedImage, setSegmentedImage] = useState<string>('');
  
  const frameCount = useSharedValue(0);
  const lastFpsUpdate = useSharedValue(Date.now());

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const handleCameraInitialized = useCallback(() => {
    console.log('[VisionCamera] Camera initialized');
    setIsCameraReady(true);
    onCameraReady?.();
  }, [onCameraReady]);

  const updateFPS = useCallback((newFps: number) => {
    setFps(newFps);
  }, []);

  // Frame Processor - runs on every frame
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    // Only process if effects are enabled
    if (backgroundType === 'none') {
      return;
    }

    // Count frames for FPS
    frameCount.value++;
    const now = Date.now();
    const timeSinceLastUpdate = now - lastFpsUpdate.value;
    
    if (timeSinceLastUpdate >= 1000) {
      const currentFps = Math.round((frameCount.value * 1000) / timeSinceLastUpdate);
      runOnJS(updateFPS)(currentFps);
      frameCount.value = 0;
      lastFpsUpdate.value = now;
    }

    // TODO: ML Kit segmentation will be added here
    // For now, just counting frames to verify frame processor works
    
    // Debug log every 30 frames
    if (frameCount.value % 30 === 0) {
      console.log(`[VisionCamera] Processing frame at ${currentFps} fps`);
    }
  }, [backgroundType, backgroundColor, backgroundImage]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission denied</Text>
        <Text style={styles.subText}>Please enable camera access in settings</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.text}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        video={true}
        audio={audioEnabled}
        frameProcessor={backgroundType !== 'none' ? frameProcessor : undefined}
        onInitialized={handleCameraInitialized}
        pixelFormat="yuv"
        fps={30}
      />

      {/* Overlay children (UI controls) */}
      {children}

      {/* Camera initializing indicator */}
      {!isCameraReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Initializing camera...</Text>
        </View>
      )}

      {/* FPS Counter */}
      {showFPS && isCameraReady && backgroundType !== 'none' && (
        <View style={styles.fpsCounter}>
          <Text style={styles.fpsText}>{fps} FPS</Text>
          <Text style={styles.fpsLabel}>Frame Processor</Text>
        </View>
      )}

      {/* Effect Status */}
      {isCameraReady && backgroundType !== 'none' && (
        <View style={styles.effectBadge}>
          <Text style={styles.effectText}>
            {backgroundType === 'blur' && '🌫️ Blur'}
            {backgroundType === 'color' && '🎨 Color BG'}
            {backgroundType === 'image' && '🖼️ Custom BG'}
          </Text>
        </View>
      )}
    </View>
  );
}

// Export ref methods for parent to control camera
export const getCameraRef = (ref: React.RefObject<Camera>) => ({
  startRecording: async (options: any) => {
    if (ref.current) {
      await ref.current.startRecording(options);
    }
  },
  stopRecording: async () => {
    if (ref.current) {
      await ref.current.stopRecording();
    }
  },
  takePhoto: async (options: any) => {
    if (ref.current) {
      return await ref.current.takePhoto(options);
    }
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  fpsCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  fpsText: {
    color: '#7ED321',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  fpsLabel: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  effectBadge: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: 'rgba(74, 144, 226, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  effectText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
