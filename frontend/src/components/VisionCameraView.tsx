import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';

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

// Web fallback component
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
                {backgroundType === 'blur' ? 'Background Blur' : ''}
                {backgroundType === 'color' ? `Color: ${backgroundColor}` : ''}
                {backgroundType === 'image' ? 'Custom Background' : ''}
              </Text>
            </View>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

// Native implementation using expo-camera (Expo Go compatible)
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
  showFPS = false,
  children,
}: VisionCameraViewProps) {
  const cameraRef = useRef<any>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecordingInternal, setIsRecordingInternal] = useState(false);

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!micPermission?.granted && audioEnabled) {
        await requestMicPermission();
      }
    };
    requestPermissions();
  }, [cameraPermission, micPermission, audioEnabled]);

  // Handle recording state changes from parent
  useEffect(() => {
    if (isRecording && !isRecordingInternal && cameraRef.current && isCameraReady) {
      startRecording();
    } else if (!isRecording && isRecordingInternal && cameraRef.current) {
      stopRecording();
    }
  }, [isRecording, isCameraReady]);

  const handleCameraReady = useCallback(() => {
    console.log('[VisionCamera] Camera ready');
    setIsCameraReady(true);
    onCameraReady?.();
  }, [onCameraReady]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingInternal) return;
    
    try {
      console.log('[VisionCamera] Starting recording...');
      setIsRecordingInternal(true);
      onRecordingStarted?.();
      
      const video = await cameraRef.current.recordAsync({
        maxDuration: 1800,
      });
      
      console.log('[VisionCamera] Recording finished:', video?.uri);
      setIsRecordingInternal(false);
      
      if (video?.uri) {
        onRecordingStopped?.({ uri: video.uri });
      }
    } catch (error) {
      console.error('[VisionCamera] Recording error:', error);
      setIsRecordingInternal(false);
    }
  }, [isRecordingInternal, onRecordingStarted, onRecordingStopped]);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecordingInternal) return;
    
    try {
      console.log('[VisionCamera] Stopping recording...');
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('[VisionCamera] Stop recording error:', error);
    }
  }, [isRecordingInternal]);

  // Permission loading state
  if (!cameraPermission || !micPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={48} color="#4A90E2" />
          <Text style={styles.text}>Requesting permissions...</Text>
          <ActivityIndicator style={styles.loader} color="#4A90E2" />
        </View>
      </View>
    );
  }

  // Permission denied state
  if (!cameraPermission.granted || (audioEnabled && !micPermission.granted)) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={48} color="#FF3B30" />
          <Text style={styles.text}>Camera permissions required</Text>
          <Text style={styles.subText}>Please grant camera and microphone access</Text>
        </View>
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

      {/* Background color overlay effect */}
      {backgroundType === 'color' && backgroundColor && (
        <View 
          style={[
            StyleSheet.absoluteFill, 
            { 
              backgroundColor: backgroundColor,
              opacity: 0.2,
            }
          ]} 
          pointerEvents="none"
        />
      )}

      {/* Blur effect indicator */}
      {backgroundType === 'blur' && (
        <View style={styles.effectOverlay} pointerEvents="none">
          <View style={styles.blurIndicator}>
            <Text style={styles.blurText}>Blur: {blurIntensity}%</Text>
            <Text style={styles.blurNote}>Full blur requires dev build</Text>
          </View>
        </View>
      )}

      {/* Children (controls overlay) */}
      {children}

      {/* Loading overlay */}
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

      {/* Effect badge */}
      {isCameraReady && backgroundType !== 'none' && (
        <View style={styles.effectBadge}>
          <Text style={styles.effectText}>
            {backgroundType === 'blur' ? 'Blur Effect' : ''}
            {backgroundType === 'color' ? 'Color BG' : ''}
            {backgroundType === 'image' ? 'Custom BG' : ''}
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
  loader: {
    marginTop: 16,
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
  effectOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 120,
  },
  blurIndicator: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  blurText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  blurNote: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
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
