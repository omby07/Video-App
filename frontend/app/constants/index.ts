export const QUALITY_SETTINGS = {
  'lo-res': { width: 640, height: 480, bitrate: 500000 },
  'hd': { width: 1280, height: 720, bitrate: 2000000 },
  'full-hd': { width: 1920, height: 1080, bitrate: 5000000 },
};

export const FILTER_PRESETS = {
  simple: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    smoothing: 0.3,
  },
  basic: {
    brightness: 0.1,
    contrast: 0.1,
    saturation: 0.1,
    smoothing: 0.5,
  },
  advanced: {
    brightness: 0.15,
    contrast: 0.15,
    saturation: 0.15,
    smoothing: 0.7,
  },
};

export const BACKGROUND_COLORS = [
  { id: 'white', name: 'White', color: '#FFFFFF' },
  { id: 'black', name: 'Black', color: '#000000' },
  { id: 'blue', name: 'Blue', color: '#4A90E2' },
  { id: 'green', name: 'Green', color: '#7ED321' },
  { id: 'purple', name: 'Purple', color: '#BD10E0' },
  { id: 'gradient1', name: 'Sunset', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
];

export const PREDEFINED_BACKGROUNDS = [
  { id: 'office', name: 'Office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800' },
  { id: 'nature', name: 'Nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800' },
  { id: 'city', name: 'City', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800' },
  { id: 'studio', name: 'Studio', url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800' },
  { id: 'beach', name: 'Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800' },
];