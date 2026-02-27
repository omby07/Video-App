export interface VideoMetadata {
  id: string;
  title: string;
  duration: number;
  quality: 'lo-res' | 'hd' | 'full-hd';
  background_type?: string;
  background_value?: string;
  filters_applied: string[];
  created_at: string;
  video_data?: string;
  thumbnail?: string;
}

export interface BackgroundImage {
  id: string;
  name: string;
  image_data: string;
  is_predefined: boolean;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  is_premium: boolean;
  default_quality: 'lo-res' | 'hd' | 'full-hd';
  max_duration: number;
  updated_at: string;
}

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  smoothing: number;
  level: 'simple' | 'basic' | 'advanced';
}