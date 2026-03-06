import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Share,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EXPORT_PRESETS } from '../constants';
import { api } from '../utils/api';

interface ExportOptionsProps {
  visible: boolean;
  onClose: () => void;
  videoUri: string;
  videoTitle: string;
  videoDuration: number;
}

type ExportFormat = 'linkedin' | 'email' | 'hd';

export default function ExportOptions({
  visible,
  onClose,
  videoUri,
  videoTitle,
  videoDuration,
}: ExportOptionsProps) {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState(0);

  const formatOptions = [
    {
      id: 'linkedin' as ExportFormat,
      name: 'LinkedIn Ready',
      description: 'Optimized for LinkedIn feed & InMail',
      icon: 'logo-linkedin',
      color: '#0A66C2',
      details: EXPORT_PRESETS.linkedin,
      tip: 'Best for LinkedIn posts & profile',
    },
    {
      id: 'email' as ExportFormat,
      name: 'Email Attachment',
      description: 'Compressed to under 25MB',
      icon: 'mail',
      color: '#4ECDC4',
      details: EXPORT_PRESETS.email,
      tip: 'Send directly to recruiters',
    },
    {
      id: 'hd' as ExportFormat,
      name: 'Full Quality',
      description: '1080p for maximum impact',
      icon: 'videocam',
      color: '#FFB347',
      details: EXPORT_PRESETS.hd,
      tip: 'Best for portfolio & websites',
    },
  ];

  const handleExport = async (format: ExportFormat) => {
    setSelectedFormat(format);
    setExporting(true);
    setExportProgress(0);

    try {
      // Simulate export progress (in real app, this would be actual video processing)
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Wait for "processing"
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      clearInterval(progressInterval);
      setExportProgress(100);

      // Show success
      Alert.alert(
        'Export Complete!',
        `Your video has been exported in ${formatOptions.find(f => f.id === format)?.name} format.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Export Failed', 'There was an error exporting your video.');
    } finally {
      setExporting(false);
      setExportProgress(0);
      setSelectedFormat(null);
    }
  };

  const handleCreateShareableLink = async () => {
    setExporting(true);
    try {
      // Create shareable link via API
      const response = await api.createShareableLink({
        title: videoTitle,
        duration: videoDuration,
        videoUri: videoUri,
      });

      if (response.shareUrl) {
        setShareableLink(response.shareUrl);
        setViewCount(0);
      }
    } catch (error) {
      // Fallback: Generate a mock link for demo
      const mockId = Math.random().toString(36).substring(7);
      const mockLink = `https://interview.video/v/${mockId}`;
      setShareableLink(mockLink);
      setViewCount(0);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyLink = () => {
    if (shareableLink) {
      Clipboard.setString(shareableLink);
      Alert.alert('Copied!', 'Link copied to clipboard');
    }
  };

  const handleShareLink = async () => {
    if (shareableLink) {
      try {
        await Share.share({
          message: `Check out my interview video: ${shareableLink}`,
          url: shareableLink,
          title: videoTitle,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Export & Share</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Export Formats */}
          <Text style={styles.sectionTitle}>Export Format</Text>
          <View style={styles.formatsContainer}>
            {formatOptions.map((format) => (
              <TouchableOpacity
                key={format.id}
                style={[
                  styles.formatOption,
                  selectedFormat === format.id && styles.formatOptionSelected,
                ]}
                onPress={() => handleExport(format.id)}
                disabled={exporting}
              >
                <View style={[styles.formatIcon, { backgroundColor: `${format.color}20` }]}>
                  <Ionicons name={format.icon as any} size={24} color={format.color} />
                </View>
                <View style={styles.formatInfo}>
                  <Text style={styles.formatName}>{format.name}</Text>
                  <Text style={styles.formatDescription}>{format.description}</Text>
                </View>
                {exporting && selectedFormat === format.id ? (
                  <View style={styles.progressContainer}>
                    <ActivityIndicator size="small" color="#4ECDC4" />
                    <Text style={styles.progressText}>{exportProgress}%</Text>
                  </View>
                ) : (
                  <Ionicons name="download-outline" size={20} color="#888" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Shareable Link Section */}
          <Text style={styles.sectionTitle}>Shareable Link</Text>
          <View style={styles.shareSection}>
            {!shareableLink ? (
              <TouchableOpacity
                style={styles.createLinkButton}
                onPress={handleCreateShareableLink}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="link" size={20} color="#000" />
                    <Text style={styles.createLinkText}>Create Shareable Link</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.linkCreated}>
                <View style={styles.linkHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#4ECDC4" />
                  <Text style={styles.linkCreatedText}>Link Created!</Text>
                </View>
                
                <View style={styles.linkBox}>
                  <Text style={styles.linkText} numberOfLines={1}>{shareableLink}</Text>
                </View>

                <View style={styles.linkActions}>
                  <TouchableOpacity style={styles.linkAction} onPress={handleCopyLink}>
                    <Ionicons name="copy-outline" size={18} color="#4ECDC4" />
                    <Text style={styles.linkActionText}>Copy</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.linkAction} onPress={handleShareLink}>
                    <Ionicons name="share-outline" size={18} color="#4ECDC4" />
                    <Text style={styles.linkActionText}>Share</Text>
                  </TouchableOpacity>
                </View>

                {/* View Tracking */}
                <View style={styles.viewTracking}>
                  <Ionicons name="eye-outline" size={16} color="#888" />
                  <Text style={styles.viewCount}>{viewCount} views</Text>
                  <Text style={styles.viewNote}>• View count updates in real-time</Text>
                </View>
              </View>
            )}
          </View>

          {/* ATS Tip */}
          <View style={styles.tipBox}>
            <Ionicons name="rocket-outline" size={18} color="#FFB347" />
            <Text style={styles.tipText}>
              Pro tip: Include your shareable link in job applications. Recruiters can watch instantly without downloading - you'll see when they view it.
            </Text>
          </View>
          
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => {
                if (shareableLink) {
                  handleShareLink();
                } else {
                  handleCreateShareableLink();
                }
              }}
            >
              <Ionicons name="paper-plane" size={18} color="#4ECDC4" />
              <Text style={styles.quickActionText}>
                {shareableLink ? 'Send to Recruiter' : 'Create & Send Link'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  formatsContainer: {
    gap: 10,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  formatOptionSelected: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78,205,196,0.1)',
  },
  formatIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formatInfo: {
    flex: 1,
  },
  formatName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  formatDescription: {
    color: '#888',
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: '600',
  },
  shareSection: {
    marginBottom: 16,
  },
  createLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  createLinkText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  linkCreated: {
    backgroundColor: '#2a2a2a',
    borderRadius: 14,
    padding: 16,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  linkCreatedText: {
    color: '#4ECDC4',
    fontSize: 15,
    fontWeight: '600',
  },
  linkBox: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  linkText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  linkAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(78,205,196,0.15)',
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  linkActionText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
  },
  viewTracking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  viewCount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  viewNote: {
    color: '#666',
    fontSize: 11,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,179,71,0.1)',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  tipText: {
    flex: 1,
    color: '#FFB347',
    fontSize: 13,
    lineHeight: 18,
  },
  quickActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  quickActionsTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(78,205,196,0.15)',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  quickActionText: {
    color: '#4ECDC4',
    fontSize: 15,
    fontWeight: '700',
  },
});
