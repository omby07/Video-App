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
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';

export default function PreviewScreen() {
  const { videoUri, recordedDuration } = useLocalSearchParams();
  const router = useRouter();
  const videoRef = useRef<any>(null);
  const [title, setTitle] = useState(`Video ${new Date().toLocaleDateString()}`);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const {
    userSettings,
    filterSettings,
    selectedBackground,
    addVideo,
  } = useStore();

  const duration = parseInt(recordedDuration as string) || 0;

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
      console.error('[Preview] Thumbnail generation failed:', error);
      return null;
    }
  };

  const handleSaveToGallery = async () => {
    if (!videoUri) {
      Alert.alert('Error', 'No video to save');
      return;
    }

    setIsSaving(true);

    try {
      // Request media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to save videos to your gallery.',
          [{ text: 'OK' }]
        );
        setIsSaving(false);
        return;
      }

      console.log('[Preview] Saving video to gallery:', videoUri);

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(videoUri as string);
      console.log('[Preview] Video saved to gallery:', asset.uri);

      // Generate thumbnail for local storage
      const thumbnail = await generateThumbnail(videoUri as string);

      // Add to local state for gallery view
      const videoData = {
        id: asset.id,
        title: title.trim() || `Video ${new Date().toLocaleDateString()}`,
        uri: asset.uri,
        duration,
        createdAt: new Date().toISOString(),
        thumbnail,
        quality: userSettings?.default_quality || 'hd',
        background_type: selectedBackground?.type,
        filters_applied: filterSettings ? [filterSettings.level] : [],
      };

      addVideo(videoData);

      setIsSaving(false);

      Alert.alert(
        'Video Saved!',
        'Your video has been saved to your gallery.',
        [
          { 
            text: 'View Gallery', 
            onPress: () => router.replace('/screens/gallery')
          },
          { 
            text: 'Record Another', 
            onPress: () => router.replace('/')
          },
        ]
      );
    } catch (error) {
      console.error('[Preview] Save error:', error);
      setIsSaving(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Save Failed',
        `Could not save video: ${errorMessage}`,
        [{ text: 'OK' }]
      );
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
          onPress: async () => {
            // Try to delete temp file
            try {
              if (videoUri) {
                await FileSystem.deleteAsync(videoUri as string, { idempotent: true });
              }
            } catch (e) {
              console.log('[Preview] Cleanup warning:', e);
            }
            router.replace('/');
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDiscard} disabled={isSaving}>
          <Ionicons name="close" size={28} color={isSaving ? '#666' : '#fff'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Video Player */}
        <View style={styles.videoContainer}>
          {videoUri ? (
            <Video
              ref={videoRef}
              source={{ uri: videoUri as string }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              isLooping
              onPlaybackStatusUpdate={(status: any) => {
                if (status.isLoaded) {
                  setIsPlaying(status.isPlaying);
                }
              }}
            />
          ) : (
            <View style={styles.noVideo}>
              <Ionicons name="videocam-off" size={48} color="#666" />
              <Text style={styles.noVideoText}>No video available</Text>
            </View>
          )}
          {videoUri && (
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
          )}
        </View>

        {/* Video Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#888" />
            <Text style={styles.infoLabel}>Duration:</Text>
            <Text style={styles.infoValue}>{formatDuration(duration)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="videocam-outline" size={20} color="#888" />
            <Text style={styles.infoLabel}>Quality:</Text>
            <Text style={styles.infoValue}>{(userSettings?.default_quality || 'HD').toUpperCase()}</Text>
          </View>
          {selectedBackground && selectedBackground.type !== 'none' && (
            <View style={styles.infoRow}>
              <Ionicons name="color-palette-outline" size={20} color="#888" />
              <Text style={styles.infoLabel}>Background:</Text>
              <Text style={styles.infoValue}>{selectedBackground.type}</Text>
            </View>
          )}
        </View>

        {/* Title Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Video Title (optional)</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter video title"
            placeholderTextColor="#666"
            maxLength={100}
            editable={!isSaving}
          />
        </View>

        {/* Info Notice */}
        <View style={styles.noticeContainer}>
          <Ionicons name="information-circle" size={20} color="#4A90E2" />
          <Text style={styles.noticeText}>
            Video will be saved directly to your device's gallery.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.discardButton}
          onPress={handleDiscard}
          disabled={isSaving}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveToGallery}
          disabled={isSaving || !videoUri}
        >
          {isSaving ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.saveButtonText}>Saving...</Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save to Gallery</Text>
            </>
          )}
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
  scrollContent: {
    paddingBottom: 20,
  },
  videoContainer: {
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  noVideo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noVideoText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
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
  infoCard: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  label: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
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
  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  discardButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
  },
  saveButtonDisabled: {
    backgroundColor: '#333',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
