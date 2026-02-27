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

// Basic background colors
export const BACKGROUND_COLORS = [
  { id: 'white', name: 'White', color: '#FFFFFF' },
  { id: 'black', name: 'Black', color: '#000000' },
  { id: 'blue', name: 'Blue', color: '#4A90E2' },
  { id: 'green', name: 'Green', color: '#7ED321' },
  { id: 'purple', name: 'Purple', color: '#BD10E0' },
  { id: 'gradient1', name: 'Sunset', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
];

// Professional interview backgrounds
export const PROFESSIONAL_BACKGROUNDS = [
  { 
    id: 'modern-office', 
    name: 'Modern Office', 
    category: 'professional',
    description: 'Clean, professional office space',
    gradient: ['#2C3E50', '#34495E'],
  },
  { 
    id: 'neutral-wall', 
    name: 'Neutral Wall', 
    category: 'professional',
    description: 'Clean, minimal background',
    gradient: ['#E8E8E8', '#D0D0D0'],
  },
  { 
    id: 'soft-bookshelf', 
    name: 'Soft Bookshelf', 
    category: 'professional',
    description: 'Subtle bookshelf blur',
    gradient: ['#8B7355', '#6B5344'],
  },
  { 
    id: 'branded-gradient', 
    name: 'Professional Blue', 
    category: 'professional',
    description: 'Corporate blue gradient',
    gradient: ['#1E3A5F', '#2C5282'],
  },
  { 
    id: 'startup-vibe', 
    name: 'Startup Vibe', 
    category: 'professional',
    description: 'Modern tech office feel',
    gradient: ['#4ECDC4', '#556270'],
  },
  { 
    id: 'executive-gray', 
    name: 'Executive Gray', 
    category: 'professional',
    description: 'Sophisticated gray tone',
    gradient: ['#485563', '#29323C'],
  },
];

// Company brand color presets
export const BRAND_COLOR_PRESETS = [
  { id: 'google', name: 'Google', colors: ['#4285F4', '#34A853', '#FBBC05', '#EA4335'] },
  { id: 'microsoft', name: 'Microsoft', colors: ['#00A4EF', '#7FBA00', '#F25022', '#FFB900'] },
  { id: 'amazon', name: 'Amazon', colors: ['#FF9900', '#232F3E'] },
  { id: 'apple', name: 'Apple', colors: ['#555555', '#A3AAAE'] },
  { id: 'meta', name: 'Meta', colors: ['#0081FB', '#00C6FF'] },
  { id: 'netflix', name: 'Netflix', colors: ['#E50914', '#221F1F'] },
  { id: 'spotify', name: 'Spotify', colors: ['#1DB954', '#191414'] },
  { id: 'slack', name: 'Slack', colors: ['#4A154B', '#36C5F0', '#2EB67D', '#ECB22E'] },
  { id: 'linkedin', name: 'LinkedIn', colors: ['#0A66C2', '#004182'] },
  { id: 'twitter-x', name: 'X/Twitter', colors: ['#000000', '#14171A'] },
];

export const PREDEFINED_BACKGROUNDS = [
  { id: 'office', name: 'Office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800' },
  { id: 'nature', name: 'Nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800' },
  { id: 'city', name: 'City', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800' },
  { id: 'studio', name: 'Studio', url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800' },
  { id: 'beach', name: 'Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800' },
];

// Export options for interviews
export const EXPORT_PRESETS = {
  linkedin: {
    name: 'LinkedIn Ready',
    description: 'Optimized for LinkedIn posts',
    width: 1080,
    height: 1350,
    fps: 30,
    bitrate: 3000000,
    format: 'mp4',
  },
  email: {
    name: 'Email Friendly',
    description: 'Compressed for email attachments',
    width: 854,
    height: 480,
    fps: 24,
    bitrate: 1000000,
    format: 'mp4',
    maxSize: 25 * 1024 * 1024, // 25MB
  },
  hd: {
    name: 'HD Quality',
    description: 'Full quality for sharing',
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 5000000,
    format: 'mp4',
  },
};