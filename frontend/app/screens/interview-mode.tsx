import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import Teleprompter from '../../src/components/Teleprompter';
import EnergyMeter from '../../src/components/EnergyMeter';
import RetakeControl from '../../src/components/RetakeControl';
import ConfidenceCueDisplay from '../../src/components/ConfidenceCue';

// Types & Store
import { InterviewPrompt, DEFAULT_PROMPTS } from '../../src/types';
import { useStore } from '../../src/store/useStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function InterviewModeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
  // Camera state
  const cameraRef = useRef<any>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<any>(null);
  
  // Audio level simulation
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef<any>(null);
  
  // Interview state - use template from store if available
  const { 
    cameraType, 
    setCameraType, 
    userSettings, 
    interviewTemplate, 
    currentPromptIndex, 
    setCurrentPromptIndex 
  } = useStore();
  
  // Get prompts from template or use defaults
  const prompts = interviewTemplate?.prompts || DEFAULT_PROMPTS;
  const [currentPrompt, setCurrentPrompt] = useState<InterviewPrompt>(prompts[currentPromptIndex] || prompts[0]);
  const [isTeleprompterMinimized, setIsTeleprompterMinimized] = useState(false);
  const [showConfidenceCues, setShowConfidenceCues] = useState(true);
  
  // UI state - simplified
  const [showOverlays, setShowOverlays] = useState(true);

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (!cameraPermission?.granted) await requestCameraPermission();
      if (!micPermission?.granted) await requestMicPermission();
    };
    requestPermissions();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioLevelRef.current) clearInterval(audioLevelRef.current);
    };
  }, []);

  // Simulate audio levels
  const startAudioLevelSimulation = useCallback(() => {
    audioLevelRef.current = setInterval(() => {
      const baseLevel = 40 + Math.random() * 30;
      const spike = Math.random() > 0.7 ? Math.random() * 20 : 0;
      setAudioLevel(Math.min(100, baseLevel + spike));
    }, 150);
  }, []);

  const stopAudioLevelSimulation = useCallback(() => {
    if (audioLevelRef.current) {
      clearInterval(audioLevelRef.current);
      audioLevelRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startRecording = async () => {
    if (!cameraRef.current || !isCameraReady) {
      Alert.alert('Camera not ready', 'Please wait for the camera to initialize');
      return;
    }

    try {
      setIsRecording(true);
      setRecordingDuration(0);
      setIsTeleprompterMinimized(false); // Show teleprompter when recording
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      startAudioLevelSimulation();
      
      const video = await cameraRef.current.recordAsync({
        maxDuration: userSettings?.max_duration || 1800,
      });
      
      stopRecording();
      
      if (video?.uri) {
        router.push({
          pathname: '/screens/preview',
          params: { 
            videoUri: video.uri,
            recordedDuration: recordingDuration.toString(),
            promptTitle: currentPrompt.title,
          },
        });
      }
    } catch (error) {
      console.error('Recording error:', error);
      stopRecording();
      
      if (Platform.OS === 'web') {
        Alert.alert(
          'Web Preview Mode',
          'Full recording requires the native app. This demo shows how Interview Mode works.'
        );
      } else {
        Alert.alert('Recording Error', 'Failed to start recording');
      }
    }
  };

  const stopRecording = useCallback(() => {
    if (cameraRef.current && isRecording) {
      try {
        cameraRef.current.stopRecording();
      } catch (error) {
        console.error('Stop recording error:', error);
      }
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    stopAudioLevelSimulation();
    setIsRecording(false);
  }, [isRecording, stopAudioLevelSimulation]);

  const handleRetake = (seconds: number) => {
    Alert.alert(
      'Smart Retake',
      `This will redo the last ${seconds} seconds. Continue recording from ${recordingDuration - seconds}s?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Redo', onPress: () => setRecordingDuration(prev => Math.max(0, prev - seconds)) },
      ]
    );
  };

  const handleFullRestart = () => {
    stopRecording();
    setRecordingDuration(0);
  };

  const toggleCameraType = () => {
    setCameraType(cameraType === 'back' ? 'front' : 'back');
  };

  // Permission states
  if (!cameraPermission || !micPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="videocam" size={48} color="#4ECDC4" />
          <Text style={styles.permissionTitle}>Setting up Interview Mode</Text>
          <Text style={styles.permissionText}>Requesting camera & microphone access...</Text>
        </View>
      </View>
    );
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="shield-checkmark" size={48} color="#FF6B6B" />
          <Text style={styles.permissionTitle}>Permissions Required</Text>
          <Text style={styles.permissionText}>
            Interview Mode needs camera and microphone access to record your video
          </Text>
          <View style={styles.permissionButtons}>
            {!cameraPermission.granted && (
              <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.permissionButtonText}>Enable Camera</Text>
              </TouchableOpacity>
            )}
            {!micPermission.granted && (
              <TouchableOpacity style={styles.permissionButton} onPress={requestMicPermission}>
                <Ionicons name="mic" size={20} color="#fff" />
                <Text style={styles.permissionButtonText}>Enable Microphone</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden={isRecording} />
      
      {/* Full Screen Camera */}
      <CameraView
        ref={cameraRef}
        style={styles.fullScreenCamera}
        facing={cameraType}
        mode="video"
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* Tap to toggle overlays */}
      <TouchableOpacity 
        style={styles.tapArea} 
        activeOpacity={1}
        onPress={() => setShowOverlays(!showOverlays)}
      />

      {/* Minimal Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.topButton}
          onPress={() => {
            if (isRecording) {
              Alert.alert('Stop Recording?', 'Going back will stop your current recording.', [
                { text: 'Keep Recording', style: 'cancel' },
                { text: 'Stop & Exit', style: 'destructive', onPress: () => { stopRecording(); router.back(); }},
              ]);
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        
        {/* Template badge or recording indicator */}
        {isRecording ? (
          <View style={styles.recordingBadge}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>
              {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        ) : interviewTemplate ? (
          <View style={styles.templateBadge}>
            <Text style={styles.templateBadgeText}>{interviewTemplate.name}</Text>
          </View>
        ) : null}
        
        <TouchableOpacity style={styles.topButton} onPress={toggleCameraType}>
          <Ionicons name="camera-reverse" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Teleprompter - Collapsible */}
      {showOverlays && (
        <View style={[styles.teleprompterContainer, isRecording && styles.teleprompterRecording]}>
          <Teleprompter
            currentPrompt={currentPrompt}
            onPromptChange={setCurrentPrompt}
            isMinimized={isTeleprompterMinimized}
            onToggleMinimize={() => setIsTeleprompterMinimized(!isTeleprompterMinimized)}
            isRecording={isRecording}
          />
        </View>
      )}

      {/* Energy Meter - Only during recording */}
      {isRecording && (
        <View style={styles.energyMeterContainer}>
          <EnergyMeter audioLevel={audioLevel} isRecording={isRecording} />
        </View>
      )}

      {/* Confidence Cues - Subtle coaching during recording */}
      {showConfidenceCues && (
        <ConfidenceCueDisplay 
          isRecording={isRecording} 
          intervalSeconds={20}
        />
      )}

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 12 }]}>
        {/* Retake Control - Only during recording */}
        {isRecording && recordingDuration > 5 && (
          <View style={styles.retakeContainer}>
            <RetakeControl
              isRecording={isRecording}
              recordingDuration={recordingDuration}
              onRetake={handleRetake}
              onFullRestart={handleFullRestart}
            />
          </View>
        )}

        {/* Main Record Button */}
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={!isCameraReady}
        >
          {isRecording ? (
            <View style={styles.stopIcon} />
          ) : (
            <View style={styles.recordIcon}>
              <Ionicons name="videocam" size={26} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Hint text */}
        {!isRecording && showOverlays && (
          <Text style={styles.hintText}>Tap anywhere to hide/show prompts</Text>
        )}
      </View>

      {/* Camera Loading Overlay */}
      {!isCameraReady && (
        <View style={styles.loadingOverlay}>
          <Ionicons name="videocam" size={48} color="#4ECDC4" />
          <Text style={styles.loadingText}>Preparing camera...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenCamera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  tapArea: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    bottom: 180,
    zIndex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  recordingTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  templateBadge: {
    backgroundColor: 'rgba(78,205,196,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  templateBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  timerContainer: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    zIndex: 5,
  },
  teleprompterContainer: {
    position: 'absolute',
    top: 200,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  teleprompterRecording: {
    top: 100,
  },
  energyMeterContainer: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 16,
    zIndex: 10,
  },
  retakeContainer: {
    marginBottom: 16,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  recordingButton: {
    backgroundColor: 'rgba(255,59,48,0.2)',
    borderColor: '#FF3B30',
  },
  recordIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  hintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
});
