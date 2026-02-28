import { create } from 'zustand';
import { VideoMetadata, BackgroundImage, UserSettings, FilterSettings, InterviewTemplate, InterviewPrompt } from '../types';
import { FILTER_PRESETS } from '../constants';

interface AppState {
  // User settings
  userSettings: UserSettings | null;
  setUserSettings: (settings: UserSettings) => void;
  
  // Videos
  videos: VideoMetadata[];
  setVideos: (videos: VideoMetadata[]) => void;
  addVideo: (video: VideoMetadata) => void;
  deleteVideo: (id: string) => void;
  
  // Backgrounds
  backgrounds: BackgroundImage[];
  setBackgrounds: (backgrounds: BackgroundImage[]) => void;
  addBackground: (background: BackgroundImage) => void;
  selectedBackground: { type: string; value: string; blurIntensity?: number; gradient?: string[]; name?: string } | null;
  setSelectedBackground: (bg: { type: string; value: string; blurIntensity?: number; gradient?: string[]; name?: string } | null) => void;
  
  // Filters
  filterSettings: FilterSettings;
  setFilterSettings: (settings: FilterSettings) => void;
  setFilterLevel: (level: 'simple' | 'basic' | 'advanced') => void;
  
  // Recording state
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  recordingDuration: number;
  setRecordingDuration: (duration: number) => void;
  
  // Camera settings
  cameraType: 'front' | 'back';
  setCameraType: (type: 'front' | 'back') => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  
  // Interview Mode
  interviewTemplate: InterviewTemplate | null;
  setInterviewTemplate: (template: InterviewTemplate | null) => void;
  currentPromptIndex: number;
  setCurrentPromptIndex: (index: number) => void;
  customPrompts: InterviewPrompt[];
  setCustomPrompts: (prompts: InterviewPrompt[]) => void;
}

export const useStore = create<AppState>((set) => ({
  // User settings
  userSettings: null,
  setUserSettings: (settings) => set({ userSettings: settings }),
  
  // Videos
  videos: [],
  setVideos: (videos) => set({ videos }),
  addVideo: (video) => set((state) => ({ videos: [video, ...state.videos] })),
  deleteVideo: (id) => set((state) => ({ videos: state.videos.filter(v => v.id !== id) })),
  
  // Backgrounds
  backgrounds: [],
  setBackgrounds: (backgrounds) => set({ backgrounds }),
  addBackground: (background) => set((state) => ({ backgrounds: [...state.backgrounds, background] })),
  selectedBackground: null,
  setSelectedBackground: (bg) => set({ selectedBackground: bg }),
  
  // Filters
  filterSettings: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    smoothing: 0,
    level: 'basic',
  },
  setFilterSettings: (settings) => set({ filterSettings: settings }),
  setFilterLevel: (level) => set((state) => ({
    filterSettings: {
      ...state.filterSettings,
      ...FILTER_PRESETS[level],
      level,
    }
  })),
  
  // Recording state
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),
  recordingDuration: 0,
  setRecordingDuration: (duration) => set({ recordingDuration: duration }),
  
  // Camera settings
  cameraType: 'front',
  setCameraType: (type) => set({ cameraType: type }),
  audioEnabled: true,
  setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
}));