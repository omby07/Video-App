import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { VideoMetadata } from '../types';

const { width } = Dimensions.get('window');
const itemWidth = (width - 48) / 3;

export default function GalleryScreen() {
  const router = useRouter();
  const { videos, setVideos, deleteVideo } = useStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const data = await api.getVideos();
      setVideos(data);
    } catch (error) {
      console.error('Failed to load videos:', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (video: VideoMetadata) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteVideo(video.id);
              deleteVideo(video.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete video');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderVideoItem = ({ item }: { item: VideoMetadata }) => (
    <TouchableOpacity
      style={styles.videoItem}
      onPress={() => router.push({
        pathname: '/screens/video-player',
        params: { videoId: item.id },
      })}
      onLongPress={() => handleDelete(item)}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.noThumbnail]}>
          <Ionicons name="videocam" size={32} color="#666" />
        </View>
      )}
      <View style={styles.videoInfo}>
        <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
        <View style={styles.qualityBadge}>
          <Text style={styles.qualityText}>{item.quality.toUpperCase()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{videos.length}</Text>
        <Text style={styles.statLabel}>Videos</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>
          {Math.floor(videos.reduce((acc, v) => acc + v.duration, 0) / 60)}
        </Text>
        <Text style={styles.statLabel}>Total Minutes</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Videos</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading && videos.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : videos.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="videocam-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No videos yet</Text>
          <Text style={styles.emptySubtext}>Start recording to see your videos here</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.back()}
          >
            <Text style={styles.startButtonText}>Start Recording</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          ListHeaderComponent={renderHeader}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadVideos();
          }}
        />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#4A90E2',
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 16,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  videoItem: {
    width: itemWidth,
    marginRight: 8,
    marginBottom: 8,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  noThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duration: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityBadge: {
    backgroundColor: 'rgba(74,144,226,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});