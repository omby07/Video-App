import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PresenceBoostProps {
  isActive: boolean;
  onToggle: () => void;
  faceDetected: boolean;
  faceCentered: boolean;
  lightingLevel: number; // 0-100
  showFramingHint?: boolean;
}

export default function PresenceBoost({
  isActive,
  onToggle,
  faceDetected,
  faceCentered,
  lightingLevel,
  showFramingHint = true,
}: PresenceBoostProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [framingMessage, setFramingMessage] = useState<string | null>(null);

  // Determine lighting status
  const getLightingStatus = () => {
    if (lightingLevel < 30) return { status: 'low', message: 'Add more light', color: '#FF6B6B' };
    if (lightingLevel < 50) return { status: 'medium', message: 'Could use more light', color: '#FFB347' };
    if (lightingLevel > 85) return { status: 'high', message: 'Slightly too bright', color: '#FFB347' };
    return { status: 'good', message: 'Good lighting', color: '#4ECDC4' };
  };

  const lighting = getLightingStatus();

  // Update framing message based on face position
  useEffect(() => {
    if (!isActive) {
      setFramingMessage(null);
      return;
    }

    if (!faceDetected) {
      setFramingMessage('Position your face in frame');
    } else if (!faceCentered) {
      // Simulate different framing suggestions
      const suggestions = [
        'Raise camera slightly',
        'Move back a little',
        'Center yourself in frame',
      ];
      setFramingMessage(suggestions[Math.floor(Math.random() * suggestions.length)]);
    } else {
      setFramingMessage(null);
    }
  }, [isActive, faceDetected, faceCentered]);

  // Pulse animation when framing message shown
  useEffect(() => {
    if (framingMessage && isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [framingMessage, isActive]);

  if (!isActive) {
    return (
      <TouchableOpacity style={styles.inactiveContainer} onPress={onToggle}>
        <Ionicons name="sparkles-outline" size={18} color="#888" />
        <Text style={styles.inactiveText}>Presence Boost</Text>
        <View style={styles.offBadge}>
          <Text style={styles.offBadgeText}>OFF</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={18} color="#4ECDC4" />
          <Text style={styles.title}>Presence Boost</Text>
        </View>
        <TouchableOpacity style={styles.activeToggle} onPress={onToggle}>
          <Text style={styles.activeToggleText}>ON</Text>
        </TouchableOpacity>
      </View>

      {/* Status Items */}
      <View style={styles.statusContainer}>
        {/* Face Detection */}
        <View style={styles.statusItem}>
          <Ionicons 
            name={faceDetected ? "checkmark-circle" : "alert-circle"} 
            size={16} 
            color={faceDetected ? "#4ECDC4" : "#FF6B6B"} 
          />
          <Text style={[styles.statusText, { color: faceDetected ? '#4ECDC4' : '#FF6B6B' }]}>
            {faceDetected ? 'Face detected' : 'Face not detected'}
          </Text>
        </View>

        {/* Lighting */}
        <View style={styles.statusItem}>
          <Ionicons 
            name={lighting.status === 'good' ? "sunny" : "sunny-outline"} 
            size={16} 
            color={lighting.color} 
          />
          <Text style={[styles.statusText, { color: lighting.color }]}>
            {lighting.message}
          </Text>
        </View>

        {/* Framing */}
        <View style={styles.statusItem}>
          <Ionicons 
            name={faceCentered ? "scan" : "scan-outline"} 
            size={16} 
            color={faceCentered ? "#4ECDC4" : "#FFB347"} 
          />
          <Text style={[styles.statusText, { color: faceCentered ? '#4ECDC4' : '#FFB347' }]}>
            {faceCentered ? 'Well framed' : 'Adjust framing'}
          </Text>
        </View>
      </View>

      {/* Framing Hint */}
      {showFramingHint && framingMessage && (
        <View style={styles.framingHint}>
          <Ionicons name="arrow-up-circle" size={16} color="#FFB347" />
          <Text style={styles.framingHintText}>{framingMessage}</Text>
        </View>
      )}

      {/* Active Enhancements */}
      <View style={styles.enhancementsRow}>
        <View style={styles.enhancementBadge}>
          <Ionicons name="color-wand" size={12} color="#4ECDC4" />
          <Text style={styles.enhancementText}>Skin tone</Text>
        </View>
        <View style={styles.enhancementBadge}>
          <Ionicons name="sunny" size={12} color="#4ECDC4" />
          <Text style={styles.enhancementText}>Lighting</Text>
        </View>
        <View style={styles.enhancementBadge}>
          <Ionicons name="contrast" size={12} color="#4ECDC4" />
          <Text style={styles.enhancementText}>Contrast</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inactiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  inactiveText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  offBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offBadgeText: {
    color: '#666',
    fontSize: 10,
    fontWeight: '700',
  },
  container: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '700',
  },
  activeToggle: {
    backgroundColor: 'rgba(78,205,196,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeToggleText: {
    color: '#4ECDC4',
    fontSize: 11,
    fontWeight: '700',
  },
  statusContainer: {
    gap: 6,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  framingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,179,71,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  framingHintText: {
    color: '#FFB347',
    fontSize: 13,
    fontWeight: '600',
  },
  enhancementsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  enhancementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78,205,196,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  enhancementText: {
    color: '#4ECDC4',
    fontSize: 11,
    fontWeight: '500',
  },
});
