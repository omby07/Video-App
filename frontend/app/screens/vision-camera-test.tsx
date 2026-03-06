import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import VisionCameraView from '../../src/components/VisionCameraView';
import { BACKGROUND_COLORS } from '../../src/constants';
import { useStore } from '../../src/store/useStore';

export default function VisionCameraTestScreen() {
  const router = useRouter();
  const { filterSettings } = useStore();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [backgroundType, setBackgroundType] = useState<'none' | 'blur' | 'color' | 'image'>('none');
  const [backgroundColor, setBackgroundColor] = useState('#4A90E2');
  const [blurIntensity, setBlurIntensity] = useState(50);
  const [showFPS, setShowFPS] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const toggleFacing = () => {
    setFacing(prev => prev === 'front' ? 'back' : 'front');
  };

  const cycleBackgroundType = () => {
    setBackgroundType(prev => {
      if (prev === 'none') return 'blur';
      if (prev === 'blur') return 'color';
      if (prev === 'color') return 'image';
      return 'none';
    });
  };

  const cycleBackgroundColor = () => {
    const currentIndex = BACKGROUND_COLORS.findIndex(c => c.color === backgroundColor);
    const nextIndex = (currentIndex + 1) % BACKGROUND_COLORS.length;
    setBackgroundColor(BACKGROUND_COLORS[nextIndex].color);
  };

  const handleRecordingStarted = useCallback(() => {
    console.log('[Test] Recording started');
    setRecordingDuration(0);
  }, []);

  const handleRecordingStopped = useCallback((video: { uri: string }) => {
    console.log('[Test] Recording stopped:', video.uri);
    Alert.alert('Recording Complete', `Video saved to:\n${video.uri}`);
    setIsRecording(false);
  }, []);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <VisionCameraView
        facing={facing}
        audioEnabled={true}
        backgroundType={backgroundType}
        backgroundColor={backgroundColor}
        blurIntensity={blurIntensity}
        filterSettings={filterSettings}
        isRecording={isRecording}
        showFPS={showFPS}
        onCameraReady={() => {
          console.log('[Test] Camera ready');
          setCameraReady(true);
        }}
        onRecordingStarted={handleRecordingStarted}
        onRecordingStopped={handleRecordingStopped}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vision Camera Test</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Camera Status */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Camera:</Text>
              <Text style={[styles.statusValue, cameraReady && styles.statusReady]}>
                {cameraReady ? '✅ Ready' : '⏳ Loading'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Facing:</Text>
              <Text style={styles.statusValue}>{facing}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Effect:</Text>
              <Text style={styles.statusValue}>
                {backgroundType === 'none' && 'None'}
                {backgroundType === 'blur' && `Blur (${blurIntensity}%)`}
                {backgroundType === 'color' && `Color`}
                {backgroundType === 'image' && 'Custom Image'}
              </Text>
            </View>
            {backgroundType === 'color' && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Color:</Text>
                <View style={[styles.colorDot, { backgroundColor }]} />
              </View>
            )}
          </View>

          {/* Control Buttons Row 1 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleFacing}
            >
              <Ionicons name="camera-reverse" size={24} color="#fff" />
              <Text style={styles.buttonText}>Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.primaryButton]}
              onPress={cycleBackgroundType}
            >
              <Ionicons 
                name={backgroundType === 'none' ? 'eye-off' : 'color-filter'} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.buttonText}>
                {backgroundType === 'none' && 'No Effect'}
                {backgroundType === 'blur' && 'Blur'}
                {backgroundType === 'color' && 'Color'}
                {backgroundType === 'image' && 'Image'}
              </Text>
            </TouchableOpacity>

            {backgroundType === 'color' && (
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor }]}
                onPress={cycleBackgroundColor}
              >
                <Ionicons name="color-palette" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Record Button */}
          <TouchableOpacity
            style={[
              styles.recordButton, 
              isRecording && styles.recordButtonActive
            ]}
            onPress={toggleRecording}
          >
            {isRecording ? (
              <View style={styles.stopIcon} />
            ) : (
              <View style={styles.recordIcon} />
            )}
            <Text style={styles.recordButtonText}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
          </TouchableOpacity>

          {/* FPS Toggle */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Show FPS Counter</Text>
            <Switch
              value={showFPS}
              onValueChange={setShowFPS}
              trackColor={{ false: '#333', true: '#4A90E2' }}
              thumbColor={showFPS ? '#fff' : '#888'}
            />
          </View>

          {/* Instructions */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#4A90E2" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Testing Instructions:</Text>
              <Text style={styles.infoText}>
                1. Wait for camera to initialize{'\n'}
                2. Tap effect button to cycle through effects{'\n'}
                3. Check FPS counter (should show ~30fps){'\n'}
                4. Test recording with/without effects
              </Text>
            </View>
          </View>
        </View>
      </VisionCameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusLabel: {
    color: '#888',
    fontSize: 14,
  },
  statusValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusReady: {
    color: '#7ED321',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,59,48,0.3)',
    borderWidth: 2,
    borderColor: '#FF3B30',
    marginBottom: 16,
  },
  recordButtonActive: {
    backgroundColor: 'rgba(255,59,48,0.8)',
  },
  recordIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
  },
  stopIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 14,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: '#4A90E2',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoText: {
    color: '#4A90E2',
    fontSize: 12,
    lineHeight: 18,
  },
});
