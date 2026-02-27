import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useStore } from '../store/useStore';
import { useRouter } from 'expo-router';

export default function FiltersScreen() {
  const router = useRouter();
  const { filterSettings, setFilterSettings } = useStore();
  const [localSettings, setLocalSettings] = useState(filterSettings);

  const handleSliderChange = (key: string, value: number) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setFilterSettings(newSettings);
  };

  const resetAll = () => {
    const resetSettings = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      smoothing: 0,
      level: 'basic' as const,
    };
    setLocalSettings(resetSettings);
    setFilterSettings(resetSettings);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance Touch-Up</Text>
        <TouchableOpacity onPress={resetAll}>
          <Ionicons name="refresh" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Important Notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle" size={24} color="#FFA500" />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Phase 2 Feature</Text>
            <Text style={styles.noticeText}>
              These adjustments are saved but not currently applied to videos in real-time. Real-time filters require:
              {'\n\n'}• expo-gl with custom GLSL shaders
              {'\n'}• Or third-party video SDK
              {'\n\n'}Will be implemented in Phase 2 with proper video processing pipeline.
            </Text>
          </View>
        </View>

        {/* Sliders Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adjustments (Preview Only)</Text>
          
          {/* Brightness */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <View style={styles.sliderLabelRow}>
                <Ionicons name="sunny-outline" size={20} color="#888" />
                <Text style={styles.sliderLabel}>Brightness</Text>
              </View>
              <Text style={styles.sliderValue}>{Math.round(localSettings.brightness * 100)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-0.5}
              maximumValue={0.5}
              value={localSettings.brightness}
              onValueChange={(value) => handleSliderChange('brightness', value)}
              minimumTrackTintColor="#4A90E2"
              maximumTrackTintColor="#333"
              thumbTintColor="#4A90E2"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>Darker</Text>
              <Text style={styles.sliderLabelText}>Brighter</Text>
            </View>
          </View>

          {/* Contrast */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <View style={styles.sliderLabelRow}>
                <Ionicons name="contrast-outline" size={20} color="#888" />
                <Text style={styles.sliderLabel}>Contrast</Text>
              </View>
              <Text style={styles.sliderValue}>{Math.round(localSettings.contrast * 100)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-0.5}
              maximumValue={0.5}
              value={localSettings.contrast}
              onValueChange={(value) => handleSliderChange('contrast', value)}
              minimumTrackTintColor="#4A90E2"
              maximumTrackTintColor="#333"
              thumbTintColor="#4A90E2"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>Less</Text>
              <Text style={styles.sliderLabelText}>More</Text>
            </View>
          </View>

          {/* Saturation */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <View style={styles.sliderLabelRow}>
                <Ionicons name="color-palette-outline" size={20} color="#888" />
                <Text style={styles.sliderLabel}>Saturation</Text>
              </View>
              <Text style={styles.sliderValue}>{Math.round(localSettings.saturation * 100)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-0.5}
              maximumValue={0.5}
              value={localSettings.saturation}
              onValueChange={(value) => handleSliderChange('saturation', value)}
              minimumTrackTintColor="#4A90E2"
              maximumTrackTintColor="#333"
              thumbTintColor="#4A90E2"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>B&W</Text>
              <Text style={styles.sliderLabelText}>Vibrant</Text>
            </View>
          </View>

          {/* Smoothing */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <View style={styles.sliderLabelRow}>
                <Ionicons name="sparkles-outline" size={20} color="#888" />
                <Text style={styles.sliderLabel}>Skin Smoothing</Text>
              </View>
              <Text style={styles.sliderValue}>{Math.round(localSettings.smoothing * 100)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={localSettings.smoothing}
              onValueChange={(value) => handleSliderChange('smoothing', value)}
              minimumTrackTintColor="#4A90E2"
              maximumTrackTintColor="#333"
              thumbTintColor="#4A90E2"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>None</Text>
              <Text style={styles.sliderLabelText}>Maximum</Text>
            </View>
          </View>
        </View>

        {/* What's Saved */}
        <View style={styles.savedSection}>
          <Text style={styles.savedTitle}>These Settings Are:</Text>
          <View style={styles.savedItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
            <Text style={styles.savedText}>Saved to your preferences</Text>
          </View>
          <View style={styles.savedItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
            <Text style={styles.savedText}>Stored with video metadata</Text>
          </View>
          <View style={styles.savedItem}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.savedText}>Not applied in real-time (Phase 2)</Text>
          </View>
        </View>

        {/* Implementation Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Why Don't These Work Yet?</Text>
          <Text style={styles.infoText}>
            Real-time video filters require one of:{'\n\n'}
            <Text style={styles.infoBullet}>• expo-gl</Text> with custom GLSL shaders for GPU processing{'\n'}
            <Text style={styles.infoBullet}>• Native camera</Text> filter APIs (platform-specific){'\n'}
            <Text style={styles.infoBullet}>• Third-party SDK</Text> like Stream.io or Agora{'\n\n'}
            These require significant development time and either native code or SDK integration. They will be properly implemented in Phase 2.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
          <Text style={styles.doneButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    color: '#FFA500',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  noticeText: {
    color: '#FFA500',
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
  },
  sliderContainer: {
    marginBottom: 32,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  sliderValue: {
    color: '#4A90E2',
    fontSize: 15,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabelText: {
    color: '#666',
    fontSize: 12,
  },
  savedSection: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  savedTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  savedText: {
    color: '#888',
    fontSize: 13,
  },
  infoSection: {
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    color: '#888',
    fontSize: 13,
    lineHeight: 20,
  },
  infoBullet: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  doneButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
