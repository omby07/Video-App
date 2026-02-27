import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { segmentationService } from '../services/segmentationService';
import { backgroundProcessor } from '../utils/backgroundProcessor';

export default function SegmentationTestScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [currentEffect, setCurrentEffect] = useState<'blur' | 'green' | 'none'>('blur');

  useEffect(() => {
    initializeModel();
  }, []);

  const initializeModel = async () => {
    try {
      setLoading(true);
      console.log('[Test] Initializing segmentation model...');
      await segmentationService.initialize();
      console.log('[Test] Model initialized successfully');
      setModelReady(true);
    } catch (error) {
      console.error('[Test] Failed to initialize model:', error);
      Alert.alert('Error', 'Failed to initialize ML model: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
      setProcessedImage(null);
    }
  };

  const processImage = async () => {
    if (!selectedImage || !modelReady) {
      Alert.alert('Error', 'Please select an image and wait for model to load');
      return;
    }

    try {
      setLoading(true);
      const startTime = Date.now();

      console.log('[Test] Processing image...');

      // Load image element
      const img = await loadImageElement(selectedImage);
      console.log('[Test] Image loaded:', img.width, 'x', img.height);

      // Segment person
      console.log('[Test] Running segmentation...');
      const segmentation = await segmentationService.segmentPerson(img);
      console.log('[Test] Segmentation complete:', segmentation.length, 'segments');

      // Generate mask
      console.log('[Test] Generating mask...');
      const mask = await segmentationService.generateBinaryMask(segmentation);
      console.log('[Test] Mask generated:', mask.width, 'x', mask.height);

      // Get source image data
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      ctx.drawImage(img, 0, 0);
      const sourceImageData = ctx.getImageData(0, 0, img.width, img.height);

      // Apply effect
      let result: ImageData;
      if (currentEffect === 'blur') {
        console.log('[Test] Applying blur background...');
        result = await backgroundProcessor.applyBlurBackground(sourceImageData, mask, 15);
      } else if (currentEffect === 'green') {
        console.log('[Test] Applying green background...');
        result = await backgroundProcessor.applySolidColorBackground(
          sourceImageData,
          mask,
          { r: 0, g: 255, b: 0 }
        );
      } else {
        result = sourceImageData;
      }

      // Convert to base64
      const resultBase64 = backgroundProcessor.imageDataToBase64(result);
      setProcessedImage(resultBase64);

      const endTime = Date.now();
      setProcessingTime(endTime - startTime);
      console.log('[Test] Processing complete in', endTime - startTime, 'ms');

    } catch (error) {
      console.error('[Test] Processing failed:', error);
      Alert.alert('Error', 'Processing failed: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const loadImageElement = (uri: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = uri;
    });
  };

  const getModelInfo = () => {
    const info = segmentationService.getModelInfo();
    Alert.alert(
      'Model Info',
      `Initialized: ${info.initialized}\nBackend: ${info.backend}`
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ML Segmentation Test</Text>
        <TouchableOpacity onPress={getModelInfo}>
          <Ionicons name="information-circle" size={28} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Model Status:</Text>
            <Text style={[styles.statusValue, modelReady && styles.statusReady]}>
              {modelReady ? '✅ Ready' : '⏳ Loading...'}
            </Text>
          </View>
          {processingTime > 0 && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Processing:</Text>
              <Text style={styles.statusValue}>{processingTime}ms</Text>
            </View>
          )}
        </View>

        {/* Effect Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Effect Type</Text>
          <View style={styles.effectButtons}>
            <TouchableOpacity
              style={[styles.effectButton, currentEffect === 'blur' && styles.effectButtonActive]}
              onPress={() => setCurrentEffect('blur')}
            >
              <Text style={styles.effectButtonText}>Blur Background</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.effectButton, currentEffect === 'green' && styles.effectButtonActive]}
              onPress={() => setCurrentEffect('green')}
            >
              <Text style={styles.effectButtonText}>Green Screen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.effectButton, currentEffect === 'none' && styles.effectButtonActive]}
              onPress={() => setCurrentEffect('none')}
            >
              <Text style={styles.effectButtonText}>None</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Image Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Image</Text>
          <TouchableOpacity
            style={styles.pickButton}
            onPress={pickImage}
            disabled={loading}
          >
            <Ionicons name="image-outline" size={24} color="#4A90E2" />
            <Text style={styles.pickButtonText}>
              {selectedImage ? 'Change Image' : 'Pick Image'}
            </Text>
          </TouchableOpacity>

          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          )}
        </View>

        {/* Process Button */}
        {selectedImage && modelReady && (
          <TouchableOpacity
            style={styles.processButton}
            onPress={processImage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="play-circle" size={24} color="#fff" />
                <Text style={styles.processButtonText}>Process Image</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Result */}
        {processedImage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Result ({processingTime}ms)</Text>
            <Image source={{ uri: processedImage }} style={styles.resultImage} />
          </View>
        )}

        {/* Instructions */}
        <View style={styles.infoCard}>
          <Ionicons name="bulb-outline" size={24} color="#4A90E2" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How to Test:</Text>
            <Text style={styles.infoText}>
              1. Wait for model to load (Ready status){'\n'}
              2. Pick an image with a person{'\n'}
              3. Select effect type{'\n'}
              4. Tap "Process Image"{'\n'}
              5. Check processing time and result
            </Text>
          </View>
        </View>
      </ScrollView>

      {loading && !modelReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Initializing ML model...</Text>
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
  statusCard: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  effectButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  effectButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
  },
  effectButtonActive: {
    borderColor: '#4A90E2',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  effectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
  },
  pickButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 300,
    marginTop: 16,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  resultImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
  },
  processButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    color: '#4A90E2',
    fontSize: 13,
    lineHeight: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
});
