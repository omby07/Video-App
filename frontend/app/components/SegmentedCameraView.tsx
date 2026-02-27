import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Canvas, useCanvasRef, Image as SkiaImage } from '@shopify/react-native-skia';
import { segmentationService } from '../services/segmentationService';
import { backgroundProcessor } from '../utils/backgroundProcessor';

const { width, height } = Dimensions.get('window');

interface SegmentedCameraViewProps {
  facing: CameraType;
  backgroundType?: 'blur' | 'color' | 'image' | 'none';
  backgroundColor?: { r: number; g: number; b: number };
  backgroundImage?: string;
  onModelReady?: () => void;
  showFPS?: boolean;
}

export default function SegmentedCameraView({
  facing,
  backgroundType = 'none',
  backgroundColor,
  backgroundImage,
  onModelReady,
  showFPS = false,
}: SegmentedCameraViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [modelReady, setModelReady] = useState(false);
  const [fps, setFps] = useState(0);
  const [processing, setProcessing] = useState(false);
  
  const cameraRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number>();
  const frameCount = useRef(0);
  const lastFpsUpdate = useRef(Date.now());
  const lastProcessTime = useRef(Date.now());

  // Frame processing settings
  const TARGET_FPS = 20; // Process 20 frames per second
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  const PROCESS_WIDTH = 640; // Process at lower resolution for speed
  const PROCESS_HEIGHT = 480;

  useEffect(() => {
    initializeModel();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (modelReady && backgroundType !== 'none') {
      startProcessing();
    } else {
      stopProcessing();
    }
  }, [modelReady, backgroundType]);

  const initializeModel = async () => {
    try {
      console.log('[SegmentedCamera] Initializing ML model...');
      await segmentationService.initialize();
      console.log('[SegmentedCamera] Model ready');
      setModelReady(true);
      onModelReady?.();
    } catch (error) {
      console.error('[SegmentedCamera] Failed to initialize:', error);
    }
  };

  const startProcessing = () => {
    if (!animationFrameId.current && videoRef.current) {
      console.log('[SegmentedCamera] Starting frame processing...');
      processFrame();
    }
  };

  const stopProcessing = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = undefined;
      console.log('[SegmentedCamera] Stopped frame processing');
    }
  };

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelReady || processing) {
      animationFrameId.current = requestAnimationFrame(processFrame);
      return;
    }

    const now = Date.now();
    const timeSinceLastProcess = now - lastProcessTime.current;

    // Skip frame if we're processing too fast
    if (timeSinceLastProcess < FRAME_INTERVAL) {
      animationFrameId.current = requestAnimationFrame(processFrame);
      return;
    }

    lastProcessTime.current = now;
    setProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas to processing size
      canvas.width = PROCESS_WIDTH;
      canvas.height = PROCESS_HEIGHT;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, PROCESS_WIDTH, PROCESS_HEIGHT);

      // Get image data
      const imageData = ctx.getImageData(0, 0, PROCESS_WIDTH, PROCESS_HEIGHT);

      // Segment person
      const segmentation = await segmentationService.segmentPerson(canvas);
      
      if (segmentation.length > 0) {
        // Generate mask
        const mask = await segmentationService.generateBinaryMask(segmentation);

        // Apply effect based on type
        let result: ImageData;
        
        if (backgroundType === 'blur') {
          result = await backgroundProcessor.applyBlurBackground(imageData, mask, 15);
        } else if (backgroundType === 'color' && backgroundColor) {
          result = await backgroundProcessor.applySolidColorBackground(imageData, mask, backgroundColor);
        } else if (backgroundType === 'image' && backgroundImage) {
          const bgImageData = await backgroundProcessor.base64ToImageData(backgroundImage);
          result = await backgroundProcessor.replaceBackground(imageData, mask, bgImageData);
        } else {
          result = imageData;
        }

        // Draw result back to canvas
        ctx.putImageData(result, 0, 0);
      }

      // Update FPS counter
      frameCount.current++;
      const timeSinceLastFps = now - lastFpsUpdate.current;
      if (timeSinceLastFps >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / timeSinceLastFps));
        frameCount.current = 0;
        lastFpsUpdate.current = now;
      }

    } catch (error) {
      console.error('[SegmentedCamera] Frame processing error:', error);
    } finally {
      setProcessing(false);
      animationFrameId.current = requestAnimationFrame(processFrame);
    }
  }, [modelReady, backgroundType, backgroundColor, backgroundImage, processing]);

  const cleanup = () => {
    stopProcessing();
    segmentationService.dispose();
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
      >
        {/* Render processed video when effects are active */}
        {backgroundType !== 'none' && modelReady && (
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </CameraView>

      {/* Status Indicators */}
      {!modelReady && (
        <View style={styles.statusOverlay}>
          <Text style={styles.statusText}>Loading ML model...</Text>
        </View>
      )}

      {showFPS && modelReady && backgroundType !== 'none' && (
        <View style={styles.fpsCounter}>
          <Text style={styles.fpsText}>{fps} FPS</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fpsCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fpsText: {
    color: '#7ED321',
    fontSize: 14,
    fontWeight: '700',
  },
});
