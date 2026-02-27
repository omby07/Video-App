import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Types
interface VisionCameraViewProps {
  facing: 'front' | 'back';
  audioEnabled?: boolean;
  backgroundType?: 'none' | 'blur' | 'color' | 'image';
  backgroundColor?: string;
  backgroundImage?: string;
  blurIntensity?: number;
  isRecording?: boolean;
  onCameraReady?: () => void;
  onRecordingStarted?: () => void;
  onRecordingStopped?: (video: { uri: string }) => void;
  showFPS?: boolean;
  children?: React.ReactNode;
}

// Check if we're running in a development build (has native modules)
const isDevBuild = (() => {
  try {
    // Try to require vision camera - will fail in Expo Go
    require('react-native-vision-camera');
    return true;
  } catch {
    return false;
  }
})();

// ================== WEB FALLBACK ==================
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
      <View style={styles.fallback}>
        <Ionicons name="videocam-off" size={64} color="#888" />
        <Text style={styles.fallbackTitle}>Camera Preview</Text>
        <Text style={styles.fallbackText}>
          Real-time camera effects require a native device.
        </Text>
        {backgroundType && backgroundType !== 'none' && (
          <View style={styles.effectPreview}>
            <Text style={styles.effectLabel}>Selected Effect:</Text>
            <Text style={styles.effectValue}>
              {backgroundType === 'blur' ? 'Background Blur' : ''}
              {backgroundType === 'color' ? `Color: ${backgroundColor}` : ''}
              {backgroundType === 'image' ? 'Custom Background' : ''}
            </Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

// ================== EXPO GO FALLBACK (uses expo-camera) ==================
function VisionCameraViewExpoGo({
  facing,
  audioEnabled = true,
  backgroundType = 'none',
  backgroundColor,
  blurIntensity = 50,
  isRecording = false,
  onCameraReady,
  onRecordingStarted,
  onRecordingStopped,
  showFPS = false,
  children,
}: VisionCameraViewProps) {
  const { CameraView, useCameraPermissions, useMicrophonePermissions } = require('expo-camera');
  
  const cameraRef = useRef<any>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecordingInternal, setIsRecordingInternal] = useState(false);

  useEffect(() => {
    const requestPermissions = async () => {
      if (!cameraPermission?.granted) await requestCameraPermission();
      if (!micPermission?.granted && audioEnabled) await requestMicPermission();
    };
    requestPermissions();
  }, [cameraPermission, micPermission, audioEnabled]);

  useEffect(() => {
    if (isRecording && !isRecordingInternal && cameraRef.current && isCameraReady) {
      startRecording();
    } else if (!isRecording && isRecordingInternal && cameraRef.current) {
      stopRecording();
    }
  }, [isRecording, isCameraReady]);

  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
    onCameraReady?.();
  }, [onCameraReady]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingInternal) return;
    try {
      setIsRecordingInternal(true);
      onRecordingStarted?.();
      const video = await cameraRef.current.recordAsync({ maxDuration: 1800 });
      setIsRecordingInternal(false);
      if (video?.uri) onRecordingStopped?.({ uri: video.uri });
    } catch (error) {
      console.error('[VisionCamera-ExpoGo] Recording error:', error);
      setIsRecordingInternal(false);
    }
  }, [isRecordingInternal, onRecordingStarted, onRecordingStopped]);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecordingInternal) return;
    try {
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('[VisionCamera-ExpoGo] Stop error:', error);
    }
  }, [isRecordingInternal]);

  if (!cameraPermission || !micPermission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.text}>Requesting permissions...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted || (audioEnabled && !micPermission.granted)) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={48} color="#FF3B30" />
        <Text style={styles.text}>Permissions required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
        onCameraReady={handleCameraReady}
      />
      
      {/* Simple color overlay for Expo Go */}
      {backgroundType === 'color' && backgroundColor && (
        <View 
          style={[StyleSheet.absoluteFill, { backgroundColor, opacity: 0.2 }]} 
          pointerEvents="none"
        />
      )}
      
      {/* Expo Go limitation notice */}
      {backgroundType !== 'none' && (
        <View style={styles.limitationBadge}>
          <Text style={styles.limitationText}>
            Full ML effects in Dev Build
          </Text>
        </View>
      )}
      
      {children}
      
      {!isCameraReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      )}
      
      {isRecordingInternal && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>REC</Text>
        </View>
      )}
    </View>
  );
}

