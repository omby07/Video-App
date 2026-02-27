import * as FileSystem from 'expo-file-system';
import { FilterSettings } from '../types';

export interface ProcessingOptions {
  quality: 'quick' | 'balanced' | 'best';
  videoUri: string;
  outputPath: string;
  filters: FilterSettings;
  backgroundType?: string;
  backgroundValue?: string;
  onProgress?: (progress: number) => void;
}

export interface ProcessingResult {
  success: boolean;
  outputUri?: string;
  error?: string;
  processingTime: number;
}

// Estimate processing time based on video duration and quality
export const estimateProcessingTime = (durationSeconds: number, quality: 'lo-res' | 'hd' | 'full-hd'): number => {
  const multipliers = {
    'lo-res': 0.30,
    'hd': 0.35,
    'full-hd': 0.45
  };
  
  return Math.ceil(durationSeconds * multipliers[quality]);
};

// Get user-friendly time string
export const formatProcessingTime = (seconds: number): string => {
  if (seconds < 60) {
    return `~${seconds} seconds`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `~${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  return `~${minutes}:${remainingSeconds.toString().padStart(2, '0')} minutes`;
};

// Process video with effects
// Note: Full video compression requires a development build with native modules
// In Expo Go, we simply copy the video file
export const processVideo = async (options: ProcessingOptions): Promise<ProcessingResult> => {
  const startTime = Date.now();
  
  try {
    console.log('[VideoProcessor] Starting video processing:', options);
    
    // Simulate progress for UX
    if (options.onProgress) {
      options.onProgress(10);
    }
    
    // In Expo Go, we can only copy the file
    // Full compression/effects require a development build
    await FileSystem.copyAsync({
      from: options.videoUri,
      to: options.outputPath
    });
    
    if (options.onProgress) {
      options.onProgress(100);
    }
    
    const processingTime = Math.floor((Date.now() - startTime) / 1000);
    
    console.log('[VideoProcessor] Processing complete:', {
      processingTime,
      outputUri: options.outputPath
    });
    
    return {
      success: true,
      outputUri: options.outputPath,
      processingTime
    };
    
  } catch (error) {
    console.error('[VideoProcessor] Processing failed:', error);
    
    const processingTime = Math.floor((Date.now() - startTime) / 1000);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage,
      processingTime
    };
  }
};

// Apply filter adjustments to video metadata
export const prepareFilterSettings = (filters: FilterSettings): string[] => {
  const adjustments: string[] = [];
  
  if (filters.brightness !== 0) {
    adjustments.push(`brightness:${filters.brightness.toFixed(2)}`);
  }
  
  if (filters.contrast !== 0) {
    adjustments.push(`contrast:${filters.contrast.toFixed(2)}`);
  }
  
  if (filters.saturation !== 0) {
    adjustments.push(`saturation:${filters.saturation.toFixed(2)}`);
  }
  
  if (filters.smoothing > 0) {
    adjustments.push(`smoothing:${filters.smoothing.toFixed(2)}`);
  }
  
  adjustments.push(`level:${filters.level}`);
  
  return adjustments;
};

// Get processing description for UI
export const getProcessingDescription = (quality: 'quick' | 'balanced' | 'best'): string => {
  switch (quality) {
    case 'quick':
      return 'Fast optimization with basic compression';
    case 'balanced':
      return 'Balanced quality and compression';
    case 'best':
      return 'Maximum quality with optimal settings';
    default:
      return 'Processing video...';
  }
};

// Calculate expected file size
export const estimateFileSize = (
  durationSeconds: number,
  quality: 'lo-res' | 'hd' | 'full-hd',
  processingQuality: 'quick' | 'balanced' | 'best'
): number => {
  const baseBitrates = {
    'lo-res': 62500,
    'hd': 250000,
    'full-hd': 625000
  };
  
  const compressionMultipliers = {
    'quick': 0.7,
    'balanced': 0.85,
    'best': 1.0
  };
  
  const baseBitrate = baseBitrates[quality];
  const multiplier = compressionMultipliers[processingQuality];
  
  return (durationSeconds * baseBitrate * multiplier) / (1024 * 1024);
};
