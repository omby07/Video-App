import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useRouter } from 'expo-router';
import { BACKGROUND_COLORS } from '../constants';
import { estimateProcessingTime, formatProcessingTime } from '../utils/videoProcessor';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const cameraRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const router = useRouter();
  
  const {
    cameraType,
    setCameraType,
    userSettings,
    selectedBackground,
    audioEnabled,
    setAudioEnabled,
  } = useStore();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (!permission) {
    return <View style={styles.container}><Text style={styles.text}>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startRecording = async () => {
    if (cameraRef.current) {
      // Show disclaimer for long videos
      if (recordingDuration === 0 && userSettings) {
        const maxMinutes = Math.floor(userSettings.max_duration / 60);
        const estimatedProcessing = estimateProcessingTime(
          userSettings.max_duration,
          userSettings.default_quality
        );
        
        if (userSettings.max_duration >= 600) { // 10+ minutes
          Alert.alert(
            'Recording Notice',
            `Recording up to ${maxMinutes} minutes in ${userSettings.default_quality.toUpperCase()}.\n\n` +
            `After recording, your video will need ${formatProcessingTime(estimatedProcessing)} to apply effects.\n\n` +
            `💡 Tip: You'll see effects in preview, but processing happens after recording.`,
            [
              { text: 'Got it', onPress: () => proceedWithRecording() }
            ]
          );
          return;
        }
      }
      
      proceedWithRecording();
    }
  };

  const proceedWithRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        setRecordingDuration(0);
        
        timerRef.current = setInterval(() => {
          setRecordingDuration(prev => {
            const newDuration = prev + 1;
            const maxDuration = userSettings?.max_duration || 1800;
            
            if (newDuration >= maxDuration) {
              stopRecording();
            }
            
            return newDuration;
          });
        }, 1000);
        
        // Record with audio setting
        const video = await cameraRef.current.recordAsync({
          mute: !audioEnabled,  // Mute if audio is disabled
        });
        
        if (video && video.uri) {
          router.push({
            pathname: '/screens/preview',
            params: { 
              videoUri: video.uri,
              recordedDuration: recordingDuration.toString()
            },
          });
        }
      } catch (error) {
        console.error('Recording error:', error);
        Alert.alert('Error', 'Failed to start recording');
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const toggleCameraType = () => {
    setCameraType(cameraType === 'back' ? 'front' : 'back');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const maxDuration = userSettings?.max_duration || 1800;
  const maxMinutes = Math.floor(maxDuration / 60);

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={cameraType}
        ref={cameraRef}
        mode="video"
      >
        {/* Visual Effect Overlays - Preview Only */}
        {/* Note: Only color overlays work properly. Blur and custom backgrounds require ML person segmentation */}
        {selectedBackground && selectedBackground.type === 'color' && (
          <View style={[
            StyleSheet.absoluteFill,
            { backgroundColor: BACKGROUND_COLORS.find(c => c.id === selectedBackground.value)?.color, opacity: 0.2 }
          ]} />
        )}
        
        {/* Effects Preview Notice - Only shown when effects are selected */}
        {selectedBackground && selectedBackground.type === 'color' && (
          <View style={styles.effectsNotice}>
            <Ionicons name="eye-outline" size={14} color="#FFD700" />
            <Text style={styles.effectsNoticeText}>Color tint preview • Full effects applied after recording</Text>
          </View>
        )}
        
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/screens/settings')}
          >
            <Ionicons name="settings-outline" size={28} color="white" />
          </TouchableOpacity>
          
          <View style={styles.timerContainer}>
            <View style={[styles.recordingDot, isRecording && styles.recordingDotActive]} />
            <Text style={styles.timerText}>{formatDuration(recordingDuration)} / {maxMinutes}min</Text>
          </View>
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/screens/gallery')}
          >
            <Ionicons name="images-outline" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Background Indicator */}
        {selectedBackground && (
          <View style={styles.backgroundIndicator}>
            <Ionicons name="image-outline" size={16} color="white" />
            <Text style={styles.backgroundText}>
              {selectedBackground.type === 'blur' ? 'Blur' : 'Custom BG'}
            </Text>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/screens/backgrounds')}
          >
            <Ionicons name="color-palette-outline" size={32} color="white" />
            <Text style={styles.iconLabel}>Background</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordingButton]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? (
              <View style={styles.stopIcon} />
            ) : (
              <View style={styles.recordIcon} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleCameraType}
          >
            <Ionicons name="camera-reverse-outline" size={32} color="white" />
            <Text style={styles.iconLabel}>Flip</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Preview Button */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => router.push('/screens/filters')}
        >
          <Ionicons name="sparkles-outline" size={24} color="white" />
          <Text style={styles.filterButtonText}>Touch Up</Text>
        </TouchableOpacity>

        {/* Audio Toggle Button */}
        <TouchableOpacity
          style={styles.audioButton}
          onPress={() => setAudioEnabled(!audioEnabled)}
        >
          <Ionicons 
            name={audioEnabled ? "mic" : "mic-off"} 
            size={24} 
            color={audioEnabled ? "white" : "#FF3B30"} 
          />
        </TouchableOpacity>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#888',
    marginRight: 8,
  },
  recordingDotActive: {
    backgroundColor: '#FF3B30',
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  backgroundIndicator: {
    position: 'absolute',
    top: 120,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  backgroundText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconButton: {
    alignItems: 'center',
  },
  iconLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  recordingButton: {
    backgroundColor: 'rgba(255,59,48,0.3)',
  },
  recordIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
  },
  stopIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  filterButton: {
    position: 'absolute',
    top: 120,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74,144,226,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  effectsNotice: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  effectsNoticeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
});