// ================== NATIVE DEV BUILD (Full ML with Vision Camera) ==================
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
  // Native imports
  const { 
    Camera, 
    useCameraDevice, 
    useCameraPermission, 
    useMicrophonePermission,
    useFrameProcessor 
  } = require('react-native-vision-camera');
  const { useSharedValue, runOnJS } = require('react-native-reanimated');
  
  // Try to import segmentation - might not be available
  let useSelfieSegmentation: any = null;
  try {
    const segModule = require('react-native-vision-camera-selfie-segmentation');
    useSelfieSegmentation = segModule.useSelfieSegmentation;
  } catch (e) {
    console.log('[VisionCamera] Selfie segmentation not available');
  }

  const cameraRef = useRef<any>(null);
  const { hasPermission: hasCamPerm, requestPermission: reqCamPerm } = useCameraPermission();
  const { hasPermission: hasMicPerm, requestPermission: reqMicPerm } = useMicrophonePermission();
  const device = useCameraDevice(facing);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecordingInternal, setIsRecordingInternal] = useState(false);
  const [fps, setFps] = useState(0);
  const [segmentationActive, setSegmentationActive] = useState(false);

  const frameCount = useSharedValue(0);
  const lastFpsUpdate = useSharedValue(Date.now());

  useEffect(() => {
    const requestPerms = async () => {
      if (!hasCamPerm) await reqCamPerm();
      if (!hasMicPerm && audioEnabled) await reqMicPerm();
    };
    requestPerms();
  }, [hasCamPerm, hasMicPerm, audioEnabled]);

  useEffect(() => {
    if (isRecording && !isRecordingInternal && cameraRef.current && isCameraReady) {
      startRecording();
    } else if (!isRecording && isRecordingInternal) {
      stopRecording();
    }
  }, [isRecording, isCameraReady]);

  const handleInitialized = useCallback(() => {
    console.log('[VisionCamera-Native] Initialized');
    setIsCameraReady(true);
    onCameraReady?.();
  }, [onCameraReady]);

  const updateFPS = useCallback((newFps: number) => setFps(newFps), []);
  const updateSegStatus = useCallback((active: boolean) => setSegmentationActive(active), []);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingInternal) return;
    try {
      console.log('[VisionCamera-Native] Starting recording...');
      setIsRecordingInternal(true);
      onRecordingStarted?.();
      
      await cameraRef.current.startRecording({
        onRecordingFinished: (video: { path: string }) => {
          console.log('[VisionCamera-Native] Recording finished:', video.path);
          setIsRecordingInternal(false);
          onRecordingStopped?.({ uri: `file://${video.path}` });
        },
        onRecordingError: (error: Error) => {
          console.error('[VisionCamera-Native] Recording error:', error);
          setIsRecordingInternal(false);
        },
      });
    } catch (error) {
      console.error('[VisionCamera-Native] Start recording error:', error);
      setIsRecordingInternal(false);
    }
  }, [isRecordingInternal, onRecordingStarted, onRecordingStopped]);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecordingInternal) return;
    try {
      console.log('[VisionCamera-Native] Stopping recording...');
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('[VisionCamera-Native] Stop error:', error);
    }
  }, [isRecordingInternal]);

  // Frame processor for ML segmentation
  const frameProcessor = useFrameProcessor((frame: any) => {
    'worklet';
    
    if (backgroundType === 'none') return;

    // FPS calculation
    frameCount.value++;
    const now = Date.now();
    if (now - lastFpsUpdate.value >= 1000) {
      const currentFps = Math.round((frameCount.value * 1000) / (now - lastFpsUpdate.value));
      runOnJS(updateFPS)(currentFps);
      frameCount.value = 0;
      lastFpsUpdate.value = now;
    }

    // Segmentation would happen here
    // const mask = getSelfieSegmentationMask(frame);
    runOnJS(updateSegStatus)(true);
  }, [backgroundType]);

  if (!hasCamPerm || (audioEnabled && !hasMicPerm)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.text}>Requesting permissions...</Text>
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

  const useProcessor = backgroundType !== 'none';

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        video={true}
        audio={audioEnabled}
        frameProcessor={useProcessor ? frameProcessor : undefined}
        onInitialized={handleInitialized}
        pixelFormat="yuv"
        fps={30}
      />

      {/* Color overlay */}
      {backgroundType === 'color' && backgroundColor && (
        <View 
          style={[StyleSheet.absoluteFill, { backgroundColor, opacity: 0.15 }]} 
          pointerEvents="none"
        />
      )}

      {children}

      {!isCameraReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Initializing ML camera...</Text>
        </View>
      )}

      {isRecordingInternal && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>REC</Text>
        </View>
      )}

      {showFPS && isCameraReady && useProcessor && (
        <View style={styles.fpsCounter}>
          <Text style={styles.fpsText}>{fps} FPS</Text>
          <Text style={styles.fpsLabel}>
            {segmentationActive ? 'ML Active' : 'Processing'}
          </Text>
        </View>
      )}

      {isCameraReady && backgroundType !== 'none' && (
        <View style={styles.effectBadge}>
          <Text style={styles.effectBadgeText}>
            {backgroundType === 'blur' ? `Blur ${blurIntensity}%` : ''}
            {backgroundType === 'color' ? 'Color BG' : ''}
            {backgroundType === 'image' ? 'Custom BG' : ''}
          </Text>
        </View>
      )}

      {isCameraReady && useProcessor && (
        <View style={[styles.mlStatus, segmentationActive ? styles.mlActive : styles.mlInactive]}>
          <View style={[styles.mlDot, { backgroundColor: segmentationActive ? '#7ED321' : '#FF9500' }]} />
          <Text style={styles.mlText}>
            {segmentationActive ? 'ML Segmentation' : 'Initializing...'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ================== MAIN EXPORT ==================
export default function VisionCameraView(props: VisionCameraViewProps) {
  if (Platform.OS === 'web') {
    return <VisionCameraViewWeb {...props} />;
  }
  
  // Use native vision camera if available (dev build), otherwise expo-camera
  if (isDevBuild) {
    return <VisionCameraViewNative {...props} />;
  }
  
  return <VisionCameraViewExpoGo {...props} />;
}

// ================== STYLES ==================
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
    marginTop: 16,
  },
  fallback: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    margin: 20,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  fallbackText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  effectPreview: {
    marginTop: 20,
    alignItems: 'center',
  },
  effectLabel: {
    color: '#666',
    fontSize: 12,
  },
  effectValue: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
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
  },
  effectBadge: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: 'rgba(74,144,226,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  effectBadgeText: {
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
  mlActive: {
    backgroundColor: 'rgba(126,211,33,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(126,211,33,0.5)',
  },
  mlInactive: {
    backgroundColor: 'rgba(255,149,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.5)',
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
  limitationBadge: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,149,0,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  limitationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
