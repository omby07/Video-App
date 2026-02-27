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
import InterviewTimer from '../../src/components/InterviewTimer';
import RetakeControl from '../../src/components/RetakeControl';
import PresenceBoost from '../../src/components/PresenceBoost';
import FramingGuide from '../../src/components/FramingGuide';
import LightingIndicator from '../../src/components/LightingIndicator';

// Types & Store
import { InterviewPrompt, DEFAULT_PROMPTS } from '../../src/types';
import { useStore } from '../../src/store/useStore';

const { width, height } = Dimensions.get('window');

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
  
  // Audio level simulation (in real native build, this would use actual audio metering)
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef<any>(null);
  
  // Interview state
  const [currentPrompt, setCurrentPrompt] = useState<InterviewPrompt>(DEFAULT_PROMPTS[0]);
  const [isTeleprompterMinimized, setIsTeleprompterMinimized] = useState(false);
  
  // Presence Boost state (Phase 2 features)
  const [presenceBoostActive, setPresenceBoostActive] = useState(true);
  const [showFramingGuide, setShowFramingGuide] = useState(true);
  const [faceDetected, setFaceDetected] = useState(true); // Simulated
  const [faceCentered, setFaceCentered] = useState(false); // Simulated
  const [lightingLevel, setLightingLevel] = useState(65); // Simulated (0-100)
  const [facePosition, setFacePosition] = useState<{x: number; y: number; width: number; height: number} | null>(null);
  const lightingRef = useRef<any>(null);
  
  // Store
  const { cameraType, setCameraType, userSettings } = useStore();

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
      if (lightingRef.current) clearInterval(lightingRef.current);
    };
  }, []);

  // Simulate presence boost data (in native build, use ML face detection)
  useEffect(() => {
    if (presenceBoostActive && isCameraReady) {
      // Simulate lighting level variations
      lightingRef.current = setInterval(() => {
        setLightingLevel(prev => {
          const variation = (Math.random() - 0.5) * 10;
          return Math.max(20, Math.min(90, prev + variation));
        });
      }, 2000);

      // Simulate face detection with occasional state changes
      const faceInterval = setInterval(() => {
        // 90% of time face is detected when camera is ready
        setFaceDetected(Math.random() > 0.1);
        // 70% of time face is centered when detected
        setFaceCentered(faceDetected && Math.random() > 0.3);
        // Simulate face position
        if (faceDetected) {
          setFacePosition({
            x: 0.4 + Math.random() * 0.2,
            y: 0.25 + Math.random() * 0.15,
            width: 0.3,
            height: 0.35,
          });
        } else {
          setFacePosition(null);
        }
      }, 3000);

      return () => {
        clearInterval(faceInterval);
        if (lightingRef.current) clearInterval(lightingRef.current);
      };
    }
  }, [presenceBoostActive, isCameraReady, faceDetected]);

  // Simulate audio levels (in native build, use expo-av or native audio metering)
  const startAudioLevelSimulation = useCallback(() => {
    audioLevelRef.current = setInterval(() => {
      // Simulate natural speech patterns
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
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // Start audio level monitoring
      startAudioLevelSimulation();
      
      // Start actual recording
      const video = await cameraRef.current.recordAsync({
        maxDuration: userSettings?.max_duration || 1800,
      });
      
      // Recording finished
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
          'Web Recording Limited',
          'Full recording requires the native app. The UI demo shows how Interview Mode works.'
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
    // In a full implementation, this would:
    // 1. Stop current recording
    // 2. Trim the last X seconds
    // 3. Resume recording from that point
    
    Alert.alert(
      'Smart Retake',
      `This will redo the last ${seconds} seconds. Continue recording from ${recordingDuration - seconds}s?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Redo', 
          onPress: () => {
            setRecordingDuration(prev => Math.max(0, prev - seconds));
            // In native implementation, would trim video buffer here
          }
        },
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
      <StatusBar barStyle="light-content" />
      
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={cameraType}
        mode="video"
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* Framing Guide Overlay */}
      <FramingGuide
        isVisible={showFramingGuide && presenceBoostActive && !isRecording}
        facePosition={facePosition}
        showGuideLines={true}
      />

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isRecording) {
              Alert.alert(
                'Stop Recording?',
                'Going back will stop your current recording.',
                [
                  { text: 'Keep Recording', style: 'cancel' },
                  { text: 'Stop & Exit', style: 'destructive', onPress: () => {
                    stopRecording();
                    router.back();
                  }},
                ]
              );
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.modeBadge}>
          <Ionicons name="briefcase" size={14} color="#4ECDC4" />
          <Text style={styles.modeBadgeText}>Interview Mode</Text>
        </View>
        
        <TouchableOpacity style={styles.iconButton} onPress={toggleCameraType}>
          <Ionicons name="camera-reverse" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Presence Boost Controls - Below Top Bar */}
      {!isRecording && (
        <View style={styles.presenceBoostContainer}>
          <PresenceBoost
            isActive={presenceBoostActive}
            onToggle={() => setPresenceBoostActive(!presenceBoostActive)}
            faceDetected={faceDetected}
            faceCentered={faceCentered}
            lightingLevel={lightingLevel}
            showFramingHint={true}
          />
        </View>
      )}

      {/* Lighting Indicator - Shows during recording */}
      {isRecording && presenceBoostActive && (
        <View style={styles.lightingContainer}>
          <LightingIndicator level={lightingLevel} isVisible={true} />
        </View>
      )}

      {/* Timer - Center Top */}
      <View style={styles.timerContainer}>
        <InterviewTimer
          duration={recordingDuration}
          suggestedDuration={currentPrompt.suggestedDuration}
          isRecording={isRecording}
        />
      </View>

      {/* Teleprompter - Upper Middle */}
      <View style={styles.teleprompterContainer}>
        <Teleprompter
          currentPrompt={currentPrompt}
          onPromptChange={setCurrentPrompt}
          isMinimized={isTeleprompterMinimized}
          onToggleMinimize={() => setIsTeleprompterMinimized(!isTeleprompterMinimized)}
          isRecording={isRecording}
        />
      </View>

      {/* Energy Meter - Above Controls */}
      <View style={styles.energyMeterContainer}>
        <EnergyMeter audioLevel={audioLevel} isRecording={isRecording} />
      </View>

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
        {/* Retake Control */}
        <View style={styles.retakeContainer}>
          <RetakeControl
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            onRetake={handleRetake}
            onFullRestart={handleFullRestart}
          />
        </View>

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
              <Ionicons name="videocam" size={28} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Tips */}
        {!isRecording && (
          <View style={styles.tipsContainer}>
            <TouchableOpacity style={styles.tipButton}>
              <Ionicons name="bulb-outline" size={18} color="#FFB347" />
              <Text style={styles.tipText}>Tips</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  modeBadgeText: {
    color: '#4ECDC4',
    fontSize: 13,
    fontWeight: '600',
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  timerContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  teleprompterContainer: {
    position: 'absolute',
    top: 220,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  energyMeterContainer: {
    position: 'absolute',
    bottom: 200,
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
    paddingTop: 20,
  },
  retakeContainer: {
    marginBottom: 20,
    minHeight: 44,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  recordingButton: {
    backgroundColor: 'rgba(255,59,48,0.3)',
    borderColor: '#FF3B30',
  },
  recordIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  tipsContainer: {
    marginTop: 20,
  },
  tipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,179,71,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  tipText: {
    color: '#FFB347',
    fontSize: 13,
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
});
