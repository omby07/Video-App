import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useStore } from '../src/store/useStore';
import { api } from '../src/utils/api';
import CameraScreen from './screens/camera';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const { setUserSettings } = useStore();

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

  return <CameraScreen />;
}
