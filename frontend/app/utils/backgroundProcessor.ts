export class BackgroundProcessor {
  /**
   * Apply blur to background while keeping person sharp
   */
  async applyBlurBackground(
    sourceImage: ImageData,
    maskImage: ImageData,
    blurAmount: number = 15
  ): Promise<ImageData> {
    // Create offscreen canvases for processing
    const canvas = this.createCanvas(sourceImage.width, sourceImage.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) throw new Error('Could not get canvas context');

    // Draw original image
    ctx.putImageData(sourceImage, 0, 0);

    // Create blurred version
    const blurredCanvas = this.createCanvas(sourceImage.width, sourceImage.height);
    const blurCtx = blurredCanvas.getContext('2d');
    
    if (!blurCtx) throw new Error('Could not get blur canvas context');
    
    blurCtx.filter = `blur(${blurAmount}px)`;
    blurCtx.drawImage(canvas, 0, 0);

    // Composite: Use mask to combine sharp person with blurred background
    const result = ctx.createImageData(sourceImage.width, sourceImage.height);
    const blurredData = blurCtx.getImageData(0, 0, sourceImage.width, sourceImage.height);

    for (let i = 0; i < sourceImage.data.length; i += 4) {
      const maskValue = maskImage.data[i]; // R channel of mask
      const isPerson = maskValue > 128; // Person if white (>128)

      if (isPerson) {
        // Keep original (person)
        result.data[i] = sourceImage.data[i];       // R
        result.data[i + 1] = sourceImage.data[i + 1]; // G
        result.data[i + 2] = sourceImage.data[i + 2]; // B
        result.data[i + 3] = 255;                     // A
      } else {
        // Use blurred (background)
        result.data[i] = blurredData.data[i];       // R
        result.data[i + 1] = blurredData.data[i + 1]; // G
        result.data[i + 2] = blurredData.data[i + 2]; // B
        result.data[i + 3] = 255;                     // A
      }
    }

    return result;
  }

  /**
   * Replace background with a custom image
   */
  async replaceBackground(
    sourceImage: ImageData,
    maskImage: ImageData,
    backgroundImage: ImageData
  ): Promise<ImageData> {
    const result = new ImageData(sourceImage.width, sourceImage.height);

    // Ensure background image is same size (scale if needed)
    let bgData = backgroundImage;
    if (backgroundImage.width !== sourceImage.width || backgroundImage.height !== sourceImage.height) {
      bgData = await this.resizeImageData(backgroundImage, sourceImage.width, sourceImage.height);
    }

    // Composite person on top of background
    for (let i = 0; i < sourceImage.data.length; i += 4) {
      const maskValue = maskImage.data[i]; // R channel of mask
      const alpha = maskValue / 255; // Normalize to 0-1

      if (maskValue > 128) {
        // Person pixel - use original with anti-aliasing
        result.data[i] = sourceImage.data[i];
        result.data[i + 1] = sourceImage.data[i + 1];
        result.data[i + 2] = sourceImage.data[i + 2];
        result.data[i + 3] = 255;
      } else if (maskValue > 10) {
        // Edge pixel - blend for smooth edges
        result.data[i] = Math.round(sourceImage.data[i] * alpha + bgData.data[i] * (1 - alpha));
        result.data[i + 1] = Math.round(sourceImage.data[i + 1] * alpha + bgData.data[i + 1] * (1 - alpha));
        result.data[i + 2] = Math.round(sourceImage.data[i + 2] * alpha + bgData.data[i + 2] * (1 - alpha));
        result.data[i + 3] = 255;
      } else {
        // Background pixel - use replacement
        result.data[i] = bgData.data[i];
        result.data[i + 1] = bgData.data[i + 1];
        result.data[i + 2] = bgData.data[i + 2];
        result.data[i + 3] = 255;
      }
    }

    return result;
  }

  /**
   * Apply solid color background
   */
  async applySolidColorBackground(
    sourceImage: ImageData,
    maskImage: ImageData,
    color: { r: number; g: number; b: number }
  ): Promise<ImageData> {
    const result = new ImageData(sourceImage.width, sourceImage.height);

    for (let i = 0; i < sourceImage.data.length; i += 4) {
      const maskValue = maskImage.data[i];
      const alpha = maskValue / 255;

      if (maskValue > 128) {
        // Person pixel
        result.data[i] = sourceImage.data[i];
        result.data[i + 1] = sourceImage.data[i + 1];
        result.data[i + 2] = sourceImage.data[i + 2];
        result.data[i + 3] = 255;
      } else if (maskValue > 10) {
        // Edge - blend
        result.data[i] = Math.round(sourceImage.data[i] * alpha + color.r * (1 - alpha));
        result.data[i + 1] = Math.round(sourceImage.data[i + 1] * alpha + color.g * (1 - alpha));
        result.data[i + 2] = Math.round(sourceImage.data[i + 2] * alpha + color.b * (1 - alpha));
        result.data[i + 3] = 255;
      } else {
        // Background - solid color
        result.data[i] = color.r;
        result.data[i + 1] = color.g;
        result.data[i + 2] = color.b;
        result.data[i + 3] = 255;
      }
    }

    return result;
  }

  /**
   * Smooth mask edges for better compositing
   */
  smoothMaskEdges(maskImage: ImageData, kernelSize: number = 3): ImageData {
    const result = new ImageData(maskImage.width, maskImage.height);
    const radius = Math.floor(kernelSize / 2);

    for (let y = 0; y < maskImage.height; y++) {
      for (let x = 0; x < maskImage.width; x++) {
        let sum = 0;
        let count = 0;

        // Average surrounding pixels
        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const nx = x + kx;
            const ny = y + ky;

            if (nx >= 0 && nx < maskImage.width && ny >= 0 && ny < maskImage.height) {
              const idx = (ny * maskImage.width + nx) * 4;
              sum += maskImage.data[idx];
              count++;
            }
          }
        }

        const idx = (y * maskImage.width + x) * 4;
        const avgValue = Math.round(sum / count);
        
        result.data[idx] = avgValue;     // R
        result.data[idx + 1] = avgValue; // G
        result.data[idx + 2] = avgValue; // B
        result.data[idx + 3] = 255;      // A
      }
    }

    return result;
  }

  /**
   * Helper: Create canvas element
   */
  private createCanvas(width: number, height: number): HTMLCanvasElement {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    throw new Error('Canvas API not available');
  }

  /**
   * Helper: Resize ImageData
   */
  private async resizeImageData(
    imageData: ImageData,
    newWidth: number,
    newHeight: number
  ): Promise<ImageData> {
    const canvas = this.createCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.putImageData(imageData, 0, 0);

    const resizedCanvas = this.createCanvas(newWidth, newHeight);
    const resizedCtx = resizedCanvas.getContext('2d');
    
    if (!resizedCtx) throw new Error('Could not get resized canvas context');
    
    resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

    return resizedCtx.getImageData(0, 0, newWidth, newHeight);
  }

  /**
   * Convert base64 image to ImageData
   */
  async base64ToImageData(base64: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = this.createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };
      img.onerror = reject;
      img.src = base64;
    });
  }

  /**
   * Convert ImageData to base64
   */
  imageDataToBase64(imageData: ImageData): string {
    const canvas = this.createCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }
}

export const backgroundProcessor = new BackgroundProcessor();
