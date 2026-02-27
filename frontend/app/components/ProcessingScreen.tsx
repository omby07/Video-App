import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { processVideo, ProcessingOptions, formatProcessingTime } from '../utils/videoProcessor';

interface ProcessingScreenProps {
  videoUri: string;
  options: Omit<ProcessingOptions, 'videoUri' | 'outputPath' | 'onProgress'>;
  onComplete: (outputUri: string) => void;
  onCancel: () => void;
  estimatedTime: number;
}

export default function ProcessingScreen({
  videoUri,
  options,
  onComplete,
  onCancel,
  estimatedTime
}: ProcessingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing...');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [canMinimize, setCanMinimize] = useState(false);
  const router = useRouter();

  useEffect(() => {
    startProcessing();
    
    // Enable minimize after 3 seconds
    const minimizeTimer = setTimeout(() => {
      setCanMinimize(true);
    }, 3000);
    
    // Track elapsed time
    const timeInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => {
      clearTimeout(minimizeTimer);
      clearInterval(timeInterval);
    };
  }, []);

  const startProcessing = async () => {
    const outputPath = `${videoUri.substring(0, videoUri.lastIndexOf('/'))}/processed_${Date.now()}.mp4`;
    
    try {
      setCurrentStep('Analyzing video...');
      
      const result = await processVideo({
        ...options,
        videoUri,
        outputPath,
        onProgress: (p) => {
          setProgress(p);
          
          // Update step based on progress
          if (p < 25) {
            setCurrentStep('Optimizing video quality...');
          } else if (p < 50) {
            setCurrentStep('Applying compression...');
          } else if (p < 75) {
            setCurrentStep('Processing filters...');
          } else if (p < 95) {
            setCurrentStep('Finalizing video...');
          } else {
            setCurrentStep('Almost done...');
          }
        }
      });
      
      if (result.success && result.outputUri) {
        setProgress(100);
        setCurrentStep('Complete!');
        
        // Small delay to show 100%
        setTimeout(() => {
          onComplete(result.outputUri!);
        }, 500);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error: any) {
      console.error('Processing error:', error);
      Alert.alert(
        'Processing Failed',
        error.message || 'An error occurred while processing your video.',
        [
          { text: 'Try Again', onPress: () => startProcessing() },
          { text: 'Cancel', onPress: onCancel, style: 'cancel' }
        ]
      );
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Processing?',
      'Your video will not be saved. Are you sure?',
      [
        { text: 'Continue Processing', style: 'cancel' },
        { text: 'Cancel', onPress: onCancel, style: 'destructive' }
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = Math.max(0, estimatedTime - elapsedTime);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Processing Video</Text>
        <TouchableOpacity onPress={handleCancel}>
          <Ionicons name="close" size={28} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="videocam" size={64} color="#4A90E2" />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>

        {/* Current Step */}
        <Text style={styles.stepText}>{currentStep}</Text>

        {/* Time Info */}
        <View style={styles.timeContainer}>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={20} color="#888" />
            <Text style={styles.timeLabel}>Elapsed:</Text>
            <Text style={styles.timeValue}>{formatTime(elapsedTime)}</Text>
          </View>
          <View style={styles.timeRow}>
            <Ionicons name="hourglass-outline" size={20} color="#888" />
            <Text style={styles.timeLabel}>Remaining:</Text>
            <Text style={styles.timeValue}>
              {progress < 5 ? formatProcessingTime(estimatedTime) : formatTime(remainingTime)}
            </Text>
          </View>
        </View>

        {/* Activity Indicator */}
        <ActivityIndicator size="large" color="#4A90E2" style={styles.spinner} />

        {/* Minimize Option */}
        {canMinimize && (
          <View style={styles.minimizeContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
            <Text style={styles.minimizeText}>
              Processing continues in background.
              You'll be notified when complete.
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel Processing</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  progressText: {
    color: '#4A90E2',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  timeContainer: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  timeLabel: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  timeValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  spinner: {
    marginVertical: 24,
  },
  minimizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  minimizeText: {
    flex: 1,
    color: '#4A90E2',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  cancelButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});