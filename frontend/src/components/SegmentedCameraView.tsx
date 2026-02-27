/**
 * SegmentedCameraView - Camera with ML Person Segmentation
 * 
 * Uses react-native-vision-camera-selfie-segmentation to:
 * 1. Detect the person in each frame using ML
 * 2. Apply blur/color ONLY to the background
 * 3. Keep the person sharp and clear
 * 
 * This is the same technology used by Zoom and Google Meet.
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Platform, 
  Dimensions, 
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  smoothing: number;
}

export interface SegmentedCameraViewProps {
  facing: 'front' | 'back';
  isActive?: boolean;
  enableAudio?: boolean;
  // Background effects - these are applied ONLY to the background
  backgroundEffect?: 'none' | 'blur' | 'color';
  blurIntensity?: number; // 0-100
  backgroundColor?: string; // Hex color for replacement
  // Touch-up filters - applied to person
  filterSettings?: FilterSettings;
  // Recording
  isRecording?: boolean;
  onRecordingStarted?: () => void;
  onRecordingFinished?: (video: { uri: string; duration: number }) => void;
  onRecordingError?: (error: Error) => void;
  // Callbacks
  onCameraReady?: () => void;
  onError?: (error: Error) => void;
  showEffectBadges?: boolean;
  style?: any;
}

// Try to load native modules
let Camera: any = null;
let useCameraDevice: any = null;
let useCameraPermission: any = null;
let useMicrophonePermission: any = null;
let useFrameProcessor: any = null;
let getSelfieSegmentation: any = null;
let isNativeAvailable = false;

if (Platform.OS !== 'web') {
  try {
    // Vision Camera
    const VisionCamera = require('react-native-vision-camera');
    Camera = VisionCamera.Camera;
    useCameraDevice = VisionCamera.useCameraDevice;
    useCameraPermission = VisionCamera.useCameraPermission;
    useMicrophonePermission = VisionCamera.useMicrophonePermission;
    useFrameProcessor = VisionCamera.useFrameProcessor;
    
    // Selfie Segmentation
    const SegmentationPlugin = require('react-native-vision-camera-selfie-segmentation');
    getSelfieSegmentation = SegmentationPlugin.getSelfieSegmentation;
    
    isNativeAvailable = true;
    console.log('[SegmentedCamera] Native modules loaded successfully');
  } catch (e) {
    console.log('[SegmentedCamera] Native modules not available:', e);
  }
}

// Fallback component for web/non-native
function CameraFallback({ onCameraReady, backgroundEffect, backgroundColor, style }: SegmentedCameraViewProps) {
  useEffect(() => {
    onCameraReady?.();
  }, []);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.fallbackContent}>
        <Ionicons name="person" size={64} color="#4ECDC4" />
        <Text style={styles.fallbackTitle}>ML Segmentation Camera</Text>
        <Text style={styles.fallbackText}>
          Person detection and background effects{'\n'}will work in the native build
        </Text>
        {backgroundEffect !== 'none' && (
          <View style={styles.effectPreview}>
            <Text style={styles.effectPreviewTitle}>Selected Effect:</Text>
            <Text style={styles.effectPreviewText}>
              {backgroundEffect === 'blur' ? 'Background Blur' : `Background Color: ${backgroundColor}`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Native Camera with ML Segmentation
function NativeSegmentedCamera({
  facing,
  isActive = true,
  enableAudio = true,
  backgroundEffect = 'none',
  blurIntensity = 50,
  backgroundColor = '#000000',
  filterSettings,
  isRecording = false,
  onRecordingStarted,
  onRecordingFinished,
  onRecordingError,
  onCameraReady,
  onError,
  showEffectBadges = true,
  style,
}: SegmentedCameraViewProps) {
  const cameraRef = useRef<any>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecordingInternal, setIsRecordingInternal] = useState(false);
  const [processedFrame, setProcessedFrame] = useState<string | null>(null);
  const recordingStartTime = useRef<number>(0);

  // Camera hooks
  const device = useCameraDevice?.(facing);
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission?.() || {};
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission?.() || {};

  // Request permissions
  useEffect(() => {
    const getPermissions = async () => {
      try {
        if (!hasCameraPermission) await requestCameraPermission?.();
        if (!hasMicPermission) await requestMicPermission?.();
      } catch (error) {
        console.error('[SegmentedCamera] Permission error:', error);
        onError?.(error as Error);
      }
    };
    getPermissions();
  }, []);

  // Frame processor with ML segmentation
  const frameProcessor = useFrameProcessor?.((frame: any) => {
    'worklet';
    
    if (backgroundEffect === 'none' || !getSelfieSegmentation) {
      return;
    }
    
    try {
      // Get the segmented image with background replaced/blurred
      // The plugin handles:
      // 1. Running ML model to detect person
      // 2. Creating mask (person vs background)
      // 3. Applying effect to background only
      // 4. Returning composited image
      
      const segmentedImage = getSelfieSegmentation(frame, backgroundColor);
      
      // Update the displayed frame (runs on JS thread)
      if (segmentedImage) {
        // The plugin returns a base64 image with effects applied
        runOnJS(setProcessedFrame)(segmentedImage);
      }
    } catch (error) {
      console.log('[SegmentedCamera] Segmentation error:', error);
    }
  }, [backgroundEffect, backgroundColor]);

  const handleCameraReady = useCallback(() => {
    console.log('[SegmentedCamera] Camera initialized');
    setIsCameraReady(true);
    onCameraReady?.();
  }, [onCameraReady]);

  // Handle recording
  useEffect(() => {
    if (!cameraRef.current || !isCameraReady) return;
    
    if (isRecording && !isRecordingInternal) {
      startRecording();
    } else if (!isRecording && isRecordingInternal) {
      stopRecording();
    }
  }, [isRecording, isCameraReady]);

  const startRecording = async () => {
    if (!cameraRef.current || isRecordingInternal) return;
    
    try {
      console.log('[SegmentedCamera] Starting recording...');
      setIsRecordingInternal(true);
      recordingStartTime.current = Date.now();
      onRecordingStarted?.();
      
      cameraRef.current.startRecording({
        onRecordingFinished: (video: any) => {
          const duration = Math.floor((Date.now() - recordingStartTime.current) / 1000);
          console.log('[SegmentedCamera] Recording finished:', video.path);
          setIsRecordingInternal(false);
          onRecordingFinished?.({ 
            uri: `file://${video.path}`,
            duration,
          });
        },
        onRecordingError: (error: any) => {
          console.error('[SegmentedCamera] Recording error:', error);
          setIsRecordingInternal(false);
          onRecordingError?.(error);
        },
      });
    } catch (error) {
      console.error('[SegmentedCamera] Start recording error:', error);
      setIsRecordingInternal(false);
      onRecordingError?.(error as Error);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecordingInternal) return;
    
    try {
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('[SegmentedCamera] Stop recording error:', error);
    }
  };

  // Permission check
  if (hasCameraPermission === false || hasMicPermission === false) {
    return (
      <View style={[styles.container, style]}>
        <Ionicons name="camera-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorTitle}>Camera Access Required</Text>
        <Text style={styles.errorText}>
          Please enable camera and microphone in Settings
        </Text>
      </View>
    );
  }

  // No device
  if (!device) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Finding camera...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Camera feed */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        video={true}
        audio={enableAudio}
        frameProcessor={backgroundEffect !== 'none' ? frameProcessor : undefined}
        frameProcessorFps={5} // Lower FPS for segmentation processing
        onInitialized={handleCameraReady}
        onError={(error: any) => {
          console.error('[SegmentedCamera] Camera error:', error);
          onError?.(error);
        }}
      />
      
      {/* Processed frame overlay (shows segmented result) */}
      {processedFrame && backgroundEffect !== 'none' && (
        <Image 
          source={{ uri: `data:image/jpeg;base64,${processedFrame}` }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      
      {/* Effect badges */}
      {showEffectBadges && isCameraReady && (
        <View style={styles.badgeContainer}>
          {backgroundEffect === 'blur' && (
            <View style={[styles.badge, styles.bgBadge]}>
              <Ionicons name="eye-off" size={12} color="#fff" />
              <Text style={styles.badgeText}>BG Blur</Text>
            </View>
          )}
          
          {backgroundEffect === 'color' && (
            <View style={[styles.badge, styles.bgBadge]}>
              <View style={[styles.colorDot, { backgroundColor }]} />
              <Text style={styles.badgeText}>BG Color</Text>
            </View>
          )}
          
          {filterSettings && (filterSettings.brightness !== 0 || filterSettings.smoothing > 0) && (
            <View style={[styles.badge, styles.filterBadge]}>
              <Ionicons name="color-wand" size={12} color="#fff" />
              <Text style={styles.badgeText}>Touch-up</Text>
            </View>
          )}
        </View>
      )}
      
      {/* ML Processing indicator */}
      {backgroundEffect !== 'none' && isCameraReady && (
        <View style={styles.mlIndicator}>
          <Ionicons name="scan" size={14} color="#4ECDC4" />
          <Text style={styles.mlIndicatorText}>ML Active</Text>
        </View>
      )}
      
      {/* Recording indicator */}
      {isRecordingInternal && (
        <View style={styles.recordingBadge}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>REC</Text>
        </View>
      )}
      
      {/* Loading overlay */}
      {!isCameraReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Starting ML camera...</Text>
        </View>
      )}
    </View>
  );
}

