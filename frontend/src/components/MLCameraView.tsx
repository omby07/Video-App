/**
 * MLCameraView - Camera with real-time Skia blur and color filters
 * 
 * This applies effects using useSkiaFrameProcessor which processes
 * each frame through the GPU for real-time effects.
 */

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  smoothing: number;
}

export interface MLCameraViewProps {
  facing: 'front' | 'back';
  isActive?: boolean;
  enableAudio?: boolean;
  backgroundEffect?: 'none' | 'blur' | 'color' | 'gradient';
  blurIntensity?: number;
  backgroundColor?: string;
  backgroundGradient?: string[];
  filterSettings?: FilterSettings;
  isRecording?: boolean;
  onRecordingStarted?: () => void;
  onRecordingFinished?: (video: { uri: string; duration: number }) => void;
  onRecordingError?: (error: Error) => void;
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
let useSkiaFrameProcessor: any = null;
let Skia: any = null;
let TileMode: any = null;
let isNativeAvailable = false;

if (Platform.OS !== 'web') {
  try {
    const VisionCamera = require('react-native-vision-camera');
    Camera = VisionCamera.Camera;
    useCameraDevice = VisionCamera.useCameraDevice;
    useCameraPermission = VisionCamera.useCameraPermission;
    useMicrophonePermission = VisionCamera.useMicrophonePermission;
    useSkiaFrameProcessor = VisionCamera.useSkiaFrameProcessor;
    
    const SkiaModule = require('@shopify/react-native-skia');
    Skia = SkiaModule.Skia;
    TileMode = SkiaModule.TileMode;
    
    isNativeAvailable = true;
    console.log('[MLCameraView] Native modules loaded successfully');
  } catch (e) {
    console.log('[MLCameraView] Native modules not available:', e);
  }
}

// Fallback component
function CameraFallback({ onCameraReady, style }: MLCameraViewProps) {
  useEffect(() => {
    onCameraReady?.();
  }, []);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.fallbackContent}>
        <Ionicons name="videocam" size={64} color="#4ECDC4" />
        <Text style={styles.fallbackTitle}>Camera Preview</Text>
        <Text style={styles.fallbackText}>
          Effects will be applied in the native build
        </Text>
      </View>
    </View>
  );
}

// Native Camera with Skia effects
function NativeCamera({
  facing,
  isActive = true,
  enableAudio = true,
  backgroundEffect = 'none',
  blurIntensity = 50,
  filterSettings,
  isRecording = false,
  onRecordingStarted,
  onRecordingFinished,
  onRecordingError,
  onCameraReady,
  onError,
  showEffectBadges = true,
  style,
}: MLCameraViewProps) {
  const cameraRef = useRef<any>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecordingInternal, setIsRecordingInternal] = useState(false);
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
        console.error('[MLCameraView] Permission error:', error);
        onError?.(error as Error);
      }
    };
    getPermissions();
  }, []);

  // Calculate blur sigma from intensity (0-100 -> 0-30 sigma)
  const blurSigma = useMemo(() => {
    if (backgroundEffect !== 'blur') return 0;
    return (blurIntensity / 100) * 30;
  }, [backgroundEffect, blurIntensity]);

  // Calculate color matrix from filter settings
  const colorMatrix = useMemo(() => {
    if (!filterSettings) return null;
    
    const { brightness = 0, contrast = 0, saturation = 0 } = filterSettings;
    
    // Skip if no adjustments
    if (brightness === 0 && contrast === 0 && saturation === 0) return null;
    
    const b = brightness;
    const c = 1 + contrast;
    const s = 1 + saturation;
    
    // Saturation matrix
    const sr = (1 - s) * 0.2126;
    const sg = (1 - s) * 0.7152;
    const sb = (1 - s) * 0.0722;
    
    return [
      c * (sr + s), c * sg,       c * sb,       0, b,
      c * sr,       c * (sg + s), c * sb,       0, b,
      c * sr,       c * sg,       c * (sb + s), 0, b,
      0,            0,            0,            1, 0,
    ];
  }, [filterSettings]);

  // Skia frame processor - applies blur and color effects
  const frameProcessor = useSkiaFrameProcessor?.((frame: any) => {
    'worklet';
    
    // Create paint object
    const paint = Skia.Paint();
    
    // Apply blur if enabled
    if (blurSigma > 0) {
      const blurFilter = Skia.ImageFilter.MakeBlur(
        blurSigma, 
        blurSigma, 
        TileMode.Clamp, 
        null
      );
      paint.setImageFilter(blurFilter);
    }
    
    // Apply color matrix filter if we have adjustments
    if (colorMatrix) {
      const matrixColorFilter = Skia.ColorFilter.MakeMatrix(colorMatrix);
      paint.setColorFilter(matrixColorFilter);
    }
    
    // Render the frame with effects
    frame.render(paint);
  }, [blurSigma, colorMatrix]);

  const handleCameraReady = useCallback(() => {
    console.log('[MLCameraView] Camera initialized');
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
      console.log('[MLCameraView] Starting recording with effects...');
      setIsRecordingInternal(true);
      recordingStartTime.current = Date.now();
      onRecordingStarted?.();
      
      cameraRef.current.startRecording({
        onRecordingFinished: (video: any) => {
          const duration = Math.floor((Date.now() - recordingStartTime.current) / 1000);
          console.log('[MLCameraView] Recording finished:', video.path);
          setIsRecordingInternal(false);
          onRecordingFinished?.({ 
            uri: `file://${video.path}`,
            duration,
          });
        },
        onRecordingError: (error: any) => {
          console.error('[MLCameraView] Recording error:', error);
          setIsRecordingInternal(false);
          onRecordingError?.(error);
        },
      });
    } catch (error) {
      console.error('[MLCameraView] Start recording error:', error);
      setIsRecordingInternal(false);
      onRecordingError?.(error as Error);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecordingInternal) return;
    
    try {
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('[MLCameraView] Stop recording error:', error);
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
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        video={true}
        audio={enableAudio}
        frameProcessor={frameProcessor}
        onInitialized={handleCameraReady}
        onError={(error: any) => {
          console.error('[MLCameraView] Camera error:', error);
          onError?.(error);
        }}
      />
      
      {/* Effect badges */}
      {showEffectBadges && isCameraReady && (
        <View style={styles.badgeContainer}>
          {backgroundEffect === 'blur' && blurIntensity > 0 && (
            <View style={[styles.badge, styles.bgBadge]}>
              <Ionicons name="eye-off" size={12} color="#fff" />
              <Text style={styles.badgeText}>Blur {blurIntensity}%</Text>
            </View>
          )}
          
          {filterSettings && (filterSettings.brightness !== 0 || filterSettings.contrast !== 0 || filterSettings.saturation !== 0) && (
            <View style={[styles.badge, styles.filterBadge]}>
              <Ionicons name="color-wand" size={12} color="#fff" />
              <Text style={styles.badgeText}>Touch-up</Text>
            </View>
          )}
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
          <Text style={styles.loadingText}>Starting camera...</Text>
        </View>
      )}
    </View>
  );
}

// Main export
export default function MLCameraView(props: MLCameraViewProps) {
  if (!isNativeAvailable) {
    return <CameraFallback {...props} />;
  }
  return <NativeCamera {...props} />;
}

export function useMLCameraFeatures() {
  return {
    isNativeAvailable,
    supportsBlur: isNativeAvailable,
    supportsColorFilters: isNativeAvailable,
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
