import * as tf from '@tensorflow/tfjs';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import '@tensorflow/tfjs-react-native';

export interface SegmentationResult {
  mask: ImageData;
  width: number;
  height: number;
}

export class SegmentationService {
  private segmenter: bodySegmentation.BodySegmenter | null = null;
  private initialized = false;
  private initializing = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Segmentation service already initialized');
      return;
    }

    if (this.initializing) {
      console.log('Segmentation service is initializing...');
      // Wait for initialization to complete
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.initializing = true;

    try {
      console.log('[Segmentation] Initializing TensorFlow.js...');
      
      // Wait for TF.js to be ready
      await tf.ready();
      
      console.log('[Segmentation] TF.js backend:', tf.getBackend());
      console.log('[Segmentation] TF.js ready, loading segmentation model...');

      // Create segmenter with MediaPipe Selfie Segmentation
      const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
      const segmenterConfig = {
        runtime: 'mediapipe' as const,
        modelType: 'general' as const, // 'general' or 'landscape'
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
      };

      console.log('[Segmentation] Creating segmenter with config:', segmenterConfig);
      this.segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);
      this.initialized = true;
      this.initializing = false;
      
      console.log('[Segmentation] Model loaded successfully');
    } catch (error) {
      console.error('[Segmentation] Failed to initialize:', error);
      this.initializing = false;
      throw error;
    }
  }

  async segmentPerson(
    imageData: ImageData | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<bodySegmentation.Segmentation[]> {
    if (!this.segmenter) {
      throw new Error('Segmenter not initialized. Call initialize() first.');
    }

    try {
      const segmentation = await this.segmenter.segmentPeople(imageData, {
        flipHorizontal: false,
        multiSegmentation: false,
        segmentBodyParts: false,
      });
      
      return segmentation;
    } catch (error) {
      console.error('[Segmentation] Segmentation failed:', error);
      throw error;
    }
  }

  async generateBinaryMask(
    segmentation: bodySegmentation.Segmentation[]
  ): Promise<ImageData> {
    if (segmentation.length === 0) {
      throw new Error('No segmentation data provided');
    }

    try {
      // Convert segmentation to binary mask
      // Person pixels = white (255), Background pixels = black (0)
      const coloredPartImage = await bodySegmentation.toBinaryMask(
        segmentation,
        { r: 0, g: 0, b: 0, a: 0 },       // background color (transparent)
        { r: 255, g: 255, b: 255, a: 255 }, // foreground/person color (white)
        false, // drawContour
        0.6    // foregroundThreshold (0.6 = 60% confidence)
      );

      return coloredPartImage;
    } catch (error) {
      console.error('[Segmentation] Failed to generate binary mask:', error);
      throw error;
    }
  }

  async generateSmoothMask(
    segmentation: bodySegmentation.Segmentation[],
    blur: number = 5
  ): Promise<ImageData> {
    if (segmentation.length === 0) {
      throw new Error('No segmentation data provided');
    }

    try {
      // Generate mask with some blur for smooth edges
      const mask = await bodySegmentation.toBinaryMask(
        segmentation,
        { r: 0, g: 0, b: 0, a: 0 },
        { r: 255, g: 255, b: 255, a: 255 },
        false,
        0.5 // Lower threshold for softer edges
      );

      // Apply blur to mask edges for smoother compositing
      // This would require additional canvas processing
      return mask;
    } catch (error) {
      console.error('[Segmentation] Failed to generate smooth mask:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isInitializing(): boolean {
    return this.initializing;
  }

  dispose(): void {
    if (this.segmenter) {
      console.log('[Segmentation] Disposing segmenter...');
      this.segmenter.dispose();
      this.segmenter = null;
      this.initialized = false;
    }
  }

  // Get model info
  getModelInfo(): { initialized: boolean; backend: string } {
    return {
      initialized: this.initialized,
      backend: tf.getBackend(),
    };
  }
}

// Singleton instance
export const segmentationService = new SegmentationService();
