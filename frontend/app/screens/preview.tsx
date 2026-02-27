import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { api } from '../../src/utils/api';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import ProcessingScreen from '../components/ProcessingScreen';
import {
  estimateProcessingTime,
  formatProcessingTime,
  getProcessingDescription,
  estimateFileSize,
  prepareFilterSettings,
} from '../../src/utils/videoProcessor';

type ProcessingQuality = 'quick' | 'balanced' | 'best';

export default function PreviewWithProcessingScreen() {
  const { videoUri, recordedDuration } = useLocalSearchParams();
  const router = useRouter();
  const videoRef = useRef<any>(null);
  const [title, setTitle] = useState(`Video ${new Date().toLocaleDateString()}`);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [selectedProcessingQuality, setSelectedProcessingQuality] = useState<ProcessingQuality>('balanced');
  
  const {
    userSettings,
    filterSettings,
    selectedBackground,
    addVideo,
  } = useStore();

  const duration = parseInt(recordedDuration as string) || 0;
  const quality = userSettings?.default_quality || 'hd';
  
  const estimatedTime = estimateProcessingTime(duration, quality);
  const quickTime = Math.ceil(estimatedTime * 0.5);
  const bestTime = Math.ceil(estimatedTime * 1.3);

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const generateThumbnail = async (uri: string): Promise<string | null> => {
    try {
      const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(uri, {
        time: 0,
      });
      const base64 = await FileSystem.readAsStringAsync(thumbnailUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return null;
    }
  };

  const handleProcessAndSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your video');
      return;
    }

    setShowProcessing(true);
  };

  const handleProcessingComplete = async (processedUri: string) => {
    try {
      // Read processed video as base64
      const base64Video = await FileSystem.readAsStringAsync(processedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Generate thumbnail
      const thumbnail = await generateThumbnail(processedUri);

      // Prepare video data
      const videoData = {
        title: title.trim(),
        duration,
        quality: userSettings?.default_quality || 'hd',
        background_type: selectedBackground?.type,
        background_value: selectedBackground?.value,
        filters_applied: prepareFilterSettings(filterSettings),
        video_data: `data:video/mp4;base64,${base64Video}`,
        thumbnail,
      };

      // Save to backend
      const savedVideo = await api.createVideo(videoData);
      addVideo(savedVideo);

      // Clean up temp files
      try {
        await FileSystem.deleteAsync(videoUri as string, { idempotent: true });
        await FileSystem.deleteAsync(processedUri, { idempotent: true });
      } catch (e) {
        console.log('Cleanup warning:', e);
      }

      Alert.alert('Success', 'Video saved successfully!', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save video. Please try again.');
      setShowProcessing(false);
    }
  };

  const handleProcessingCancel = () => {
    setShowProcessing(false);
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Video',
      'Are you sure you want to discard this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => router.replace('/'),
        },
      ]
    );
  };

  const handleSaveRaw = async () => {
    Alert.alert(
      'Save Without Processing?',
      'Video will be saved without effects applied. This is instant but effects won\'t be in the final video.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save Raw',
          onPress: async () => {
            try {
              const base64Video = await FileSystem.readAsStringAsync(videoUri as string, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const thumbnail = await generateThumbnail(videoUri as string);

              const videoData = {
                title: title.trim() || `Video ${new Date().toLocaleDateString()}`,
                duration,
                quality: userSettings?.default_quality || 'hd',
                filters_applied: ['raw_unprocessed'],
                video_data: `data:video/mp4;base64,${base64Video}`,
                thumbnail,
              };

              const savedVideo = await api.createVideo(videoData);
              addVideo(savedVideo);

              Alert.alert('Success', 'Raw video saved!', [
                { text: 'OK', onPress: () => router.replace('/') },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to save video');
            }
          },
        },
      ]
    );
  };

  if (showProcessing) {
    return (
      <ProcessingScreen
        videoUri={videoUri as string}
        options={{
          quality: selectedProcessingQuality,
          filters: filterSettings,
          backgroundType: selectedBackground?.type,
          backgroundValue: selectedBackground?.value,
        }}
        onComplete={handleProcessingComplete}
        onCancel={handleProcessingCancel}
        estimatedTime={
          selectedProcessingQuality === 'quick' ? quickTime :
          selectedProcessingQuality === 'best' ? bestTime :
          estimatedTime
        }
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDiscard}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview & Process</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Video Player */}
        <View style={styles.videoContainer}>
          {videoUri && (
            <Video
              ref={videoRef}
              source={{ uri: videoUri as string }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              onPlaybackStatusUpdate={(status: any) => {
                if (status.isLoaded) {
                  setIsPlaying(status.isPlaying);
                }
              }}
            />
          )}
          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPause}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={48}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {/* Title Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Video Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter video title"
            placeholderTextColor="#666"
            maxLength={100}
          />
        </View>

        {/* Processing Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Processing Options</Text>
          <Text style={styles.sectionSubtitle}>Choose processing speed vs quality</Text>

          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedProcessingQuality === 'quick' && styles.optionCardActive
            ]}
            onPress={() => setSelectedProcessingQuality('quick')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleRow}>
                <Ionicons name="flash" size={24} color={selectedProcessingQuality === 'quick' ? '#4A90E2' : '#888'} />
                <Text style={[styles.optionTitle, selectedProcessingQuality === 'quick' && styles.optionTitleActive]}>
                  Quick Process
                </Text>
              </View>
              {selectedProcessingQuality === 'quick' && (
                <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
              )}
            </View>
            <Text style={styles.optionTime}>{formatProcessingTime(quickTime)}</Text>
            <Text style={styles.optionDescription}>{getProcessingDescription('quick')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedProcessingQuality === 'balanced' && styles.optionCardActive
            ]}
            onPress={() => setSelectedProcessingQuality('balanced')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleRow}>
                <Ionicons name="checkmark-done" size={24} color={selectedProcessingQuality === 'balanced' ? '#4A90E2' : '#888'} />
                <Text style={[styles.optionTitle, selectedProcessingQuality === 'balanced' && styles.optionTitleActive]}>
                  Balanced ✓ Recommended
                </Text>
              </View>
              {selectedProcessingQuality === 'balanced' && (
                <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
              )}
            </View>
            <Text style={styles.optionTime}>{formatProcessingTime(estimatedTime)}</Text>
            <Text style={styles.optionDescription}>{getProcessingDescription('balanced')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedProcessingQuality === 'best' && styles.optionCardActive
            ]}
            onPress={() => setSelectedProcessingQuality('best')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleRow}>
                <Ionicons name="star" size={24} color={selectedProcessingQuality === 'best' ? '#4A90E2' : '#888'} />
                <Text style={[styles.optionTitle, selectedProcessingQuality === 'best' && styles.optionTitleActive]}>
                  Best Quality
                </Text>
              </View>
              {selectedProcessingQuality === 'best' && (
                <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
              )}
            </View>
            <Text style={styles.optionTime}>{formatProcessingTime(bestTime)}</Text>
            <Text style={styles.optionDescription}>{getProcessingDescription('best')}</Text>
          </TouchableOpacity>
        </View>

        {/* Applied Settings Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Effects to be Applied:</Text>
          <View style={styles.infoRow}>
            <Ionicons name="videocam-outline" size={16} color="#888" />
            <Text style={styles.infoText}>
              Quality: {quality.toUpperCase()}
            </Text>
          </View>
          {selectedBackground && (
            <View style={styles.infoRow}>
              <Ionicons name="color-palette-outline" size={16} color="#888" />
              <Text style={styles.infoText}>
                Background: {selectedBackground.type}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="sparkles-outline" size={16} color="#888" />
            <Text style={styles.infoText}>
              Filter Level: {filterSettings.level}
            </Text>
          </View>
        </View>

        {/* Notice */}
        <View style={styles.noticeContainer}>
          <Ionicons name="information-circle" size={20} color="#4A90E2" />
          <Text style={styles.noticeText}>
            You can use the app while processing in background. We'll notify you when complete!
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSaveRaw}
        >
          <Text style={styles.secondaryButtonText}>Save Raw (Instant)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleProcessAndSave}
        >
          <Ionicons name="sparkles" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Process & Save</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  videoContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#222',
  },
  optionCardActive: {
    borderColor: '#4A90E2',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  optionTitleActive: {
    color: '#4A90E2',
  },
  optionTime: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDescription: {
    color: '#888',
    fontSize: 13,
  },
  infoContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  infoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    color: '#888',
    fontSize: 13,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    gap: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    margin: 20,
    borderRadius: 12,
  },
  noticeText: {
    flex: 1,
    color: '#4A90E2',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
