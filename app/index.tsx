import React, { useEffect } from 'react';
import { Dimensions } from 'react-native';
import { useStore } from '../src/store/useStore';
import { api } from '../src/utils/api';
import { DEFAULT_SETTINGS } from '../src/constants/defaultSettings';
import CameraScreen from './screens/camera';

Dimensions.get('window'); // keeps previous behavior if it was relied on

export default function Index() {
  const { setUserSettings } = useStore();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await api.getSettings();
        setUserSettings(settings);
      } catch (error) {
        console.warn('Settings API unavailable — using defaults.');
        setUserSettings(DEFAULT_SETTINGS as any);
      }
    };

    loadSettings();
  }, [setUserSettings]);

  return <CameraScreen />;
}