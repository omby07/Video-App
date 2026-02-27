import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RetakeControlProps {
  isRecording: boolean;
  recordingDuration: number;
  onRetake: (seconds: number) => void;
  onFullRestart: () => void;
}

export default function RetakeControl({
  isRecording,
  recordingDuration,
  onRetake,
  onFullRestart,
}: RetakeControlProps) {
  const [showOptions, setShowOptions] = useState(false);

  const retakeOptions = [
    { seconds: 10, label: 'Last 10 seconds' },
    { seconds: 15, label: 'Last 15 seconds' },
    { seconds: 30, label: 'Last 30 seconds' },
  ];

  const handleRetake = (seconds: number) => {
    if (recordingDuration < seconds) {
      Alert.alert(
        'Not enough recorded',
        `You've only recorded ${recordingDuration} seconds. Would you like to start over?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Over', onPress: onFullRestart },
        ]
      );
      setShowOptions(false);
      return;
    }
    
    onRetake(seconds);
    setShowOptions(false);
  };

  if (!isRecording || recordingDuration < 5) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.retakeButton}
        onPress={() => setShowOptions(true)}
      >
        <Ionicons name="refresh" size={20} color="#FFB347" />
        <Text style={styles.retakeButtonText}>Redo</Text>
      </TouchableOpacity>

      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.optionsContainer}>
            <Text style={styles.optionsTitle}>Redo from...</Text>
            
            {retakeOptions.map((option) => (
              <TouchableOpacity
                key={option.seconds}
                style={[
                  styles.optionButton,
                  recordingDuration < option.seconds && styles.optionDisabled,
                ]}
                onPress={() => handleRetake(option.seconds)}
                disabled={recordingDuration < option.seconds}
              >
                <Ionicons 
                  name="play-back" 
                  size={18} 
                  color={recordingDuration >= option.seconds ? '#4ECDC4' : '#666'} 
                />
                <Text style={[
                  styles.optionText,
                  recordingDuration < option.seconds && styles.optionTextDisabled,
                ]}>
                  {option.label}
                </Text>
                {recordingDuration < option.seconds && (
                  <Text style={styles.optionHint}>Need {option.seconds - recordingDuration}s more</Text>
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setShowOptions(false);
                Alert.alert(
                  'Start Over?',
                  'This will discard your current recording.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Start Over', style: 'destructive', onPress: onFullRestart },
                  ]
                );
              }}
            >
              <Ionicons name="trash" size={18} color="#FF6B6B" />
              <Text style={[styles.optionText, { color: '#FF6B6B' }]}>
                Start completely over
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowOptions(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,179,71,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,179,71,0.3)',
  },
  retakeButtonText: {
    color: '#FFB347',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  optionsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 8,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  optionTextDisabled: {
    color: '#666',
  },
  optionHint: {
    color: '#666',
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
});
