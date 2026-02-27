import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

// Web fallback component
function VisionCameraViewWeb({ children, onCameraReady }: VisionCameraViewProps) {
  useEffect(() => {
    // Call onCameraReady for consistency
    onCameraReady?.();
  }, [onCameraReady]);

  return (
    <View style={styles.container}>
      <View style={styles.webFallback}>
        <Ionicons name="videocam-off" size={64} color="#888" />
        <Text style={styles.webFallbackTitle}>Camera Preview</Text>
        <Text style={styles.webFallbackText}>
          Real-time camera effects require a native device.
        </Text>
        <Text style={styles.webFallbackSubtext}>
          Use Expo Go on your phone to test this feature.
        </Text>
      </View>
      {children}
    </View>
  );
}

// Native implementation - only loaded on iOS/Android
function VisionCameraViewNative({
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
  // Dynamic imports for native-only modules
  const { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } = require('react-native-vision-camera');
  const { useSharedValue, runOnJS } = require('react-native-reanimated');
  
  const cameraRef = useRef<any>(null);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(facing);
  
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [fps, setFps] = useState(0);
  
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
  const frameProcessor = useFrameProcessor((frame: any) => {
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

    // Note: ML Kit segmentation would be called here
    // For now, we just demonstrate the frame processor is working
  }, [backgroundType, backgroundColor]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={48} color="#4A90E2" />
          <Text style={styles.text}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={48} color="#FF3B30" />
          <Text style={styles.text}>Camera permission denied</Text>
          <Text style={styles.subText}>Please enable camera access in settings</Text>
        </View>
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

// Main export - platform-specific rendering
export default function VisionCameraView(props: VisionCameraViewProps) {
  // On web, show fallback
  if (Platform.OS === 'web') {
    return <VisionCameraViewWeb {...props} />;
  }
  
  // On native, use the full camera implementation
  return <VisionCameraViewNative {...props} />;
}

// Export ref methods for parent to control camera
export const getCameraRef = (ref: React.RefObject<any>) => ({
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  subText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  permissionContainer: {
    alignItems: 'center',
    padding: 32,
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
  webFallback: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    margin: 20,
  },
  webFallbackTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  webFallbackText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  webFallbackSubtext: {
    color: '#4A90E2',
    fontSize: 13,
    textAlign: 'center',
  },
});
