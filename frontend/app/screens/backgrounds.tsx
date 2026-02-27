import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../../src/store/useStore';
import { useRouter } from 'expo-router';
import { api } from '../../src/utils/api';
import { 
  BACKGROUND_COLORS, 
  PREDEFINED_BACKGROUNDS, 
  PROFESSIONAL_BACKGROUNDS,
  BRAND_COLOR_PRESETS,
} from '../../src/constants';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function BackgroundsScreen() {
  const router = useRouter();
  const { selectedBackground, setSelectedBackground, backgrounds, setBackgrounds, addBackground } = useStore();
  const [loading, setLoading] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState(50);
  const [activeTab, setActiveTab] = useState<'professional' | 'colors' | 'brand' | 'custom'>('professional');
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [customBrandColor, setCustomBrandColor] = useState('#4ECDC4');

  useEffect(() => {
    loadBackgrounds();
  }, []);

  const loadBackgrounds = async () => {
    try {
      setLoading(true);
      const data = await api.getBackgrounds();
      setBackgrounds(data);
    } catch (error) {
      console.error('Failed to load backgrounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectBackground = (type: string, value: string, extra?: any) => {
    setSelectedBackground({ type, value, ...extra });
    Alert.alert('Background Selected', 'Your background has been applied', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const selectProfessionalBackground = (bg: typeof PROFESSIONAL_BACKGROUNDS[0]) => {
    setSelectedBackground({ 
      type: 'professional', 
      value: bg.id, 
      gradient: bg.gradient,
      name: bg.name,
    });
    Alert.alert('Professional Background Selected', bg.name, [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const selectBrandBackground = (brand: typeof BRAND_COLOR_PRESETS[0]) => {
    setSelectedBackground({ 
      type: 'brand', 
      value: brand.id, 
      colors: brand.colors,
      name: brand.name,
    });
    Alert.alert('Brand Background Selected', `${brand.name} colors applied`, [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const applyCustomBrandColor = () => {
    setSelectedBackground({ 
      type: 'custom-brand', 
      value: customBrandColor,
      name: 'Custom Brand',
    });
    setShowBrandPicker(false);
    Alert.alert('Custom Brand Color Applied', customBrandColor, [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const selectBlurBackground = () => {
    setSelectedBackground({ type: 'blur', value: 'blur', blurIntensity });
    Alert.alert('Blur Background Selected', `Blur intensity: ${blurIntensity}%`, [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      try {
        setLoading(true);
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const newBackground = await api.createBackground({
          name: 'Custom Background',
          image_data: base64Image,
          is_predefined: false,
        });
        addBackground(newBackground);
        selectBackground('image', newBackground.id, { imageUri: base64Image });
      } catch (error) {
        Alert.alert('Error', 'Failed to upload background');
      } finally {
        setLoading(false);
      }
    }
  };

  const tabs = [
    { id: 'professional', label: 'Professional', icon: 'briefcase' },
    { id: 'brand', label: 'Brand', icon: 'color-palette' },
    { id: 'colors', label: 'Colors', icon: 'ellipse' },
    { id: 'custom', label: 'Custom', icon: 'image' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Backgrounds</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id as typeof activeTab)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={18} 
              color={activeTab === tab.id ? '#4ECDC4' : '#888'} 
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Professional Backgrounds Tab */}
        {activeTab === 'professional' && (
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>
              Professional backgrounds optimized for video interviews
            </Text>

            {/* None Option */}
            <TouchableOpacity
              style={[styles.bgOption, !selectedBackground && styles.selectedBgOption]}
              onPress={() => {
                setSelectedBackground(null);
                router.back();
              }}
            >
              <View style={[styles.bgPreview, { backgroundColor: '#1a1a1a' }]}>
                <Ionicons name="close-circle-outline" size={32} color="#666" />
              </View>
              <View style={styles.bgInfo}>
                <Text style={styles.bgName}>No Background</Text>
                <Text style={styles.bgDescription}>Use your actual background</Text>
              </View>
              {!selectedBackground && <Ionicons name="checkmark-circle" size={24} color="#4ECDC4" />}
            </TouchableOpacity>

            {/* Blur Option */}
            <TouchableOpacity
              style={[styles.bgOption, selectedBackground?.type === 'blur' && styles.selectedBgOption]}
              onPress={selectBlurBackground}
            >
              <View style={[styles.bgPreview, { backgroundColor: '#2a2a2a' }]}>
                <Ionicons name="eye-off-outline" size={32} color="#4ECDC4" />
              </View>
              <View style={styles.bgInfo}>
                <Text style={styles.bgName}>Background Blur</Text>
                <Text style={styles.bgDescription}>Softly blur your surroundings</Text>
              </View>
              {selectedBackground?.type === 'blur' && <Ionicons name="checkmark-circle" size={24} color="#4ECDC4" />}
            </TouchableOpacity>

            {selectedBackground?.type === 'blur' && (
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Blur Intensity: {blurIntensity}%</Text>
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
              </View>
            )}

            {/* Professional Gradient Backgrounds */}
            <Text style={styles.sectionTitle}>Professional Environments</Text>
            {PROFESSIONAL_BACKGROUNDS.map((bg) => (
              <TouchableOpacity
                key={bg.id}
                style={[
                  styles.bgOption,
                  selectedBackground?.value === bg.id && styles.selectedBgOption
                ]}
                onPress={() => selectProfessionalBackground(bg)}
              >
                <LinearGradient
                  colors={bg.gradient as [string, string]}
                  style={styles.bgPreview}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.bgInfo}>
                  <Text style={styles.bgName}>{bg.name}</Text>
                  <Text style={styles.bgDescription}>{bg.description}</Text>
                </View>
                {selectedBackground?.value === bg.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#4ECDC4" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Brand Colors Tab */}
        {activeTab === 'brand' && (
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>
              Match your background to the company you're applying to
            </Text>

            {/* Popular Companies */}
            <Text style={styles.sectionTitle}>Popular Companies</Text>
            <View style={styles.brandGrid}>
              {BRAND_COLOR_PRESETS.map((brand) => (
                <TouchableOpacity
                  key={brand.id}
                  style={[
                    styles.brandItem,
                    selectedBackground?.value === brand.id && styles.selectedBrandItem
                  ]}
                  onPress={() => selectBrandBackground(brand)}
                >
                  <View style={styles.brandColors}>
                    {brand.colors.slice(0, 2).map((color, i) => (
                      <View 
                        key={i}
                        style={[styles.brandColorDot, { backgroundColor: color }]} 
                      />
                    ))}
                  </View>
                  <Text style={styles.brandName}>{brand.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Brand Color */}
            <Text style={styles.sectionTitle}>Custom Brand Color</Text>
            <TouchableOpacity
              style={styles.customBrandButton}
              onPress={() => setShowBrandPicker(true)}
            >
              <View style={[styles.customColorPreview, { backgroundColor: customBrandColor }]} />
              <View style={styles.customBrandInfo}>
                <Text style={styles.customBrandTitle}>Enter Company Color</Text>
                <Text style={styles.customBrandSubtitle}>Use hex code from company website</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        )}

        {/* Basic Colors Tab */}
        {activeTab === 'colors' && (
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>
              Simple solid color backgrounds
            </Text>
            
            <View style={styles.colorGrid}>
              {BACKGROUND_COLORS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.colorItem,
                    selectedBackground?.value === item.id && styles.selectedColorItem
                  ]}
                  onPress={() => selectBackground('color', item.id)}
                >
                  <View style={[styles.colorCircle, { backgroundColor: item.color }]} />
                  <Text style={styles.colorName}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Custom Upload Tab */}
        {activeTab === 'custom' && (
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>
              Upload your own background image
            </Text>

            <TouchableOpacity 
              style={[styles.uploadButton, !isDevBuild && styles.uploadButtonDisabled]} 
              onPress={pickImage}
              disabled={!isDevBuild}
            >
              <Ionicons name="cloud-upload-outline" size={32} color={isDevBuild ? "#4ECDC4" : "#666"} />
              <Text style={[styles.uploadButtonText, !isDevBuild && { color: '#666' }]}>
                {isDevBuild ? 'Upload Custom Background' : 'Requires Native Build'}
              </Text>
              <Text style={styles.uploadHint}>JPG, PNG up to 5MB</Text>
            </TouchableOpacity>

            {/* Predefined Images */}
            <Text style={styles.sectionTitle}>Stock Backgrounds</Text>
            <View style={styles.imageGrid}>
              {PREDEFINED_BACKGROUNDS.map((bg) => (
                <TouchableOpacity
                  key={bg.id}
                  style={[
                    styles.imageItem,
                    selectedBackground?.value === bg.id && styles.selectedImageItem,
                    !isDevBuild && styles.disabledImageItem,
                  ]}
                  onPress={() => isDevBuild && selectBackground('predefined', bg.id, { url: bg.url })}
                  disabled={!isDevBuild}
                >
                  <Image source={{ uri: bg.url }} style={styles.imagePreview} />
                  {!isDevBuild && (
                    <View style={styles.lockOverlay}>
                      <Ionicons name="lock-closed" size={20} color="#fff" />
                    </View>
                  )}
                  <Text style={styles.imageName}>{bg.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="bulb-outline" size={20} color="#FFB347" />
          <Text style={styles.infoText}>
            Pro tip: Neutral backgrounds help interviewers focus on you, not your surroundings.
          </Text>
        </View>
      </ScrollView>

      {/* Brand Color Picker Modal */}
      <Modal
        visible={showBrandPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBrandPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Brand Color</Text>
              <TouchableOpacity onPress={() => setShowBrandPicker(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Enter the hex color code from the company's website or brand guidelines
            </Text>

            <View style={styles.colorInputContainer}>
              <Text style={styles.colorInputLabel}>#</Text>
              <TextInput
                style={styles.colorInput}
                value={customBrandColor.replace('#', '')}
                onChangeText={(text) => setCustomBrandColor('#' + text.replace('#', ''))}
                placeholder="4ECDC4"
                placeholderTextColor="#666"
                maxLength={6}
                autoCapitalize="characters"
              />
            </View>

            <View style={[styles.colorPreviewLarge, { backgroundColor: customBrandColor }]}>
              <Text style={styles.colorPreviewText}>{customBrandColor.toUpperCase()}</Text>
            </View>

            <TouchableOpacity style={styles.applyButton} onPress={applyCustomBrandColor}>
              <Text style={styles.applyButtonText}>Apply Color</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4ECDC4" />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(78,205,196,0.15)',
  },
  tabText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4ECDC4',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  bgOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBgOption: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78,205,196,0.1)',
  },
  bgPreview: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bgInfo: {
    flex: 1,
  },
  bgName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  bgDescription: {
    color: '#888',
    fontSize: 12,
  },
  sliderContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  sliderLabel: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  brandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  brandItem: {
    width: '31%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBrandItem: {
    borderColor: '#4ECDC4',
  },
  brandColors: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 4,
  },
  brandColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  brandName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  customBrandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  customColorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  customBrandInfo: {
    flex: 1,
  },
  customBrandTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  customBrandSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorItem: {
    borderColor: '#4ECDC4',
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#333',
  },
  colorName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  uploadButtonDisabled: {
    borderColor: '#444',
  },
  uploadButtonText: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  uploadHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedImageItem: {
    borderColor: '#4ECDC4',
  },
  disabledImageItem: {
    opacity: 0.5,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageName: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,179,71,0.1)',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#FFB347',
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  colorInputLabel: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 4,
  },
  colorInput: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 16,
  },
  colorPreviewLarge: {
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  colorPreviewText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  applyButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
