import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import SegmentedCameraView for ML person segmentation
let SegmentedCameraView: any = null;
let useSegmentationFeatures: any = () => ({ isNativeAvailable: false, supportsSegmentation: false });

try {
  const cameraModule = require('../../src/components/SegmentedCameraView');
  SegmentedCameraView = cameraModule.default;
  useSegmentationFeatures = cameraModule.useSegmentationFeatures;
} catch (e) {
  console.log('[CameraScreen] SegmentedCameraView not available:', e);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isNativeAvailable } = useMLCameraFeatures();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const timerRef = useRef<any>(null);
  
  // Store
  const {
    cameraType,
    setCameraType,
    userSettings,
    selectedBackground,
    filterSettings,
    audioEnabled,
    setAudioEnabled,
  } = useStore();

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Determine background effect type
  const getBackgroundEffect = useCallback(() => {
    if (!selectedBackground) return 'none';
    if (selectedBackground.type === 'blur') return 'blur';
    if (selectedBackground.type === 'color' || selectedBackground.type === 'professional') return 'color';
    return 'none';
  }, [selectedBackground]);

  const handleCameraReady = useCallback(() => {
    console.log('[CameraScreen] Camera ready');
    setIsCameraReady(true);
  }, []);

  const handleRecordingStarted = useCallback(() => {
    console.log('[CameraScreen] Recording started');
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => {
        const newDuration = prev + 1;
        // Check max duration
        if (userSettings?.max_duration && newDuration >= userSettings.max_duration) {
          setIsRecording(false);
        }
        return newDuration;
      });
    }, 1000);
  }, [userSettings]);

  const handleRecordingFinished = useCallback((video: { uri: string; duration: number }) => {
    console.log('[CameraScreen] Recording finished:', video);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Navigate to preview
    router.push({
      pathname: '/screens/preview',
      params: {
        videoUri: video.uri,
        recordedDuration: video.duration.toString(),
      },
    });
  }, [router]);

  const handleRecordingError = useCallback((error: Error) => {
    console.error('[CameraScreen] Recording error:', error);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    Alert.alert('Recording Error', error.message || 'Failed to record video');
  }, []);

  const toggleRecording = useCallback(() => {
    if (!isCameraReady) {
      Alert.alert('Camera not ready', 'Please wait for the camera to initialize');
      return;
    }
    setIsRecording(prev => !prev);
  }, [isCameraReady]);

  const toggleCamera = useCallback(() => {
    setCameraType(cameraType === 'back' ? 'front' : 'back');
  }, [cameraType, setCameraType]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get selected background color for display
  const getBackgroundDisplayInfo = () => {
    if (!selectedBackground) return null;
    if (selectedBackground.type === 'blur') {
      return { label: 'Blur', color: '#4ECDC4' };
    }
    if (selectedBackground.type === 'professional') {
      return { label: selectedBackground.name || 'Professional', color: '#4ECDC4' };
    }
    if (selectedBackground.type === 'color') {
      return { label: 'Color BG', color: selectedBackground.value };
    }
    return null;
  };

  const bgInfo = getBackgroundDisplayInfo();

  // Fallback if MLCameraView isn't available
  if (!MLCameraView) {
    return (
      <View style={styles.container}>
        <View style={styles.fallbackContainer}>
          <Ionicons name="videocam" size={64} color="#4ECDC4" />
          <Text style={styles.fallbackTitle}>Camera Loading...</Text>
          <Text style={styles.fallbackText}>Please wait or restart the app</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ML Camera View - Full Screen */}
      <MLCameraView
        facing={cameraType as 'front' | 'back'}
        isActive={true}
        enableAudio={audioEnabled}
        backgroundEffect={getBackgroundEffect() as any}
        blurIntensity={selectedBackground?.blurIntensity || 50}
        backgroundColor={selectedBackground?.value}
        backgroundGradient={selectedBackground?.gradient}
        filterSettings={filterSettings}
        isRecording={isRecording}
        onCameraReady={handleCameraReady}
        onRecordingStarted={handleRecordingStarted}
        onRecordingFinished={handleRecordingFinished}
        onRecordingError={handleRecordingError}
        showEffectBadges={false}
        style={styles.fullScreenCamera}
      />

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.topButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        
        {/* Recording Timer */}
        {isRecording && (
          <View style={styles.recordingTimer}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTimerText}>{formatDuration(recordingDuration)}</Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.topButton} onPress={() => router.push('/screens/settings')}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Side Controls */}
      <View style={styles.sideControls}>
        {/* Flip Camera */}
        <TouchableOpacity style={styles.sideButton} onPress={toggleCamera}>
          <Ionicons name="camera-reverse" size={24} color="#fff" />
          <Text style={styles.sideButtonText}>Flip</Text>
        </TouchableOpacity>
        
        {/* Audio Toggle */}
        <TouchableOpacity style={styles.sideButton} onPress={() => setAudioEnabled(!audioEnabled)}>
          <Ionicons name={audioEnabled ? "mic" : "mic-off"} size={24} color={audioEnabled ? "#fff" : "#FF3B30"} />
          <Text style={styles.sideButtonText}>{audioEnabled ? "Mic On" : "Mic Off"}</Text>
        </TouchableOpacity>
        
        {/* Interview Mode */}
        <TouchableOpacity 
          style={[styles.sideButton, styles.interviewButton]} 
          onPress={() => router.push('/screens/interview-mode')}
        >
          <Ionicons name="briefcase" size={24} color="#4ECDC4" />
          <Text style={[styles.sideButtonText, { color: '#4ECDC4' }]}>Interview</Text>
        </TouchableOpacity>
      </View>

      {/* Effect Indicators */}
      {(bgInfo || (filterSettings && filterSettings.brightness !== 0)) && (
        <View style={styles.effectIndicators}>
          {bgInfo && (
            <View style={[styles.effectBadge, { backgroundColor: 'rgba(78,205,196,0.9)' }]}>
              <Ionicons name="layers" size={14} color="#fff" />
              <Text style={styles.effectBadgeText}>{bgInfo.label}</Text>
            </View>
          )}
          {filterSettings && (filterSettings.brightness !== 0 || filterSettings.contrast !== 0 || filterSettings.smoothing > 0) && (
            <View style={[styles.effectBadge, { backgroundColor: 'rgba(255,179,71,0.9)' }]}>
              <Ionicons name="color-wand" size={14} color="#fff" />
              <Text style={styles.effectBadgeText}>Touch-up</Text>
            </View>
          )}
        </View>
      )}

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
        {/* Background Button */}
        <TouchableOpacity 
          style={styles.bottomButton} 
          onPress={() => router.push('/screens/backgrounds')}
          disabled={isRecording}
        >
          <View style={[styles.bottomButtonIcon, bgInfo && { borderColor: '#4ECDC4' }]}>
            <Ionicons name="image-outline" size={22} color={bgInfo ? "#4ECDC4" : "#fff"} />
          </View>
          <Text style={styles.bottomButtonText}>Background</Text>
        </TouchableOpacity>

        {/* Record Button */}
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={toggleRecording}
          disabled={!isCameraReady}
        >
          {isRecording ? (
            <View style={styles.stopIcon} />
          ) : (
            <View style={styles.recordInner} />
          )}
        </TouchableOpacity>

        {/* Filters Button */}
        <TouchableOpacity 
          style={styles.bottomButton} 
          onPress={() => router.push('/screens/filters')}
          disabled={isRecording}
        >
          <View style={[
            styles.bottomButtonIcon, 
            filterSettings && (filterSettings.brightness !== 0 || filterSettings.smoothing > 0) && { borderColor: '#FFB347' }
          ]}>
            <Ionicons 
              name="sparkles-outline" 
              size={22} 
              color={filterSettings && (filterSettings.brightness !== 0 || filterSettings.smoothing > 0) ? "#FFB347" : "#fff"} 
            />
          </View>
          <Text style={styles.bottomButtonText}>Touch-up</Text>
        </TouchableOpacity>
      </View>

      {/* Camera Loading */}
      {!isCameraReady && (
        <View style={styles.loadingOverlay}>
          <Ionicons name="videocam" size={48} color="#4ECDC4" />
          <Text style={styles.loadingText}>Initializing camera...</Text>
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
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  recordingTimerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sideControls: {
    position: 'absolute',
    right: 16,
    top: '30%',
    gap: 20,
    zIndex: 10,
  },
  sideButton: {
    alignItems: 'center',
    gap: 4,
  },
  sideButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  interviewButton: {
    backgroundColor: 'rgba(78,205,196,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(78,205,196,0.4)',
  },
  effectIndicators: {
    position: 'absolute',
    top: 110,
    left: 16,
    gap: 8,
    zIndex: 10,
  },
  effectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  effectBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 10,
  },
  bottomButton: {
    alignItems: 'center',
    gap: 8,
  },
  bottomButtonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bottomButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
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
  recordButtonActive: {
    backgroundColor: 'rgba(255,59,48,0.3)',
    borderColor: '#FF3B30',
  },
  recordInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
  },
  stopIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#fff',
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
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
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
});
