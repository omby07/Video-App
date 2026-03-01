import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EnergyMeterProps {
  audioLevel: number; // 0-100
  isRecording: boolean;
}

export default function EnergyMeter({ audioLevel, isRecording }: EnergyMeterProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Determine energy status
  const getEnergyStatus = () => {
    if (audioLevel < 20) return { label: 'Speak up', color: '#FF6B6B', icon: 'volume-low' as const };
    if (audioLevel < 40) return { label: 'A bit quiet', color: '#FFB347', icon: 'volume-medium' as const };
    if (audioLevel < 70) return { label: 'Great energy!', color: '#4ECDC4', icon: 'volume-high' as const };
    if (audioLevel < 85) return { label: 'Perfect!', color: '#45B7D1', icon: 'volume-high' as const };
    return { label: 'Too loud', color: '#FF6B6B', icon: 'warning' as const };
  };

  const status = getEnergyStatus();

  useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: audioLevel,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [audioLevel]);

  useEffect(() => {
    if (isRecording && audioLevel > 30) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [audioLevel, isRecording]);

  if (!isRecording) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <View style={styles.header}>
        <Ionicons name={status.icon} size={16} color={status.color} />
        <Text style={[styles.label, { color: status.color }]}>{status.label}</Text>
      </View>
      
      <View style={styles.meterContainer}>
        <View style={styles.meterBackground}>
          {/* Zone indicators */}
          <View style={[styles.zone, styles.zoneLow]} />
          <View style={[styles.zone, styles.zoneMid]} />
          <View style={[styles.zone, styles.zoneGood]} />
          <View style={[styles.zone, styles.zonePerfect]} />
          <View style={[styles.zone, styles.zoneHigh]} />
          
          {/* Active level */}
          <Animated.View 
            style={[
              styles.meterFill,
              { 
                width: animatedWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: status.color,
              }
            ]} 
          />
        </View>
      </View>
      
      {/* Sweet spot indicator */}
      <View style={styles.sweetSpotIndicator}>
        <View style={styles.sweetSpotMarker} />
        <Text style={styles.sweetSpotText}>Sweet spot</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  meterContainer: {
    height: 8,
    marginBottom: 4,
  },
  meterBackground: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  zone: {
    height: '100%',
    opacity: 0.3,
  },
  zoneLow: {
    width: '20%',
    backgroundColor: '#FF6B6B',
  },
  zoneMid: {
    width: '20%',
    backgroundColor: '#FFB347',
  },
  zoneGood: {
    width: '30%',
    backgroundColor: '#4ECDC4',
  },
  zonePerfect: {
    width: '15%',
    backgroundColor: '#45B7D1',
  },
  zoneHigh: {
    width: '15%',
    backgroundColor: '#FF6B6B',
  },
  meterFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  sweetSpotIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: '40%',
  },
  sweetSpotMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ECDC4',
    marginRight: 4,
  },
  sweetSpotText: {
    fontSize: 10,
    color: '#888',
  },
});
