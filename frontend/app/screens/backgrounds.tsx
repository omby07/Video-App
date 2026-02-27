import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Background options
const BLUR_OPTIONS = [
  { id: 'light', name: 'Light Blur', intensity: 25 },
  { id: 'medium', name: 'Medium Blur', intensity: 50 },
  { id: 'strong', name: 'Strong Blur', intensity: 75 },
];

const SOLID_COLORS = [
  { id: 'white', name: 'White', color: '#FFFFFF' },
  { id: 'cream', name: 'Cream', color: '#F5F5DC' },
  { id: 'lightgray', name: 'Light Gray', color: '#D3D3D3' },
  { id: 'blue', name: 'Blue', color: '#4A90E2' },
  { id: 'navy', name: 'Navy', color: '#1E3A5F' },
  { id: 'green', name: 'Green', color: '#2E8B57' },
  { id: 'teal', name: 'Teal', color: '#4ECDC4' },
  { id: 'black', name: 'Black', color: '#1a1a1a' },
];

const PROFESSIONAL_GRADIENTS = [
  { id: 'office', name: 'Modern Office', colors: ['#2C3E50', '#34495E'] },
  { id: 'neutral', name: 'Neutral Wall', colors: ['#E8E8E8', '#D0D0D0'] },
  { id: 'corporate', name: 'Corporate Blue', colors: ['#1E3A5F', '#2C5282'] },
  { id: 'startup', name: 'Startup Vibe', colors: ['#4ECDC4', '#556270'] },
  { id: 'executive', name: 'Executive Gray', colors: ['#485563', '#29323C'] },
  { id: 'warm', name: 'Warm Tone', colors: ['#8B7355', '#6B5344'] },
];

export default function BackgroundsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedBackground, setSelectedBackground } = useStore();
  const [blurIntensity, setBlurIntensity] = useState(50);

  const selectNone = () => {
    setSelectedBackground(null);
    router.back();
  };

  const selectBlur = (intensity?: number) => {
    setSelectedBackground({ 
      type: 'blur', 
      value: 'blur',
      blurIntensity: intensity || blurIntensity,
    });
    Alert.alert('Blur Applied', `Background blur set to ${intensity || blurIntensity}%`, [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const selectColor = (color: typeof SOLID_COLORS[0]) => {
    setSelectedBackground({ 
      type: 'color', 
      value: color.color,
      name: color.name,
    });
    router.back();
  };

  const selectGradient = (gradient: typeof PROFESSIONAL_GRADIENTS[0]) => {
    setSelectedBackground({ 
      type: 'gradient', 
      value: gradient.id,
      gradient: gradient.colors,
      name: gradient.name,
    });
    router.back();
  };

  const isSelected = (type: string, value: string) => {
    return selectedBackground?.type === type && selectedBackground?.value === value;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Backgrounds</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* None Option */}
        <Text style={styles.sectionTitle}>None</Text>
        <TouchableOpacity
          style={[styles.option, !selectedBackground && styles.optionSelected]}
          onPress={selectNone}
        >
          <View style={styles.optionIcon}>
            <Ionicons name="close-circle-outline" size={28} color="#888" />
          </View>
          <Text style={styles.optionText}>No Background</Text>
          {!selectedBackground && <Ionicons name="checkmark-circle" size={24} color="#4ECDC4" />}
        </TouchableOpacity>

        {/* Blur Options */}
        <Text style={styles.sectionTitle}>Background Blur</Text>
        <View style={styles.blurContainer}>
          {BLUR_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.blurOption,
                selectedBackground?.type === 'blur' && 
                selectedBackground?.blurIntensity === option.intensity && 
                styles.blurOptionSelected
              ]}
              onPress={() => selectBlur(option.intensity)}
            >
              <Ionicons name="eye-off" size={24} color="#4ECDC4" />
              <Text style={styles.blurOptionText}>{option.name}</Text>
              <Text style={styles.blurIntensityText}>{option.intensity}%</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Blur Slider */}
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Custom Blur: {blurIntensity}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={10}
            maximumValue={100}
            step={5}
            value={blurIntensity}
            onValueChange={setBlurIntensity}
            minimumTrackTintColor="#4ECDC4"
            maximumTrackTintColor="#333"
            thumbTintColor="#4ECDC4"
          />
          <TouchableOpacity style={styles.applyBlurButton} onPress={() => selectBlur()}>
            <Text style={styles.applyBlurText}>Apply Custom Blur</Text>
          </TouchableOpacity>
        </View>

        {/* Solid Colors */}
        <Text style={styles.sectionTitle}>Solid Colors</Text>
        <View style={styles.colorGrid}>
          {SOLID_COLORS.map((color) => (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorOption,
                isSelected('color', color.color) && styles.colorOptionSelected
              ]}
              onPress={() => selectColor(color)}
            >
              <View style={[styles.colorCircle, { backgroundColor: color.color }]} />
              <Text style={styles.colorName}>{color.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Professional Gradients */}
        <Text style={styles.sectionTitle}>Professional Backgrounds</Text>
        {PROFESSIONAL_GRADIENTS.map((gradient) => (
          <TouchableOpacity
            key={gradient.id}
            style={[
              styles.gradientOption,
              isSelected('gradient', gradient.id) && styles.gradientOptionSelected
            ]}
            onPress={() => selectGradient(gradient)}
          >
            <View style={styles.gradientPreview}>
              <View style={[styles.gradientHalf, { backgroundColor: gradient.colors[0] }]} />
              <View style={[styles.gradientHalf, { backgroundColor: gradient.colors[1] }]} />
            </View>
            <Text style={styles.gradientName}>{gradient.name}</Text>
            {isSelected('gradient', gradient.id) && (
              <Ionicons name="checkmark-circle" size={22} color="#4ECDC4" />
            )}
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78,205,196,0.1)',
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  blurContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  blurOption: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  blurOptionSelected: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78,205,196,0.1)',
  },
  blurOptionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  blurIntensityText: {
    color: '#4ECDC4',
    fontSize: 11,
    marginTop: 4,
  },
  sliderContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  sliderLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  applyBlurButton: {
    backgroundColor: '#4ECDC4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  applyBlurText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: '22%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#4ECDC4',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#333',
  },
  colorName: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  gradientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gradientOptionSelected: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78,205,196,0.1)',
  },
  gradientPreview: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    marginRight: 14,
  },
  gradientHalf: {
    flex: 1,
  },
  gradientName: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
