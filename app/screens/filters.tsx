import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useStore } from '../../src/store/useStore';
import { useRouter } from 'expo-router';

// Check if dev build is available
const isDevBuild = (() => {
  if (Platform.OS === 'web') return false;
  try {
    require('react-native-vision-camera');
    return true;
  } catch {
    return false;
  }
})();

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

  const applyPreset = (preset: 'natural' | 'warm' | 'cool' | 'vivid') => {
    let newSettings = { ...localSettings };
    switch (preset) {
      case 'natural':
        newSettings = { ...newSettings, brightness: 0.05, contrast: 0.05, saturation: 0, smoothing: 0.2 };
        break;
      case 'warm':
        newSettings = { ...newSettings, brightness: 0.1, contrast: 0.05, saturation: 0.15, smoothing: 0.3 };
        break;
      case 'cool':
        newSettings = { ...newSettings, brightness: 0, contrast: 0.1, saturation: -0.1, smoothing: 0.2 };
        break;
      case 'vivid':
        newSettings = { ...newSettings, brightness: 0.1, contrast: 0.15, saturation: 0.25, smoothing: 0.1 };
        break;
    }
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
        <Text style={styles.headerTitle}>Appearance Touch-Up</Text>
        <TouchableOpacity onPress={resetAll}>
          <Ionicons name="refresh" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Dev Build Status */}
        {isDevBuild ? (
          <View style={styles.devBuildBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#7ED321" />
            <Text style={styles.devBuildText}>Real-time filters active</Text>
          </View>
        ) : (
          <View style={styles.expoGoBanner}>
            <Ionicons name="information-circle" size={20} color="#FFA500" />
            <Text style={styles.expoGoText}>Expo Go: Settings saved for Dev Build</Text>
          </View>
        )}

        {/* Quick Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Presets</Text>
          <View style={styles.presetGrid}>
            <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('natural')}>
              <View style={[styles.presetIcon, { backgroundColor: '#E8E4D9' }]}>
                <Ionicons name="person" size={24} color="#8B7355" />
              </View>
              <Text style={styles.presetName}>Natural</Text>
              <Text style={styles.presetHint}>No changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('warm')}>
              <View style={[styles.presetIcon, { backgroundColor: '#FFE4B5' }]}>
                <Ionicons name="sunny" size={24} color="#FF8C00" />
              </View>
              <Text style={styles.presetName}>Warm</Text>
              <Text style={styles.presetHint}>Friendly</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('cool')}>
              <View style={[styles.presetIcon, { backgroundColor: '#E0F0FF' }]}>
                <Ionicons name="briefcase" size={24} color="#4A90E2" />
              </View>
              <Text style={styles.presetName}>Corporate</Text>
              <Text style={styles.presetHint}>Clean</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('vivid')}>
              <View style={[styles.presetIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="sparkles" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.presetName}>Polished</Text>
              <Text style={styles.presetHint}>Stand out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sliders Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fine-tune Adjustments</Text>
          
          {/* Brightness */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <View style={styles.sliderLabelRow}>
                <Ionicons name="sunny-outline" size={20} color="#FFD700" />
                <Text style={styles.sliderLabel}>Brightness</Text>
              </View>
              <Text style={styles.sliderValue}>{localSettings.brightness > 0 ? '+' : ''}{Math.round(localSettings.brightness * 100)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-0.5}
              maximumValue={0.5}
              value={localSettings.brightness}
              onValueChange={(value) => handleSliderChange('brightness', value)}
              minimumTrackTintColor="#FFD700"
              maximumTrackTintColor="#333"
              thumbTintColor="#FFD700"
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
                <Ionicons name="contrast-outline" size={20} color="#9370DB" />
                <Text style={styles.sliderLabel}>Contrast</Text>
              </View>
              <Text style={styles.sliderValue}>{localSettings.contrast > 0 ? '+' : ''}{Math.round(localSettings.contrast * 100)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-0.5}
              maximumValue={0.5}
              value={localSettings.contrast}
              onValueChange={(value) => handleSliderChange('contrast', value)}
              minimumTrackTintColor="#9370DB"
              maximumTrackTintColor="#333"
              thumbTintColor="#9370DB"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>Flat</Text>
              <Text style={styles.sliderLabelText}>Punchy</Text>
            </View>
          </View>

          {/* Saturation */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <View style={styles.sliderLabelRow}>
                <Ionicons name="color-palette-outline" size={20} color="#FF69B4" />
                <Text style={styles.sliderLabel}>Saturation</Text>
              </View>
              <Text style={styles.sliderValue}>{localSettings.saturation > 0 ? '+' : ''}{Math.round(localSettings.saturation * 100)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-0.5}
              maximumValue={0.5}
              value={localSettings.saturation}
              onValueChange={(value) => handleSliderChange('saturation', value)}
              minimumTrackTintColor="#FF69B4"
              maximumTrackTintColor="#333"
              thumbTintColor="#FF69B4"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>Muted</Text>
              <Text style={styles.sliderLabelText}>Vibrant</Text>
            </View>
          </View>

          {/* Smoothing */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <View style={styles.sliderLabelRow}>
                <Ionicons name="sparkles" size={20} color="#7ED321" />
                <Text style={styles.sliderLabel}>Skin Smoothing</Text>
              </View>
              <Text style={styles.sliderValue}>{Math.round(localSettings.smoothing * 100)}%</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={localSettings.smoothing}
              onValueChange={(value) => handleSliderChange('smoothing', value)}
              minimumTrackTintColor="#7ED321"
              maximumTrackTintColor="#333"
              thumbTintColor="#7ED321"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>Natural</Text>
              <Text style={styles.sliderLabelText}>Smooth</Text>
            </View>
          </View>
        </View>

        {/* Current Settings Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Current Settings</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Brightness</Text>
              <Text style={[styles.summaryValue, localSettings.brightness !== 0 && styles.summaryValueActive]}>
                {localSettings.brightness > 0 ? '+' : ''}{Math.round(localSettings.brightness * 100)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Contrast</Text>
              <Text style={[styles.summaryValue, localSettings.contrast !== 0 && styles.summaryValueActive]}>
                {localSettings.contrast > 0 ? '+' : ''}{Math.round(localSettings.contrast * 100)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Saturation</Text>
              <Text style={[styles.summaryValue, localSettings.saturation !== 0 && styles.summaryValueActive]}>
                {localSettings.saturation > 0 ? '+' : ''}{Math.round(localSettings.saturation * 100)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Smoothing</Text>
              <Text style={[styles.summaryValue, localSettings.smoothing !== 0 && styles.summaryValueActive]}>
                {Math.round(localSettings.smoothing * 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
          <Text style={styles.infoText}>
            {isDevBuild 
              ? 'Filters are applied in real-time using Skia GPU rendering during recording.'
              : 'In Expo Go, settings are saved but not applied in real-time. Create a development build to enable real-time filters.'
            }
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.doneButtonText}>Apply Filters</Text>
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
  devBuildBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(126, 211, 33, 0.1)',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(126, 211, 33, 0.3)',
  },
  devBuildText: {
    color: '#7ED321',
    fontSize: 14,
    fontWeight: '600',
  },
  expoGoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 165, 0, 0.3)',
  },
  expoGoText: {
    color: '#FFA500',
    fontSize: 14,
    fontWeight: '600',
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
  presetGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetButton: {
    alignItems: 'center',
    width: '22%',
  },
  presetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  presetHint: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
  sliderContainer: {
    marginBottom: 28,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    minWidth: 40,
    textAlign: 'right',
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
  summarySection: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '45%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#888',
    fontSize: 13,
  },
  summaryValue: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValueActive: {
    color: '#4A90E2',
  },
  infoSection: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#4A90E2',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  doneButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
