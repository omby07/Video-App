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

// Interview Mode Types
export interface InterviewPrompt {
  id: string;
  title: string;
  bullets: string[];
  suggestedDuration: number; // in seconds
}

export interface InterviewSession {
  promptId: string;
  recordings: RecordingSegment[];
  currentSegmentIndex: number;
  totalDuration: number;
}

export interface RecordingSegment {
  id: string;
  uri: string;
  startTime: number;
  endTime: number;
  duration: number;
}

// Default interview prompts
export const DEFAULT_PROMPTS: InterviewPrompt[] = [
  {
    id: 'intro',
    title: 'Introduction',
    bullets: [
      'Your name and current role',
      'Years of experience',
      'Key skills relevant to this role',
    ],
    suggestedDuration: 60,
  },
  {
    id: 'experience',
    title: 'Experience Highlight',
    bullets: [
      'A specific achievement',
      'The challenge you faced',
      'How you solved it',
      'The measurable result',
    ],
    suggestedDuration: 90,
  },
  {
    id: 'why-company',
    title: 'Why This Company',
    bullets: [
      'What attracts you to this company',
      'How your values align',
      'What you can contribute',
    ],
    suggestedDuration: 60,
  },
  {
    id: 'strengths',
    title: 'Key Strengths',
    bullets: [
      'Top 2-3 relevant strengths',
      'Brief example for each',
      'How they benefit the team',
    ],
    suggestedDuration: 75,
  },
  {
    id: 'custom',
    title: 'Custom Prompt',
    bullets: [
      'Add your own bullet points...',
    ],
    suggestedDuration: 90,
  },
];
