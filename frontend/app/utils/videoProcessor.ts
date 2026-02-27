import { Video } from 'react-native-compressor';
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
    'lo-res': 0.30,  // 30% of video length
    'hd': 0.35,      // 35% of video length
    'full-hd': 0.45  // 45% of video length
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

// Get compression quality based on processing option
const getCompressionQuality = (quality: 'quick' | 'balanced' | 'best'): 'low' | 'medium' | 'high' => {
  switch (quality) {
    case 'quick': return 'low';
    case 'balanced': return 'medium';
    case 'best': return 'high';
    default: return 'medium';
  }
};

// Process video with effects
export const processVideo = async (options: ProcessingOptions): Promise<ProcessingResult> => {
  const startTime = Date.now();
  
  try {
    console.log('Starting video processing:', options);
    
    // Step 1: Compress video with quality settings
    // This handles basic processing and file size optimization
    const compressionQuality = getCompressionQuality(options.quality);
    
    let processedUri = options.videoUri;
    
    // Apply compression (this is the main processing step available in Expo)
    if (options.quality !== 'quick') {
      console.log('Compressing video with quality:', compressionQuality);
      
      processedUri = await Video.compress(
        options.videoUri,
        {
          compressionMethod: 'auto',
          minimumFileSizeForCompress: 0,
        },
        (progress) => {
          // Report progress (0-100)
          if (options.onProgress) {
            options.onProgress(Math.floor(progress * 100));
          }
        }
      );
    }
    
    // Step 2: Copy to final destination
    await FileSystem.copyAsync({
      from: processedUri,
      to: options.outputPath
    });
    
    // Clean up temp file if different from original
    if (processedUri !== options.videoUri) {
      try {
        await FileSystem.deleteAsync(processedUri, { idempotent: true });
      } catch (e) {
        console.log('Cleanup warning:', e);
      }
    }
    
    const processingTime = Math.floor((Date.now() - startTime) / 1000);
    
    console.log('Video processing complete:', {
      processingTime,
      outputUri: options.outputPath
    });
    
    return {
      success: true,
      outputUri: options.outputPath,
      processingTime
    };
    
  } catch (error: any) {
    console.error('Video processing failed:', error);
    
    const processingTime = Math.floor((Date.now() - startTime) / 1000);
    
    return {
      success: false,
      error: error.message || 'Unknown error during processing',
      processingTime
    };
  }
};

// Apply filter adjustments to video metadata
// Note: This prepares the settings that would be applied in a full FFmpeg implementation
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
  // Base bitrates (bytes per second)
  const baseBitrates = {
    'lo-res': 62500,    // 500kbps
    'hd': 250000,       // 2Mbps
    'full-hd': 625000   // 5Mbps
  };
  
  // Compression multipliers
  const compressionMultipliers = {
    'quick': 0.7,
    'balanced': 0.85,
    'best': 1.0
  };
  
  const baseBitrate = baseBitrates[quality];
  const multiplier = compressionMultipliers[processingQuality];
  
  // Calculate in MB
  return (durationSeconds * baseBitrate * multiplier) / (1024 * 1024);
};