import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InterviewTimerProps {
  duration: number; // current duration in seconds
  suggestedDuration: number; // suggested duration in seconds
  isRecording: boolean;
}

export default function InterviewTimer({ 
  duration, 
  suggestedDuration, 
  isRecording 
}: InterviewTimerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Calculate time status
  const minTime = Math.max(suggestedDuration - 15, 30); // 15 sec buffer before suggested
  const maxTime = suggestedDuration + 15; // 15 sec buffer after suggested
  const warningTime = suggestedDuration + 30; // Start warning
  
  const getTimeStatus = () => {
    if (duration < minTime) {
      return { 
        status: 'building', 
        color: '#FFB347', 
        message: 'Keep going...',
        icon: 'time-outline' as const
      };
    }
    if (duration >= minTime && duration <= maxTime) {
      return { 
        status: 'perfect', 
        color: '#4ECDC4', 
        message: 'Perfect length!',
        icon: 'checkmark-circle' as const
      };
    }
    if (duration > maxTime && duration <= warningTime) {
      return { 
        status: 'wrapping', 
        color: '#FFB347', 
        message: 'Start wrapping up',
        icon: 'alert-circle' as const
      };
    }
    return { 
      status: 'overtime', 
      color: '#FF6B6B', 
      message: 'Consider ending',
      icon: 'warning' as const
    };
  };

  const status = getTimeStatus();

  // Pulse animation when in sweet spot
  useEffect(() => {
    if (isRecording && status.status === 'perfect') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [isRecording, status.status]);

  // Pulse on overtime
  useEffect(() => {
    if (isRecording && status.status === 'overtime') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, status.status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progress = Math.min((duration / suggestedDuration) * 100, 150);

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ scale: pulseAnim }] },
        status.status === 'perfect' && {
          shadowColor: '#4ECDC4',
          shadowOpacity: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 0.8],
          }) as any,
          shadowRadius: 10,
        }
      ]}
    >
      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingBadge}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>REC</Text>
        </View>
      )}

      {/* Main timer */}
      <View style={styles.timerRow}>
        <Text style={[styles.currentTime, { color: status.color }]}>
          {formatTime(duration)}
        </Text>
        <Text style={styles.separator}>/</Text>
        <Text style={styles.targetTime}>{formatTime(suggestedDuration)}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          {/* Sweet spot zone marker */}
          <View 
            style={[
              styles.sweetSpotZone,
              {
                left: `${((minTime / suggestedDuration) * 100) * 0.67}%`,
                width: `${(((maxTime - minTime) / suggestedDuration) * 100) * 0.67}%`,
              }
            ]} 
          />
          
          {/* Progress fill */}
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progress * 0.67, 100)}%`,
                backgroundColor: status.color,
              }
            ]} 
          />
        </View>
      </View>

      {/* Status message */}
      <View style={styles.statusRow}>
        <Ionicons name={status.icon} size={14} color={status.color} />
        <Text style={[styles.statusText, { color: status.color }]}>
          {status.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    minWidth: 160,
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  recordingText: {
    color: '#FF3B30',
    fontSize: 11,
    fontWeight: '700',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentTime: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  separator: {
    color: '#666',
    fontSize: 20,
    marginHorizontal: 4,
  },
  targetTime: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    marginVertical: 8,
  },
  progressBackground: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sweetSpotZone: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(78,205,196,0.3)',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
