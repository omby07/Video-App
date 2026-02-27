import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import VisionCameraView from '../../src/components/VisionCameraView';

export default function VisionCameraTestScreen() {
  const router = useRouter();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [backgroundType, setBackgroundType] = useState<'none' | 'blur' | 'color'>('none');
  const [showFPS, setShowFPS] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);

  const toggleFacing = () => {
    setFacing(prev => prev === 'front' ? 'back' : 'front');
  };

  const cycleBackgroundType = () => {
    setBackgroundType(prev => {
      if (prev === 'none') return 'blur';
      if (prev === 'blur') return 'color';
      return 'none';
    });
  };

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <VisionCameraView
        facing={facing}
        audioEnabled={true}
        backgroundType={backgroundType}
        backgroundColor={{ r: 0, g: 255, b: 0 }}
        showFPS={showFPS}
        onCameraReady={() => {
          console.log('[Test] Camera ready');
          setCameraReady(true);
        }}
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
              <Text style={styles.statusValue}>{backgroundType}</Text>
            </View>
          </View>

          {/* Control Buttons */}
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
                {backgroundType === 'none' && 'Enable Effect'}
                {backgroundType === 'blur' && 'Blur Active'}
                {backgroundType === 'color' && 'Color Active'}
              </Text>
            </TouchableOpacity>
          </View>

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
                2. Tap "Enable Effect" to cycle through effects{'\n'}
                3. Check FPS counter (should show ~30fps){'\n'}
                4. Flip camera to test both sides{'\n'}
                5. Watch console logs for frame processing
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
