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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store/useStore';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { BACKGROUND_COLORS, PREDEFINED_BACKGROUNDS } from '../constants';

export default function BackgroundsScreen() {
  const router = useRouter();
  const { selectedBackground, setSelectedBackground, backgrounds, setBackgrounds, addBackground } = useStore();
  const [loading, setLoading] = useState(false);

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

  const selectBackground = (type: string, value: string) => {
    setSelectedBackground({ type, value });
    Alert.alert('Background Selected', 'Your background has been applied', [
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
        selectBackground('custom', newBackground.id);
      } catch (error) {
        Alert.alert('Error', 'Failed to upload background');
      } finally {
        setLoading(false);
      }
    }
  };

  const downloadAndConvertToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error('Failed to download image');
    }
  };

  const selectPredefinedBackground = async (bg: typeof PREDEFINED_BACKGROUNDS[0]) => {
    try {
      setLoading(true);
      const base64Image = await downloadAndConvertToBase64(bg.url);
      const newBackground = await api.createBackground({
        name: bg.name,
        image_data: base64Image,
        is_predefined: true,
      });
      addBackground(newBackground);
      selectBackground('predefined', newBackground.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to load background');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Backgrounds</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* None Option */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>None</Text>
          <TouchableOpacity
            style={[
              styles.colorItem,
              !selectedBackground && styles.selectedItem,
            ]}
            onPress={() => {
              setSelectedBackground(null);
              router.back();
            }}
          >
            <View style={[styles.colorBox, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333' }]}>
              <Ionicons name="close" size={32} color="#fff" />
            </View>
            <Text style={styles.colorName}>No Background</Text>
            {!selectedBackground && <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />}
          </TouchableOpacity>
        </View>

        {/* Blur Option - DISABLED */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Effects (Coming Soon)</Text>
          <View style={[styles.colorItem, styles.disabledItem]}>
            <View style={[styles.colorBox, { backgroundColor: '#333' }]}>
              <Ionicons name="color-filter-outline" size={32} color="#666" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.colorName}>Blur Background</Text>
              <Text style={styles.disabledText}>Requires ML person segmentation</Text>
            </View>
            <Ionicons name="lock-closed" size={24} color="#666" />
          </View>
        </View>

        {/* Colors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solid Colors</Text>
          <View style={styles.grid}>
            {BACKGROUND_COLORS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.colorItem,
                  selectedBackground?.type === 'color' && selectedBackground?.value === item.id && styles.selectedItem,
                ]}
                onPress={() => selectBackground('color', item.id)}
              >
                <View style={[styles.colorBox, { backgroundColor: item.color }]} />
                <Text style={styles.colorName}>{item.name}</Text>
                {selectedBackground?.type === 'color' && selectedBackground?.value === item.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Predefined Backgrounds - DISABLED */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Predefined Backgrounds (Coming Soon)</Text>
          </View>
          <Text style={styles.disabledSectionText}>
            Background replacement requires ML-based person segmentation to separate you from the background. This feature will be available in a future update with proper implementation.
          </Text>
          <View style={styles.grid}>
            {PREDEFINED_BACKGROUNDS.slice(0, 3).map((bg) => (
              <View key={bg.id} style={[styles.imageItem, styles.disabledImageItem]}>
                <Image source={{ uri: bg.url }} style={[styles.imageBox, { opacity: 0.3 }]} />
                <Ionicons name="lock-closed" size={24} color="#666" style={styles.lockIcon} />
                <Text style={[styles.imageName, { color: '#666' }]}>{bg.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Custom Backgrounds - DISABLED FOR NOW */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Custom Backgrounds</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Phase 2</Text>
            </View>
          </View>
          <Text style={styles.disabledSectionText}>
            Custom backgrounds can be uploaded and saved, but require the same ML person segmentation as other background effects to actually apply them during recording.
          </Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Ionicons name="cloud-upload-outline" size={24} color="#4A90E2" />
            <Text style={styles.uploadButtonText}>Upload & Save for Later</Text>
          </TouchableOpacity>
          
          {backgrounds.filter(bg => !bg.is_predefined).length > 0 && (
            <View style={styles.grid}>
              {backgrounds
                .filter(bg => !bg.is_predefined)
                .slice(0, 3)
                .map((bg) => (
                  <View key={bg.id} style={[styles.imageItem, styles.disabledImageItem]}>
                    <Image source={{ uri: bg.image_data }} style={[styles.imageBox, { opacity: 0.3 }]} />
                    <Ionicons name="lock-closed" size={24} color="#666" style={styles.lockIcon} />
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />\n          <Text style={styles.infoText}>
            <Text style={{ fontWeight: '700' }}>Currently Available:</Text> Color tints work as overlays.{'\n\n'}
            <Text style={{ fontWeight: '700' }}>Coming Soon:</Text> Background blur and custom backgrounds require ML-based person segmentation to work properly (separating you from the background). This will be implemented in Phase 2 with proper ML integration or SDK.
          </Text>
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A90E2" />
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
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  addButton: {
    padding: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    marginBottom: 8,
  },
  selectedItem: {
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  colorBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorName: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  imageItem: {
    width: '31%',
    aspectRatio: 1,
    marginBottom: 12,
  },
  imageBox: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imageName: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    color: '#4A90E2',
    fontSize: 13,
    lineHeight: 18,
  },
  disabledItem: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  disabledSectionText: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  disabledImageItem: {
    opacity: 0.5,
  },
  lockIcon: {
    position: 'absolute',
    top: '35%',
    left: '35%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});