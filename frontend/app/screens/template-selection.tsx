/**
 * Template Selection Screen
 * 
 * First screen users see when entering Interview Mode.
 * Select a template based on career stage:
 * - Sales Professional
 * - Graduate / Entry Level
 * - Leadership / Executive
 * - Career Switch
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INTERVIEW_TEMPLATES, DEFAULT_PROMPTS, InterviewTemplate } from '../../src/types';
import { useStore } from '../../src/store/useStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TemplateSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedTemplate, setSelectedTemplate] = useState<InterviewTemplate | null>(null);
  const { setInterviewTemplate, setCurrentPromptIndex } = useStore();

  const handleSelectTemplate = (template: InterviewTemplate) => {
    setSelectedTemplate(template);
  };

  const handleStartRecording = () => {
    if (selectedTemplate) {
      setInterviewTemplate(selectedTemplate);
      setCurrentPromptIndex(0);
    }
    router.push('/screens/interview-mode');
  };

  const handleQuickStart = () => {
    // Use default general prompts
    setInterviewTemplate(null);
    setCurrentPromptIndex(0);
    router.push('/screens/interview-mode');
  };

  const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      'trending-up': 'trending-up',
      'school': 'school',
      'people': 'people',
      'swap-horizontal': 'swap-horizontal',
    };
    return iconMap[iconName] || 'document-text';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interview Mode</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Choose Your Template</Text>
          <Text style={styles.heroSubtitle}>
            Select a structure that matches your career stage for guided prompts
          </Text>
        </View>

        {/* Quick Start Option */}
        <TouchableOpacity 
          style={styles.quickStartCard}
          onPress={handleQuickStart}
        >
          <View style={styles.quickStartIcon}>
            <Ionicons name="flash" size={24} color="#FFB347" />
          </View>
          <View style={styles.quickStartContent}>
            <Text style={styles.quickStartTitle}>Quick Start</Text>
            <Text style={styles.quickStartDesc}>
              General purpose prompts • 60-90 seconds
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or choose a template</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Template Cards */}
        {INTERVIEW_TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={[
              styles.templateCard,
              selectedTemplate?.id === template.id && styles.templateCardSelected,
            ]}
            onPress={() => handleSelectTemplate(template)}
          >
            <View style={[
              styles.templateIcon,
              selectedTemplate?.id === template.id && styles.templateIconSelected,
            ]}>
              <Ionicons 
                name={getIconName(template.icon)} 
                size={28} 
                color={selectedTemplate?.id === template.id ? '#000' : '#4ECDC4'} 
              />
            </View>
            
            <View style={styles.templateContent}>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateDesc}>{template.description}</Text>
              
              {/* Prompt Preview */}
              <View style={styles.promptPreview}>
                {template.prompts.slice(0, 3).map((prompt, index) => (
                  <View key={prompt.id} style={styles.promptPreviewItem}>
                    <Text style={styles.promptPreviewNumber}>{index + 1}</Text>
                    <Text style={styles.promptPreviewText}>{prompt.title}</Text>
                  </View>
                ))}
                {template.prompts.length > 3 && (
                  <Text style={styles.promptPreviewMore}>
                    +{template.prompts.length - 3} more
                  </Text>
                )}
              </View>
            </View>
            
            {selectedTemplate?.id === template.id && (
              <Ionicons name="checkmark-circle" size={24} color="#4ECDC4" />
            )}
          </TouchableOpacity>
        ))}

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      {selectedTemplate && (
        <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartRecording}
          >
            <Ionicons name="videocam" size={22} color="#000" />
            <Text style={styles.startButtonText}>
              Start with {selectedTemplate.name}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heroSection: {
    paddingVertical: 24,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#888',
    fontSize: 15,
    lineHeight: 22,
  },
  quickStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,179,71,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,179,71,0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  quickStartIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,179,71,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  quickStartContent: {
    flex: 1,
  },
  quickStartTitle: {
    color: '#FFB347',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickStartDesc: {
    color: '#999',
    fontSize: 13,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    fontSize: 12,
    paddingHorizontal: 12,
    textTransform: 'uppercase',
  },
  templateCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateCardSelected: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78,205,196,0.08)',
  },
  templateIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(78,205,196,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  templateIconSelected: {
    backgroundColor: '#4ECDC4',
  },
  templateContent: {
    flex: 1,
  },
  templateName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  templateDesc: {
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
  },
  promptPreview: {
    gap: 4,
  },
  promptPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promptPreviewNumber: {
    color: '#4ECDC4',
    fontSize: 11,
    fontWeight: '700',
    width: 16,
  },
  promptPreviewText: {
    color: '#aaa',
    fontSize: 12,
  },
  promptPreviewMore: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#4ECDC4',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
  },
});
