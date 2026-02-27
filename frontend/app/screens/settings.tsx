import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { userSettings, setUserSettings } = useStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      setUserSettings(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateQuality = async (quality: 'lo-res' | 'hd' | 'full-hd') => {
    try {
      setLoading(true);
      const updated = await api.updateSettings({ default_quality: quality });
      setUserSettings(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to update quality setting');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToPremium = () => {
    Alert.alert(
      'Upgrade to Premium',
      'Get 120 minutes recording time, Full HD quality, and advanced filters!\n\nPrice: $9.99/month',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: upgradeToPremium },
      ]
    );
  };

  const upgradeToPremium = async () => {
    try {
      setLoading(true);
      await api.upgradeToPremium();
      const updated = await api.getSettings();
      setUserSettings(updated);
      Alert.alert('Success', 'You are now a premium member!');
    } catch (error) {
      Alert.alert('Error', 'Failed to upgrade to premium');
    } finally {
      setLoading(false);
    }
  };

  const maxMinutes = userSettings ? Math.floor(userSettings.max_duration / 60) : 30;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Premium Status */}
        <View style={styles.section}>
          <View style={styles.premiumCard}>
            {userSettings?.is_premium ? (
              <>
                <Ionicons name="star" size={48} color="#FFD700" />
                <Text style={styles.premiumTitle}>Premium Member</Text>
                <Text style={styles.premiumSubtitle}>Enjoying all features!</Text>
              </>
            ) : (
              <>
                <Ionicons name="star-outline" size={48} color="#4A90E2" />
                <Text style={styles.premiumTitle}>Free Plan</Text>
                <Text style={styles.premiumSubtitle}>{maxMinutes} min max recording</Text>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={handleUpgradeToPremium}
                  disabled={loading}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Video Quality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Video Quality</Text>
          
          <TouchableOpacity
            style={[
              styles.qualityOption,
              userSettings?.default_quality === 'lo-res' && styles.qualityOptionActive,
            ]}
            onPress={() => updateQuality('lo-res')}
          >
            <View>
              <Text style={styles.qualityTitle}>Low Resolution</Text>
              <Text style={styles.qualitySubtitle}>640x480 • Smallest file size</Text>
            </View>
            {userSettings?.default_quality === 'lo-res' && (
              <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.qualityOption,
              userSettings?.default_quality === 'hd' && styles.qualityOptionActive,
            ]}
            onPress={() => updateQuality('hd')}
          >
            <View>
              <Text style={styles.qualityTitle}>HD (Recommended)</Text>
              <Text style={styles.qualitySubtitle}>1280x720 • Balanced quality</Text>
            </View>
            {userSettings?.default_quality === 'hd' && (
              <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.qualityOption,
              userSettings?.default_quality === 'full-hd' && styles.qualityOptionActive,
              !userSettings?.is_premium && styles.qualityOptionDisabled,
            ]}
            onPress={() => userSettings?.is_premium && updateQuality('full-hd')}
            disabled={!userSettings?.is_premium}
          >
            <View>
              <Text style={styles.qualityTitle}>Full HD</Text>
              <Text style={styles.qualitySubtitle}>1920x1080 • Best quality {!userSettings?.is_premium && '(Premium)'}</Text>
            </View>
            {userSettings?.default_quality === 'full-hd' && (
              <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
            )}
            {!userSettings?.is_premium && (
              <Ionicons name="lock-closed" size={24} color="#666" />
            )}
          </TouchableOpacity>
        </View>

        {/* Recording Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recording & Processing</Text>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={24} color="#4A90E2" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Maximum Duration</Text>
              <Text style={styles.infoValue}>{maxMinutes} minutes per recording</Text>
            </View>
          </View>
          
          <View style={styles.processingInfo}>
            <Ionicons name="information-circle-outline" size={20} color="#888" />
            <View style={styles.processingInfoContent}>
              <Text style={styles.processingInfoTitle}>Processing Times</Text>
              <Text style={styles.processingInfoText}>
                Videos need processing after recording:{'\n'}
                • Lo-res: ~25-35% of video length{'\n'}
                • HD: ~30-40% of video length{'\n'}
                • Full HD: ~40-50% of video length{'\n\n'}
                Example: 30-min Full HD = ~15-20 min processing
              </Text>
            </View>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App Name</Text>
            <Text style={styles.aboutValue}>Video Beautify</Text>
          </View>
        </View>

        {/* Premium Features Info */}
        {!userSettings?.is_premium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Features</Text>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              <Text style={styles.featureText}>120 minutes recording time</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              <Text style={styles.featureText}>Full HD quality (1920x1080)</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              <Text style={styles.featureText}>Advanced beauty filters</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              <Text style={styles.featureText}>Unlimited custom backgrounds</Text>
            </View>
          </View>
        )}
      </ScrollView>
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
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  premiumCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  premiumTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  premiumSubtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  upgradeButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qualityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  qualityOptionActive: {
    borderColor: '#4A90E2',
  },
  qualityOptionDisabled: {
    opacity: 0.5,
  },
  qualityTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qualitySubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
  },
  infoValue: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  aboutLabel: {
    color: '#888',
    fontSize: 14,
  },
  aboutValue: {
    color: '#fff',
    fontSize: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    color: '#fff',
    fontSize: 14,
  },
  processingInfo: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  processingInfoContent: {
    flex: 1,
  },
  processingInfoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  processingInfoText: {
    color: '#888',
    fontSize: 13,
    lineHeight: 20,
  },
});