import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';

// Types
interface VisionCameraViewProps {
  facing: 'front' | 'back';
  audioEnabled?: boolean;
  backgroundType?: 'none' | 'blur' | 'color' | 'image';
  backgroundColor?: string;
  blurIntensity?: number;
  isRecording?: boolean;
  onCameraReady?: () => void;
  onRecordingStarted?: () => void;
  onRecordingStopped?: (video: { uri: string }) => void;
  showFPS?: boolean;
  children?: React.ReactNode;
}

// Web fallback
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
          Camera requires a mobile device.
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

// Native camera using expo-camera
function VisionCameraViewNative({
  facing,
  audioEnabled = true,
  backgroundType = 'none',
  backgroundColor,
  blurIntensity = 50,
  isRecording = false,
  onCameraReady,
  onRecordingStarted,
  onRecordingStopped,
  children,
}: VisionCameraViewProps) {
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
    console.log('[Camera] Ready');
    setIsCameraReady(true);
    onCameraReady?.();
  }, [onCameraReady]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingInternal) return;
    try {
      console.log('[Camera] Starting recording...');
      setIsRecordingInternal(true);
      onRecordingStarted?.();
      const video = await cameraRef.current.recordAsync({ maxDuration: 1800 });
      console.log('[Camera] Recording finished:', video?.uri);
      setIsRecordingInternal(false);
      if (video?.uri) onRecordingStopped?.({ uri: video.uri });
    } catch (error) {
      console.error('[Camera] Recording error:', error);
      setIsRecordingInternal(false);
    }
  }, [isRecordingInternal, onRecordingStarted, onRecordingStopped]);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecordingInternal) return;
    try {
      console.log('[Camera] Stopping recording...');
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('[Camera] Stop error:', error);
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
        <Text style={styles.text}>Camera permissions required</Text>
        <Text style={styles.subText}>Please allow camera and microphone access</Text>
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
      
      {/* Color overlay effect */}
      {backgroundType === 'color' && backgroundColor && (
        <View 
          style={[StyleSheet.absoluteFill, { backgroundColor, opacity: 0.2 }]} 
          pointerEvents="none"
        />
      )}
      
      {/* Blur effect indicator */}
      {backgroundType === 'blur' && (
        <View style={styles.effectIndicator}>
          <Text style={styles.effectIndicatorText}>Blur: {blurIntensity}%</Text>
        </View>
      )}
      
      {children}
      
      {!isCameraReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Starting camera...</Text>
        </View>
      )}
      
      {isRecordingInternal && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>REC</Text>
        </View>
      )}

      {isCameraReady && backgroundType !== 'none' && (
        <View style={styles.effectBadge}>
          <Text style={styles.effectBadgeText}>
            {backgroundType === 'blur' ? 'Blur' : ''}
            {backgroundType === 'color' ? 'Color' : ''}
            {backgroundType === 'image' ? 'Image' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

// Main export
export default function VisionCameraView(props: VisionCameraViewProps) {
  if (Platform.OS === 'web') {
    return <VisionCameraViewWeb {...props} />;
  }
  return <VisionCameraViewNative {...props} />;
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
    marginTop: 16,
  },
  subText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
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
  effectIndicator: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  effectIndicatorText: {
    color: '#fff',
    fontSize: 14,
  },
});
