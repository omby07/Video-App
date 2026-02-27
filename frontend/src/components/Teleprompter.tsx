import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InterviewPrompt, DEFAULT_PROMPTS } from '../types';

interface TeleprompterProps {
  currentPrompt: InterviewPrompt;
  onPromptChange: (prompt: InterviewPrompt) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  isRecording: boolean;
}

export default function Teleprompter({
  currentPrompt,
  onPromptChange,
  isMinimized,
  onToggleMinimize,
  isRecording,
}: TeleprompterProps) {
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [editingBullets, setEditingBullets] = useState(false);
  const [customBullets, setCustomBullets] = useState('');

  // Sync customBullets when opening edit modal or when prompt changes
  useEffect(() => {
    setCustomBullets(currentPrompt.bullets.join('\n'));
  }, [currentPrompt]);

  const openEditModal = () => {
    setCustomBullets(currentPrompt.bullets.join('\n'));
    setEditingBullets(true);
  };

  const handleSaveCustomBullets = () => {
    const bullets = customBullets
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);
    
    onPromptChange({
      ...currentPrompt,
      bullets: bullets.length > 0 ? bullets : ['Add your bullet points...'],
    });
    setEditingBullets(false);
    Keyboard.dismiss();
  };

  const handleCancelEdit = () => {
    setCustomBullets(currentPrompt.bullets.join('\n'));
    setEditingBullets(false);
    Keyboard.dismiss();
  };

  if (isMinimized) {
    return (
      <TouchableOpacity style={styles.minimizedContainer} onPress={onToggleMinimize}>
        <Ionicons name="document-text" size={20} color="#4ECDC4" />
        <Text style={styles.minimizedText}>{currentPrompt.title}</Text>
        <Ionicons name="chevron-up" size={16} color="#888" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.promptSelector}
          onPress={() => !isRecording && setShowPromptPicker(true)}
          disabled={isRecording}
        >
          <Text style={styles.promptTitle}>{currentPrompt.title}</Text>
          {!isRecording && <Ionicons name="chevron-down" size={16} color="#888" />}
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          {!isRecording && (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={openEditModal}
            >
              <Ionicons name="pencil" size={16} color="#4ECDC4" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.minimizeButton} onPress={onToggleMinimize}>
            <Ionicons name="chevron-down" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bullet Points */}
      <ScrollView style={styles.bulletContainer} showsVerticalScrollIndicator={false}>
        {currentPrompt.bullets.map((bullet, index) => (
          <View key={index} style={styles.bulletItem}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Duration suggestion */}
      <View style={styles.durationHint}>
        <Ionicons name="time-outline" size={14} color="#888" />
        <Text style={styles.durationText}>
          Suggested: {currentPrompt.suggestedDuration}s
        </Text>
      </View>

      {/* Prompt Picker Modal */}
      <Modal
        visible={showPromptPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPromptPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose a Prompt</Text>
              <TouchableOpacity onPress={() => setShowPromptPicker(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.promptList}>
              {DEFAULT_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt.id}
                  style={[
                    styles.promptOption,
                    currentPrompt.id === prompt.id && styles.promptOptionActive,
                  ]}
                  onPress={() => {
                    onPromptChange(prompt);
                    setShowPromptPicker(false);
                  }}
                >
                  <Text style={styles.promptOptionTitle}>{prompt.title}</Text>
                  <Text style={styles.promptOptionDuration}>
                    ~{prompt.suggestedDuration}s
                  </Text>
                  <View style={styles.promptOptionBullets}>
                    {prompt.bullets.slice(0, 2).map((b, i) => (
                      <Text key={i} style={styles.promptOptionBullet}>• {b}</Text>
                    ))}
                    {prompt.bullets.length > 2 && (
                      <Text style={styles.promptOptionMore}>+{prompt.bullets.length - 2} more</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Bullets Modal - IMPROVED */}
      <Modal
        visible={editingBullets}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <KeyboardAvoidingView 
          style={styles.editModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.editModalOverlay}>
              <View style={styles.editModalContent}>
                {/* Header */}
                <View style={styles.editModalHeader}>
                  <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.editModalTitle}>Edit Prompts</Text>
                  <TouchableOpacity onPress={handleSaveCustomBullets} style={styles.saveHeaderButton}>
                    <Text style={styles.saveHeaderButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>

                {/* Instructions */}
                <View style={styles.instructionsBox}>
                  <Ionicons name="bulb-outline" size={18} color="#FFB347" />
                  <Text style={styles.instructionsText}>
                    Write one talking point per line. Keep them short - just keywords to jog your memory.
                  </Text>
                </View>

                {/* Current Prompt Label */}
                <View style={styles.promptLabelContainer}>
                  <Text style={styles.promptLabel}>Editing: {currentPrompt.title}</Text>
                </View>

                {/* Text Input */}
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.bulletInput}
                    multiline
                    value={customBullets}
                    onChangeText={setCustomBullets}
                    placeholder="Enter your talking points...&#10;&#10;Example:&#10;• 5 years experience in marketing&#10;• Led team of 8 people&#10;• Increased sales by 40%"
                    placeholderTextColor="#555"
                    autoFocus={true}
                    textAlignVertical="top"
                    selectionColor="#4ECDC4"
                  />
                </View>

                {/* Character Count */}
                <View style={styles.charCountContainer}>
                  <Text style={styles.charCount}>
                    {customBullets.split('\n').filter(l => l.trim()).length} bullet points
                  </Text>
                </View>

                {/* Bottom Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveCustomBullets}>
                  <Ionicons name="checkmark-circle" size={20} color="#000" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    maxHeight: 200,
  },
  minimizedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
  },
  minimizedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  promptSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptTitle: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78,205,196,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  editButtonText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  minimizeButton: {
    padding: 4,
  },
  bulletContainer: {
    maxHeight: 100,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ECDC4',
    marginTop: 6,
    marginRight: 10,
  },
  bulletText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  durationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  durationText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  promptList: {
    maxHeight: 400,
  },
  promptOption: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  promptOptionActive: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78,205,196,0.1)',
  },
  promptOptionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  promptOptionDuration: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  promptOptionBullets: {
    marginTop: 4,
  },
  promptOptionBullet: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 2,
  },
  promptOptionMore: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Edit Modal Styles - IMPROVED
  editModalContainer: {
    flex: 1,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  editModalContent: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
  },
  saveHeaderButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  saveHeaderButtonText: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,179,71,0.15)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  instructionsText: {
    flex: 1,
    color: '#FFB347',
    fontSize: 13,
    lineHeight: 18,
  },
  promptLabelContainer: {
    marginBottom: 12,
  },
  promptLabel: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    marginBottom: 12,
  },
  bulletInput: {
    flex: 1,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  charCount: {
    color: '#666',
    fontSize: 12,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#4ECDC4',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
