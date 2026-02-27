import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useStore } from './store/useStore';
import { api } from './utils/api';
import CameraScreen from './screens/camera';

export default function Index() {
  const { setUserSettings } = useStore();

  useEffect(() => {
    // Load user settings on app start
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

  return (
    <View style={styles.container}>
      <CameraScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
