import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FramingGuideProps {
  isVisible: boolean;
  facePosition?: {
    x: number; // 0-1 normalized
    y: number; // 0-1 normalized
    width: number;
    height: number;
  } | null;
  showGuideLines: boolean;
}

export default function FramingGuide({
  isVisible,
  facePosition,
  showGuideLines,
}: FramingGuideProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  // Pulse animation for the guide
  useEffect(() => {
    if (isVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isVisible]);

  // Calculate ideal face zone (rule of thirds, upper third)
  const idealZone = {
    left: SCREEN_WIDTH * 0.25,
    top: SCREEN_HEIGHT * 0.15,
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_HEIGHT * 0.35,
  };

  // Check if face is well positioned
  const isWellPositioned = facePosition && 
    facePosition.x > 0.3 && facePosition.x < 0.7 &&
    facePosition.y > 0.15 && facePosition.y < 0.45;

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Rule of thirds grid */}
      {showGuideLines && (
        <View style={styles.gridContainer}>
          {/* Horizontal lines */}
          <View style={[styles.gridLine, styles.horizontalLine, { top: '33%' }]} />
          <View style={[styles.gridLine, styles.horizontalLine, { top: '66%' }]} />
          {/* Vertical lines */}
          <View style={[styles.gridLine, styles.verticalLine, { left: '33%' }]} />
          <View style={[styles.gridLine, styles.verticalLine, { left: '66%' }]} />
        </View>
      )}

      {/* Ideal face zone indicator */}
      <Animated.View 
        style={[
          styles.idealZone,
          {
            left: idealZone.left,
            top: idealZone.top,
            width: idealZone.width,
            height: idealZone.height,
            borderColor: isWellPositioned ? '#4ECDC4' : 'rgba(255,255,255,0.3)',
            transform: [{ scale: pulseAnim }],
          }
        ]}
      >
        {/* Corner brackets */}
        <View style={[styles.cornerBracket, styles.topLeft]} />
        <View style={[styles.cornerBracket, styles.topRight]} />
        <View style={[styles.cornerBracket, styles.bottomLeft]} />
        <View style={[styles.cornerBracket, styles.bottomRight]} />

        {/* Eye level indicator */}
        <View style={styles.eyeLevelIndicator}>
          <View style={[styles.eyeLevelLine, { backgroundColor: isWellPositioned ? '#4ECDC4' : 'rgba(255,255,255,0.3)' }]} />
          <Text style={[styles.eyeLevelText, { color: isWellPositioned ? '#4ECDC4' : 'rgba(255,255,255,0.5)' }]}>
            Eye level
          </Text>
        </View>
      </Animated.View>

      {/* Face detection feedback */}
      {facePosition && (
        <View style={styles.faceIndicator}>
          <Ionicons 
            name={isWellPositioned ? "checkmark-circle" : "scan-outline"} 
            size={20} 
            color={isWellPositioned ? "#4ECDC4" : "#FFB347"} 
          />
          <Text style={[styles.faceIndicatorText, { color: isWellPositioned ? '#4ECDC4' : '#FFB347' }]}>
            {isWellPositioned ? 'Great position!' : 'Adjust position'}
          </Text>
        </View>
      )}

      {/* Center crosshair */}
      <View style={styles.centerCrosshair}>
        <View style={styles.crosshairVertical} />
        <View style={styles.crosshairHorizontal} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  horizontalLine: {
    left: 0,
    right: 0,
    height: 1,
  },
  verticalLine: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  idealZone: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 20,
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#4ECDC4',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  eyeLevelIndicator: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  eyeLevelLine: {
    width: '80%',
    height: 1,
  },
  eyeLevelText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  faceIndicator: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  faceIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centerCrosshair: {
    position: 'absolute',
    top: '33%',
    left: '50%',
    marginLeft: -10,
    marginTop: -10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairVertical: {
    position: 'absolute',
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: 20,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
