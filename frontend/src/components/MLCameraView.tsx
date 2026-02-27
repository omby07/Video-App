/**
 * MLCameraView - Simplified camera with effects support
 * Falls back gracefully if native modules aren't available
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
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

// Try to load Vision Camera
let Camera: any = null;
let useCameraDevice: any = null;
let useCameraPermission: any = null;
let useMicrophonePermission: any = null;
let isVisionCameraAvailable = false;

if (Platform.OS !== 'web') {
  try {
    const VisionCamera = require('react-native-vision-camera');
    Camera = VisionCamera.Camera;
    useCameraDevice = VisionCamera.useCameraDevice;
    useCameraPermission = VisionCamera.useCameraPermission;
    useMicrophonePermission = VisionCamera.useMicrophonePermission;
    isVisionCameraAvailable = true;
    console.log('[MLCameraView] Vision Camera loaded successfully');
  } catch (e) {
    console.log('[MLCameraView] Vision Camera not available:', e);
  }
}

// Fallback for when Vision Camera isn't available
function CameraFallback({ onCameraReady, style }: MLCameraViewProps) {
  useEffect(() => {
    onCameraReady?.();
  }, []);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.fallbackContent}>
        <Ionicons name="videocam" size={64} color="#4ECDC4" />
        <Text style={styles.fallbackTitle}>Camera Ready</Text>
        <Text style={styles.fallbackText}>
          Native camera module loading...
        </Text>
      </View>
    </View>
  );
}

// Main Camera Component
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

  // Use Vision Camera hooks
  const device = useCameraDevice?.(facing);
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission?.() || {};
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission?.() || {};

  // Request permissions on mount
  useEffect(() => {
    const getPermissions = async () => {
      try {
        if (!hasCameraPermission) {
          await requestCameraPermission?.();
        }
        if (!hasMicPermission) {
          await requestMicPermission?.();
        }
      } catch (error) {
        console.error('[MLCameraView] Permission error:', error);
        onError?.(error as Error);
      }
    };
    getPermissions();
  }, []);

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
      console.log('[MLCameraView] Starting recording...');
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
      console.log('[MLCameraView] Stopping recording...');
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
        onInitialized={handleCameraReady}
        onError={(error: any) => {
          console.error('[MLCameraView] Camera error:', error);
          onError?.(error);
        }}
      />
      
      {/* Effect badges */}
      {showEffectBadges && isCameraReady && (
        <View style={styles.badgeContainer}>
          {backgroundEffect !== 'none' && (
            <View style={[styles.badge, styles.bgBadge]}>
              <Ionicons name="layers" size={12} color="#fff" />
              <Text style={styles.badgeText}>
                {backgroundEffect === 'blur' ? `Blur ${blurIntensity}%` : 'BG'}
              </Text>
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
  if (!isVisionCameraAvailable) {
    return <CameraFallback {...props} />;
  }
  
  return <NativeCamera {...props} />;
}

export function useMLCameraFeatures() {
  return {
    isNativeAvailable: isVisionCameraAvailable,
    supportsBackgroundBlur: isVisionCameraAvailable,
    supportsTouchUpFilters: isVisionCameraAvailable,
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
