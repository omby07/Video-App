import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
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
  const [customBullets, setCustomBullets] = useState(currentPrompt.bullets.join('\n'));

  const handleSaveCustomBullets = () => {
    const bullets = customBullets.split('\n').filter(b => b.trim());
    onPromptChange({
      ...currentPrompt,
      bullets: bullets.length > 0 ? bullets : ['Add your bullet points...'],
    });
    setEditingBullets(false);
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
              onPress={() => setEditingBullets(true)}
            >
              <Ionicons name="pencil" size={16} color="#4ECDC4" />
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
                    setCustomBullets(prompt.bullets.join('\n'));
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

      {/* Edit Bullets Modal */}
      <Modal
        visible={editingBullets}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingBullets(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Bullet Points</Text>
              <TouchableOpacity onPress={() => setEditingBullets(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.editHint}>One bullet point per line</Text>
            
            <TextInput
              style={styles.bulletInput}
              multiline
              value={customBullets}
              onChangeText={setCustomBullets}
              placeholder="Enter your bullet points..."
              placeholderTextColor="#666"
            />
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveCustomBullets}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    padding: 8,
    marginRight: 4,
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
  editHint: {
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
  },
  bulletInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
