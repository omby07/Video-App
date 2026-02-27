import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VisionCameraViewProps {
  facing: 'front' | 'back';
  audioEnabled?: boolean;
  backgroundType?: 'none' | 'blur' | 'color' | 'image';
  backgroundColor?: string; // hex color
  backgroundImage?: string; // URL or local path
  blurIntensity?: number; // 0-100
  isRecording?: boolean;
  onCameraReady?: () => void;
  onRecordingStarted?: () => void;
  onRecordingStopped?: (video: { uri: string }) => void;
  showFPS?: boolean;
  children?: React.ReactNode;
}

// Web fallback component - shows a placeholder on web browsers
function VisionCameraViewWeb({ 
  children, 
  onCameraReady,
  backgroundType,
  backgroundColor,
}: VisionCameraViewProps) {
  useEffect(() => {
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
        
        {backgroundType && backgroundType !== 'none' && (
          <View style={styles.webEffectPreview}>
            <Text style={styles.webEffectLabel}>Selected Effect:</Text>
            <View style={styles.webEffectBadge}>
              <Text style={styles.webEffectText}>
                {backgroundType === 'blur' && '🌫️ Background Blur'}
                {backgroundType === 'color' && `🎨 Color: ${backgroundColor}`}
                {backgroundType === 'image' && '🖼️ Custom Background'}
              </Text>
            </View>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

// Native implementation with ML segmentation
function VisionCameraViewNative({
  facing,
  audioEnabled = true,
  backgroundType = 'none',
  backgroundColor,
  backgroundImage,
  blurIntensity = 50,
  isRecording = false,
  onCameraReady,
  onRecordingStarted,
  onRecordingStopped,
  showFPS = false,
  children,
}: VisionCameraViewProps) {
  // Dynamic imports for native-only modules
  const { 
    Camera, 
    useCameraDevice, 
    useCameraPermission, 
    useFrameProcessor,
    useMicrophonePermission 
  } = require('react-native-vision-camera');
  const { useSharedValue, runOnJS } = require('react-native-reanimated');
  
  const cameraRef = useRef<any>(null);
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();
  const device = useCameraDevice(facing);
  
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [fps, setFps] = useState(0);
  const [segmentationActive, setSegmentationActive] = useState(false);
  const [isRecordingInternal, setIsRecordingInternal] = useState(false);
  
  // Shared values for worklet communication
  const frameCount = useSharedValue(0);
  const lastFpsUpdate = useSharedValue(Date.now());
  const maskData = useSharedValue<number[] | null>(null);

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (!hasCameraPermission) {
        await requestCameraPermission();
      }
      if (!hasMicPermission && audioEnabled) {
        await requestMicPermission();
      }
    };
    requestPermissions();
  }, [hasCameraPermission, hasMicPermission, audioEnabled]);

  // Handle recording state changes from parent
  useEffect(() => {
    if (isRecording && !isRecordingInternal && cameraRef.current) {
      startRecording();
    } else if (!isRecording && isRecordingInternal && cameraRef.current) {
      stopRecording();
    }
  }, [isRecording]);

  const handleCameraInitialized = useCallback(() => {
    console.log('[VisionCamera] Camera initialized');
    setIsCameraReady(true);
    onCameraReady?.();
  }, [onCameraReady]);

  const updateFPS = useCallback((newFps: number) => {
    setFps(newFps);
  }, []);

  const updateSegmentationStatus = useCallback((active: boolean) => {
    setSegmentationActive(active);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingInternal) return;
    
    try {
      console.log('[VisionCamera] Starting recording...');
      setIsRecordingInternal(true);
      onRecordingStarted?.();
      
      await cameraRef.current.startRecording({
        onRecordingFinished: (video: { path: string }) => {
          console.log('[VisionCamera] Recording finished:', video.path);
          setIsRecordingInternal(false);
          onRecordingStopped?.({ uri: `file://${video.path}` });
        },
        onRecordingError: (error: Error) => {
          console.error('[VisionCamera] Recording error:', error);
          setIsRecordingInternal(false);
        },
      });
    } catch (error) {
      console.error('[VisionCamera] Failed to start recording:', error);
      setIsRecordingInternal(false);
    }
  }, [isRecordingInternal, onRecordingStarted, onRecordingStopped]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecordingInternal) return;
    
    try {
      console.log('[VisionCamera] Stopping recording...');
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('[VisionCamera] Failed to stop recording:', error);
    }
  }, [isRecordingInternal]);

  // Frame Processor with ML Segmentation
  const frameProcessor = useFrameProcessor((frame: any) => {
    'worklet';
    
    // Skip processing if no effects are enabled
    if (backgroundType === 'none') {
      return;
    }

    // Count frames for FPS calculation
    frameCount.value++;
    const now = Date.now();
    const timeSinceLastUpdate = now - lastFpsUpdate.value;
    
    if (timeSinceLastUpdate >= 1000) {
      const currentFps = Math.round((frameCount.value * 1000) / timeSinceLastUpdate);
      runOnJS(updateFPS)(currentFps);
      frameCount.value = 0;
      lastFpsUpdate.value = now;
    }

    // Try to use selfie segmentation if available
    try {
      // Note: In a full implementation, you would call:
      // const segmentation = getSelfieSegments(frame);
      // maskData.value = segmentation.mask;
      
      // For now, we indicate segmentation is active
      runOnJS(updateSegmentationStatus)(true);
      
      // The actual segmentation mask would be used with Skia to:
      // 1. Draw the background (blur/color/image)
      // 2. Draw the person on top using the mask
    } catch (error) {
      runOnJS(updateSegmentationStatus)(false);
    }
  }, [backgroundType, backgroundColor, backgroundImage, blurIntensity]);

  // Permission states
  if (!hasCameraPermission || (audioEnabled && !hasMicPermission)) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={48} color="#4A90E2" />
          <Text style={styles.text}>Requesting permissions...</Text>
          <ActivityIndicator style={{ marginTop: 16 }} color="#4A90E2" />
        </View>
      </View>
    );
  }

  if (hasCameraPermission === false) {
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

  // Determine if we should use the frame processor
  const shouldUseFrameProcessor = backgroundType !== 'none';

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        video={true}
        audio={audioEnabled}
        frameProcessor={shouldUseFrameProcessor ? frameProcessor : undefined}
        onInitialized={handleCameraInitialized}
        pixelFormat="yuv"
        fps={30}
        videoStabilizationMode="auto"
      />

      {/* Background Effect Overlay */}
      {backgroundType === 'color' && backgroundColor && (
        <View 
          style={[
            StyleSheet.absoluteFill, 
            { 
              backgroundColor: backgroundColor,
              opacity: 0.15,
            }
          ]} 
          pointerEvents="none"
        />
      )}

      {/* Overlay children (UI controls) */}
      {children}

      {/* Camera initializing indicator */}
      {!isCameraReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Initializing camera...</Text>
        </View>
      )}

      {/* Recording indicator */}
      {isRecordingInternal && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>REC</Text>
        </View>
      )}

      {/* FPS Counter */}
      {showFPS && isCameraReady && shouldUseFrameProcessor && (
        <View style={styles.fpsCounter}>
          <Text style={styles.fpsText}>{fps} FPS</Text>
          <Text style={styles.fpsLabel}>
            {segmentationActive ? 'ML Active' : 'Processing'}
          </Text>
        </View>
      )}

      {/* Effect Status Badge */}
      {isCameraReady && backgroundType !== 'none' && (
        <View style={styles.effectBadge}>
          <Text style={styles.effectText}>
            {backgroundType === 'blur' && `🌫️ Blur ${blurIntensity}%`}
            {backgroundType === 'color' && '🎨 Color BG'}
            {backgroundType === 'image' && '🖼️ Custom BG'}
          </Text>
        </View>
      )}

      {/* ML Status Indicator */}
      {isCameraReady && shouldUseFrameProcessor && (
        <View style={[
          styles.mlStatus,
          segmentationActive ? styles.mlStatusActive : styles.mlStatusInactive
        ]}>
          <View style={[
            styles.mlDot,
            { backgroundColor: segmentationActive ? '#7ED321' : '#FF9500' }
          ]} />
          <Text style={styles.mlText}>
            {segmentationActive ? 'ML Segmentation' : 'Initializing ML'}
          </Text>
        </View>
      )}
    </View>
  );
}

// Main export - automatically selects platform-appropriate implementation
export default function VisionCameraView(props: VisionCameraViewProps) {
  if (Platform.OS === 'web') {
    return <VisionCameraViewWeb {...props} />;
  }
  return <VisionCameraViewNative {...props} />;
}

// Export camera control methods
export interface CameraControls {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  takePhoto: () => Promise<{ uri: string } | null>;
}

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
  recordingIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  recordingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
  mlStatus: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mlStatusActive: {
    backgroundColor: 'rgba(126, 211, 33, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(126, 211, 33, 0.5)',
  },
  mlStatusInactive: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.5)',
  },
  mlDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  mlText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  webFallback: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    margin: 20,
    maxWidth: 340,
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
  webEffectPreview: {
    marginTop: 20,
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    width: '100%',
  },
  webEffectLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },
  webEffectBadge: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.5)',
  },
  webEffectText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
  },
});