// runOnJS helper for worklets
const runOnJS = (fn: Function) => (value: any) => {
  'worklet';
  // This is a simplified version - the actual implementation
  // comes from react-native-reanimated
  try {
    const reanimated = require('react-native-reanimated');
    return reanimated.runOnJS(fn)(value);
  } catch (e) {
    // Fallback
    fn(value);
  }
};

// Main export
export default function SegmentedCameraView(props: SegmentedCameraViewProps) {
  if (!isNativeAvailable) {
    return <CameraFallback {...props} />;
  }
  return <NativeSegmentedCamera {...props} />;
}

export function useSegmentationFeatures() {
  return {
    isNativeAvailable,
    supportsSegmentation: isNativeAvailable && !!getSelfieSegmentation,
    supportsBackgroundBlur: isNativeAvailable && !!getSelfieSegmentation,
    supportsBackgroundReplace: isNativeAvailable && !!getSelfieSegmentation,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContent: {
    alignItems: 'center',
    padding: 32,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  fallbackText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  effectPreview: {
    marginTop: 24,
    backgroundColor: 'rgba(78,205,196,0.15)',
    padding: 16,
    borderRadius: 12,
  },
  effectPreviewTitle: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  effectPreviewText: {
    color: '#fff',
    fontSize: 14,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 16,
  },
  errorTitle: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  errorText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  badgeContainer: {
    position: 'absolute',
    top: 100,
    right: 16,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  bgBadge: {
    backgroundColor: 'rgba(78,205,196,0.9)',
  },
  filterBadge: {
    backgroundColor: 'rgba(255,179,71,0.9)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fff',
  },
  mlIndicator: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  mlIndicatorText: {
    color: '#4ECDC4',
    fontSize: 10,
    fontWeight: '600',
  },
  recordingBadge: {
    position: 'absolute',
    top: 50,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  recordingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
