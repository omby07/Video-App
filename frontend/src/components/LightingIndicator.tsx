import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LightingIndicatorProps {
  level: number; // 0-100
  isVisible: boolean;
}

export default function LightingIndicator({ level, isVisible }: LightingIndicatorProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: level,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [level]);

  const getStatus = () => {
    if (level < 25) return { message: 'Very dark - add more light', color: '#FF6B6B', icon: 'moon' as const };
    if (level < 40) return { message: 'Low light - face a window', color: '#FFB347', icon: 'cloudy-night' as const };
    if (level < 60) return { message: 'Good lighting', color: '#4ECDC4', icon: 'partly-sunny' as const };
    if (level < 80) return { message: 'Great lighting!', color: '#45B7D1', icon: 'sunny' as const };
    return { message: 'Slightly bright', color: '#FFB347', icon: 'sunny' as const };
  };

  const status = getStatus();

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Ionicons name={status.icon} size={16} color={status.color} />
        <Text style={[styles.statusText, { color: status.color }]}>{status.message}</Text>
      </View>

      <View style={styles.meterContainer}>
        {/* Background zones */}
        <View style={styles.meterBackground}>
          <View style={[styles.zone, { width: '25%', backgroundColor: '#FF6B6B' }]} />
          <View style={[styles.zone, { width: '15%', backgroundColor: '#FFB347' }]} />
          <View style={[styles.zone, { width: '20%', backgroundColor: '#4ECDC4' }]} />
          <View style={[styles.zone, { width: '20%', backgroundColor: '#45B7D1' }]} />
          <View style={[styles.zone, { width: '20%', backgroundColor: '#FFB347' }]} />
        </View>

        {/* Indicator */}
        <Animated.View 
          style={[
            styles.indicator,
            { 
              left: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '96%'],
              })
            }
          ]} 
        />

        {/* Sweet spot marker */}
        <View style={styles.sweetSpotMarker}>
          <Text style={styles.sweetSpotText}>ideal</Text>
        </View>
      </View>

      {/* Tips */}
      {level < 40 && (
        <View style={styles.tipContainer}>
          <Ionicons name="bulb-outline" size={12} color="#FFB347" />
          <Text style={styles.tipText}>Tip: Face a window or add desk lamp</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  meterContainer: {
    height: 8,
    marginBottom: 6,
    position: 'relative',
  },
  meterBackground: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
  },
  zone: {
    height: '100%',
    opacity: 0.3,
  },
  indicator: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  sweetSpotMarker: {
    position: 'absolute',
    left: '50%',
    bottom: -16,
    marginLeft: -15,
  },
  sweetSpotText: {
    color: '#666',
    fontSize: 9,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  tipText: {
    color: '#FFB347',
    fontSize: 11,
  },
});
