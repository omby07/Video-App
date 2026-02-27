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
import { FILTER_PRESETS } from '../constants';

export default function FiltersScreen() {
  const router = useRouter();
  const { filterSettings, setFilterSettings, setFilterLevel } = useStore();
  const [localSettings, setLocalSettings] = useState(filterSettings);

  const handleLevelChange = (level: 'simple' | 'basic' | 'advanced') => {
    const preset = FILTER_PRESETS[level];
    setLocalSettings({ ...preset, level });
    setFilterLevel(level);
  };

  const handleSliderChange = (key: string, value: number) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setFilterSettings(newSettings);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Touch Up</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Level Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enhancement Level</Text>
          <View style={styles.levelContainer}>
            {(['simple', 'basic', 'advanced'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelButton,
                  localSettings.level === level && styles.levelButtonActive,
                ]}
                onPress={() => handleLevelChange(level)}
              >
                <Text
                  style={[
                    styles.levelButtonText,
                    localSettings.level === level && styles.levelButtonTextActive,
                  ]}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Manual Adjustments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual Adjustments</Text>
          
          {/* Brightness */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Brightness</Text>
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
          </View>

          {/* Contrast */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Contrast</Text>
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
          </View>

          {/* Saturation */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Saturation</Text>
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
          </View>

          {/* Smoothing */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Skin Smoothing</Text>
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
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#888" />
          <Text style={styles.infoText}>
            These settings will be applied to your video recording in real-time where supported by your device.
          </Text>
        </View>
      </ScrollView>
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
  doneText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
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
    marginBottom: 16,
  },
  levelContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  levelButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  levelButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  levelButtonTextActive: {
    color: '#fff',
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    color: '#fff',
    fontSize: 14,
  },
  sliderValue: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  infoContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
});