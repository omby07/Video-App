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
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { api } from '../../src/utils/api';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';

export default function PreviewScreen() {
  const { videoUri } = useLocalSearchParams();
  const router = useRouter();
  const videoRef = useRef<any>(null);
  const [title, setTitle] = useState(`Video ${new Date().toLocaleDateString()}`);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const {
    userSettings,
    filterSettings,
    selectedBackground,
    addVideo,
  } = useStore();

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

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your video');
      return;
    }

    try {
      setLoading(true);

      // Get video status to extract duration
      const status = await videoRef.current?.getStatusAsync();
      const duration = status?.durationMillis ? status.durationMillis / 1000 : 0;

      // Read video file as base64
      const base64Video = await FileSystem.readAsStringAsync(videoUri as string, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Generate thumbnail
      const thumbnail = await generateThumbnail(videoUri as string);

      // Prepare video data
      const videoData = {
        title: title.trim(),
        duration,
        quality: userSettings?.default_quality || 'hd',
        background_type: selectedBackground?.type,
        background_value: selectedBackground?.value,
        filters_applied: [
          filterSettings.level,
          `brightness:${filterSettings.brightness}`,
          `smoothing:${filterSettings.smoothing}`,
        ],
        video_data: `data:video/mp4;base64,${base64Video}`,
        thumbnail,
      };

      // Save to backend
      const savedVideo = await api.createVideo(videoData);
      addVideo(savedVideo);

      Alert.alert('Success', 'Video saved successfully!', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save video. Please try again.');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>Preview</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : (
            <Ionicons name="checkmark" size={28} color="#4A90E2" />
          )}
        </TouchableOpacity>
      </View>

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

      {/* Applied Settings Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Applied Settings:</Text>
        <View style={styles.infoRow}>
          <Ionicons name="videocam-outline" size={16} color="#888" />
          <Text style={styles.infoText}>
            Quality: {userSettings?.default_quality?.toUpperCase() || 'HD'}
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

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="save-outline" size={24} color="#fff" />
            <Text style={styles.saveButtonText}>Save Video</Text>
          </>
        )}
      </TouchableOpacity>
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
  videoContainer: {
    height: 400,
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
  infoContainer: {
    padding: 20,
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
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});