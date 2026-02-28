/**
 * ConfidenceCue Component
 * 
 * Shows subtle coaching prompts during recording:
 * - Eye contact reminders
 * - Posture cues
 * - Pacing suggestions
 * - Energy encouragement
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRandomCue, ConfidenceCue } from '../types';

interface ConfidenceCueProps {
  isRecording: boolean;
  intervalSeconds?: number; // How often to show a new cue
}

const CUE_ICONS: Record<ConfidenceCue['type'], keyof typeof Ionicons.glyphMap> = {
  eyeline: 'eye',
  posture: 'body',
  pace: 'timer-outline',
  energy: 'sunny',
};

const CUE_COLORS: Record<ConfidenceCue['type'], string> = {
  eyeline: '#4ECDC4',
  posture: '#FFB347',
  pace: '#A78BFA',
  energy: '#F472B6',
};

export default function ConfidenceCueDisplay({ 
  isRecording, 
  intervalSeconds = 20 
}: ConfidenceCueProps) {
  const [currentCue, setCurrentCue] = useState<ConfidenceCue | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  // Show cue with animation
  const showCue = (cue: ConfidenceCue) => {
    setCurrentCue(cue);
    setIsVisible(true);
    
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    
    // Auto-hide after 4 seconds
    timeoutRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }, 4000);
  };

  useEffect(() => {
    if (isRecording) {
      // Show first cue after 5 seconds
      timeoutRef.current = setTimeout(() => {
        showCue(getRandomCue('eyeline')); // Start with eye contact
      }, 5000);
      
      // Then show cues periodically
      intervalRef.current = setInterval(() => {
        showCue(getRandomCue());
      }, intervalSeconds * 1000);
    } else {
      // Clear when not recording
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsVisible(false);
      fadeAnim.setValue(0);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isRecording, intervalSeconds]);

  if (!isVisible || !currentCue) return null;

  const color = CUE_COLORS[currentCue.type];
  const icon = CUE_ICONS[currentCue.type];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.cueCard, { borderColor: color }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.cueText, { color }]}>{currentCue.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 160,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 15,
  },
  cueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cueText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
