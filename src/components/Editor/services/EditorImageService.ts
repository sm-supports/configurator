import { useState, useEffect, useCallback } from 'react';
import { PlateTemplate, ImageElement } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface ImageLoadOptions {
  maxWidth?: number;
  maxHeight?: number;
  minSize?: number;
  centerOnLoad?: boolean;
}

export class EditorImageService {
  private template: PlateTemplate;
  private bgImage: HTMLImageElement | null = null;
  private frameImage: HTMLImageElement | null = null;
  private onImageLoad?: (type: 'background' | 'frame', image: HTMLImageElement) => void;
  private currentFrameSize: 'slim' | 'std' | 'xl' = 'slim';

  constructor(template: PlateTemplate, onImageLoad?: (type: 'background' | 'frame', image: HTMLImageElement) => void) {
    this.template = template;
    this.onImageLoad = onImageLoad;
    this.loadTemplateImages();
  }

  private async loadTemplateImages() {
    const errors: string[] = [];

    // Load background image
    if (this.template.image_url) {
      try {
        if (typeof this.template.image_url !== 'string' || !this.template.image_url.trim()) {
          throw new Error('Invalid template image URL');
        }

        const bgImg = await this.loadImage(this.template.image_url);
        if (!bgImg) {
          throw new Error('Background image failed to load');
        }

        this.bgImage = bgImg;
        this.onImageLoad?.('background', bgImg);
      } catch (error) {
        const errorMessage = `Failed to load background image from ${this.template.image_url}: ${
          error instanceof Error ? error.message : 'Image failed to load'
        }`;
        console.warn(errorMessage); // Changed from console.error to console.warn
        errors.push(errorMessage);
        
        // Generate a fallback placeholder image
        this.bgImage = this.generatePlaceholderImage(
          this.template.width_px,
          this.template.height_px + Math.min(this.template.width_px, this.template.height_px) * 0.2,
          this.template.name || 'Template'
        );
        
        if (this.bgImage) {
          this.onImageLoad?.('background', this.bgImage);
          console.log('Using generated placeholder background image');
        }
      }
    }

    // Load the license plate frame image
    try {
      const frameUrl = this.getFrameUrl(this.currentFrameSize);
      const frameImg = await this.loadImage(frameUrl);
      if (!frameImg) {
        throw new Error('Frame image failed to load');
      }

      this.frameImage = frameImg;
      this.onImageLoad?.('frame', frameImg);
    } catch (error) {
      const errorMessage = `Failed to load frame image: ${
        error instanceof Error ? error.message : 'Image failed to load'
      }`;
      console.warn(errorMessage); // Changed from console.error to console.warn
      errors.push(errorMessage);
      
      // Frame is optional - editor can work without it
      this.frameImage = null;
      console.log('Editor will continue without frame image (frame is optional)');
    }

    // Log summary of loading results
    if (errors.length > 0) {
      console.info(`Template image loading completed with ${errors.length} warning(s) - editor will use fallbacks`);
    } else {
      console.log('✓ All template images loaded successfully');
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    const isAbsolute = /^(https?:)?\/\//i.test(url);
    const isRootRelative = !isAbsolute && url.startsWith('/');

    return new Promise(async (resolve, reject) => {
      const assignHandlers = (img: HTMLImageElement) => {
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = (event) => {
          const msg = event instanceof ErrorEvent ? event.message : 'Network or CORS error';
          reject(new Error(`Failed to load image from URL: ${url}. ${msg}`));
        };
      };

      try {
        // For absolute URLs (e.g., Supabase) use CORS anonymous to keep canvas untainted
        if (isAbsolute) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          assignHandlers(img);
          img.src = url;
          return;
        }

        // For root-relative paths, prefer fetching as a Blob then using an object URL.
        // This avoids any odd route collisions and keeps canvas clean.
        if (isRootRelative && typeof window !== 'undefined') {
          try {
            const resp = await fetch(url, { cache: 'force-cache' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const contentType = resp.headers.get('content-type') || '';
            if (!contentType.startsWith('image/')) {
              // Not an image? fall back to direct assignment
              throw new Error(`Unexpected content-type: ${contentType}`);
            }
            const blob = await resp.blob();
            const objectUrl = URL.createObjectURL(blob);
            const img = new Image();
            assignHandlers(img);
            img.src = objectUrl;

            // Revoke object URL after it loads to free memory
            const onLoad = () => URL.revokeObjectURL(objectUrl);
            img.addEventListener('load', onLoad, { once: true });
            return;
          } catch {
            // Fallback to direct assignment if fetch fails for any reason
          }
        }

        // Fallback: direct assignment (same-origin public assets)
        const img = new Image();
        img.crossOrigin = 'anonymous';
        assignHandlers(img);
        img.src = url;
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Unknown image load error'));
      }
    });
  }

  /**
   * Generate a placeholder image when template image fails to load
   */
  private generatePlaceholderImage(width: number, height: number, text: string): HTMLImageElement | null {
    try {
      if (typeof document === 'undefined') return null;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#f0f0f0');
      gradient.addColorStop(1, '#d0d0d0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Border
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, width - 4, height - 4);

      // Grid pattern (subtle)
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Convert canvas to image
      const img = new Image();
      img.src = canvas.toDataURL('image/png');
      
      return img;
    } catch (error) {
      console.error('Failed to generate placeholder image:', error);
      return null;
    }
  }

  async processUserImage(file: File, options: ImageLoadOptions = {}): Promise<ImageElement | null> {
    try {
      // Validate file first
      const validation = this.validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid image file');
      }

      const dataURL = await this.fileToDataURL(file);
      if (!dataURL) {
        throw new Error('Failed to convert file to data URL');
      }

      const img = await this.loadImage(dataURL);
      if (!img) {
        throw new Error('Failed to load image from data URL');
      }

      const {
        maxWidth = this.template.width_px * 0.6,
        maxHeight = this.template.height_px * 0.6,
        minSize = 100,
        centerOnLoad = true
      } = options;

      // Validate calculated dimensions
      if (maxWidth <= 0 || maxHeight <= 0 || minSize <= 0) {
        throw new Error('Invalid size options provided');
      }

      const { width: targetW, height: targetH } = this.calculateOptimalSize(
        img.width,
        img.height,
        maxWidth,
        maxHeight,
        minSize
      );

      if (targetW <= 0 || targetH <= 0) {
        throw new Error('Calculated image dimensions are invalid');
      }

      const { x, y } = centerOnLoad 
        ? this.getCenterPosition(targetW, targetH)
        : { x: 0, y: 0 };

      const element: ImageElement = {
        id: uuidv4(),
        type: 'image',
        imageUrl: dataURL,
        x,
        y,
        width: targetW,
        height: targetH,
        originalWidth: img.width,
        originalHeight: img.height,
        filename: file.name,
        zIndex: 0, // Will be set by the state manager
        visible: true,
        locked: false,
        flippedH: false,
        flippedV: false
      };

      return element;
    } catch (error) {
      console.error('Failed to process image:', error);
      // Return null but also provide detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Image processing failed: ${errorMessage}`);
      return null;
    }
  }

  private fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validate file input
      if (!file || !(file instanceof File)) {
        reject(new Error('Invalid file provided'));
        return;
      }

      const reader = new FileReader();
      
      // Set up timeout for file reading (30 seconds for large files)
      const timeoutId = setTimeout(() => {
        reader.abort();
        reject(new Error('File reading timeout - file took too long to read'));
      }, 30000);

      reader.onload = (e) => {
        clearTimeout(timeoutId);
        
        const result = e.target?.result;
        if (typeof result === 'string' && result) {
          // Validate the result is a valid data URL
          if (!result.startsWith('data:')) {
            reject(new Error('Invalid data URL generated from file'));
            return;
          }
          resolve(result);
        } else {
          reject(new Error('Failed to read file as data URL'));
        }
      };

      reader.onerror = () => {
        clearTimeout(timeoutId);
        const error = reader.error;
        const errorMessage = error ? `File read error: ${error.message}` : 'Unknown file read error';
        reject(new Error(errorMessage));
      };

      reader.onabort = () => {
        clearTimeout(timeoutId);
        reject(new Error('File reading was aborted'));
      };

      try {
        reader.readAsDataURL(file);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start file reading: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  private calculateOptimalSize(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    minSize: number
  ): { width: number; height: number } {
    // Validate input parameters
    if (originalWidth <= 0 || originalHeight <= 0) {
      throw new Error('Original dimensions must be positive numbers');
    }

    if (maxWidth <= 0 || maxHeight <= 0) {
      throw new Error('Maximum dimensions must be positive numbers');
    }

    if (minSize <= 0) {
      throw new Error('Minimum size must be a positive number');
    }

    // Prevent extremely large dimensions that could cause memory issues
    if (originalWidth > 20000 || originalHeight > 20000) {
      throw new Error('Original image dimensions are too large (max 20000x20000)');
    }

    const scaleW = maxWidth / originalWidth;
    const scaleH = maxHeight / originalHeight;
    const scale = Math.min(scaleW, scaleH, 1);
    
    let targetW = Math.max(minSize, originalWidth * scale);
    let targetH = Math.max(minSize, originalHeight * scale);
    
    if (originalWidth * scale < minSize || originalHeight * scale < minSize) {
      const aspectRatio = originalWidth / originalHeight;
      
      // Validate aspect ratio
      if (!isFinite(aspectRatio) || aspectRatio <= 0) {
        throw new Error('Invalid aspect ratio calculated');
      }
      
      if (aspectRatio > 1) {
        targetW = minSize * aspectRatio;
        targetH = minSize;
      } else {
        targetW = minSize;
        targetH = minSize / aspectRatio;
      }
    }
    
    // Final validation of calculated dimensions
    if (!isFinite(targetW) || !isFinite(targetH) || targetW <= 0 || targetH <= 0) {
      throw new Error('Calculated dimensions are invalid');
    }
    
    // Ensure dimensions don't exceed browser limits
    const maxCanvasSize = 8192;
    if (targetW > maxCanvasSize || targetH > maxCanvasSize) {
      const scaleFactor = maxCanvasSize / Math.max(targetW, targetH);
      targetW *= scaleFactor;
      targetH *= scaleFactor;
    }
    
    return { 
      width: Math.round(targetW), 
      height: Math.round(targetH) 
    };
  }

  private getCenterPosition(width: number, height: number): { x: number; y: number } {
    // Validate input dimensions
    if (width <= 0 || height <= 0) {
      throw new Error('Width and height must be positive numbers');
    }

    if (!isFinite(width) || !isFinite(height)) {
      throw new Error('Width and height must be finite numbers');
    }

    const x = (this.template.width_px - width) / 2;
    const y = (this.template.height_px - height) / 2;
    
    // Ensure calculated positions are valid
    if (!isFinite(x) || !isFinite(y)) {
      throw new Error('Calculated center position is invalid');
    }

    return { x, y };
  }

  // Canvas memory cleanup utility
  private cleanupCanvas(canvas: HTMLCanvasElement): void {
    try {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      // Reset canvas dimensions to free memory
      canvas.width = 0;
      canvas.height = 0;
    } catch (error) {
      console.warn('Failed to cleanup canvas:', error);
    }
  }

  getBackgroundImage(): HTMLImageElement | null {
    return this.bgImage;
  }

  getFrameImage(): HTMLImageElement | null {
    return this.frameImage;
  }

  private getFrameUrl(size: 'slim' | 'std' | 'xl'): string {
    switch (size) {
      case 'slim':
        return '/license-plate-frame.png';
      case 'std':
        return '/license-plate-frame-std.png';
      case 'xl':
        return '/license-plate-frame-xl.png';
      default:
        return '/license-plate-frame.png';
    }
  }

  async changeFrameSize(size: 'slim' | 'std' | 'xl'): Promise<void> {
    this.currentFrameSize = size;
    try {
      const frameUrl = this.getFrameUrl(size);
      const frameImg = await this.loadImage(frameUrl);
      if (!frameImg) {
        throw new Error('Frame image failed to load');
      }

      this.frameImage = frameImg;
      this.onImageLoad?.('frame', frameImg);
    } catch (error) {
      const errorMessage = `Failed to load frame image: ${
        error instanceof Error ? error.message : 'Image failed to load'
      }`;
      console.warn(errorMessage);
      this.frameImage = null;
    }
  }

  async updateTemplate(newTemplate: PlateTemplate): Promise<void> {
    try {
      // Validate new template
      if (!newTemplate) {
        throw new Error('Template cannot be null or undefined');
      }

      if (!newTemplate.id || typeof newTemplate.id !== 'string') {
        throw new Error('Template must have a valid ID');
      }

      if (typeof newTemplate.width_px !== 'number' || newTemplate.width_px <= 0) {
        throw new Error('Template must have a valid positive width');
      }

      if (typeof newTemplate.height_px !== 'number' || newTemplate.height_px <= 0) {
        throw new Error('Template must have a valid positive height');
      }

      // Clear existing images before loading new ones
      this.bgImage = null;
      this.frameImage = null;

      // Update template reference
      this.template = newTemplate;

      // Load new template images
      await this.loadTemplateImages();

      console.log(`Template updated successfully: ${newTemplate.name || newTemplate.id}`);
    } catch (error) {
      const errorMessage = `Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Image optimization utilities
  compressImage(dataURL: string, quality: number = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validate input parameters
      if (!dataURL || typeof dataURL !== 'string') {
        reject(new Error('Invalid data URL provided'));
        return;
      }

      if (quality < 0 || quality > 1) {
        reject(new Error('Quality must be between 0 and 1'));
        return;
      }

      // Validate data URL format
      if (!dataURL.startsWith('data:image/')) {
        reject(new Error('Invalid image data URL format'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Set up timeout for image loading
      const timeoutId = setTimeout(() => {
        reject(new Error('Image compression timeout - image took too long to load'));
      }, 10000); // 10 second timeout
      
      img.onload = () => {
        clearTimeout(timeoutId);
        
        try {
          // Validate image dimensions
          if (img.width <= 0 || img.height <= 0) {
            reject(new Error('Invalid image dimensions'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          
          if (!ctx) {
            reject(new Error('Failed to get canvas 2D context'));
            return;
          }

          // Clear canvas and draw image
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // Convert to data URL with error handling
          try {
            const compressedDataURL = canvas.toDataURL('image/jpeg', quality);
            if (!compressedDataURL || compressedDataURL === 'data:,') {
              reject(new Error('Failed to generate compressed image data URL'));
              return;
            }
            resolve(compressedDataURL);
          } catch (canvasError) {
            reject(new Error(`Canvas conversion failed: ${canvasError instanceof Error ? canvasError.message : 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      img.onerror = (event) => {
        clearTimeout(timeoutId);
        const errorMsg = event instanceof ErrorEvent ? event.message : 'Failed to load image for compression';
        reject(new Error(`Image load error: ${errorMsg}`));
      };
      
      // Set image source last to trigger loading
      try {
        img.src = dataURL;
      } catch (error) {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to set image source: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  resizeImage(dataURL: string, maxWidth: number, maxHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validate input parameters
      if (!dataURL || typeof dataURL !== 'string') {
        reject(new Error('Invalid data URL provided'));
        return;
      }

      if (!dataURL.startsWith('data:image/')) {
        reject(new Error('Invalid image data URL format'));
        return;
      }

      if (maxWidth <= 0 || maxHeight <= 0) {
        reject(new Error('Invalid dimensions: maxWidth and maxHeight must be positive numbers'));
        return;
      }

      if (maxWidth > 8192 || maxHeight > 8192) {
        reject(new Error('Dimensions too large: maximum 8192x8192 pixels'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Set up timeout for image loading
      const timeoutId = setTimeout(() => {
        reject(new Error('Image resize timeout - image took too long to load'));
      }, 10000); // 10 second timeout
      
      img.onload = () => {
        clearTimeout(timeoutId);
        
        try {
          // Validate original image dimensions
          if (img.width <= 0 || img.height <= 0) {
            reject(new Error('Invalid original image dimensions'));
            return;
          }

          const { width, height } = this.calculateOptimalSize(
            img.width,
            img.height,
            maxWidth,
            maxHeight,
            1
          );
          
          // Validate calculated dimensions
          if (width <= 0 || height <= 0) {
            reject(new Error('Calculated resize dimensions are invalid'));
            return;
          }

          canvas.width = width;
          canvas.height = height;
          
          if (!ctx) {
            reject(new Error('Failed to get canvas 2D context'));
            return;
          }

          // Clear canvas and configure for high quality rendering
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw resized image
          try {
            ctx.drawImage(img, 0, 0, width, height);
          } catch (drawError) {
            reject(new Error(`Failed to draw image on canvas: ${drawError instanceof Error ? drawError.message : 'Unknown error'}`));
            return;
          }
          
          // Convert to data URL
          try {
            const resizedDataURL = canvas.toDataURL('image/png');
            if (!resizedDataURL || resizedDataURL === 'data:,') {
              reject(new Error('Failed to generate resized image data URL'));
              return;
            }
            resolve(resizedDataURL);
          } catch (canvasError) {
            reject(new Error(`Canvas conversion failed: ${canvasError instanceof Error ? canvasError.message : 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Image resize failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      img.onerror = (event) => {
        clearTimeout(timeoutId);
        const errorMsg = event instanceof ErrorEvent ? event.message : 'Failed to load image for resizing';
        reject(new Error(`Image load error: ${errorMsg}`));
      };
      
      // Set image source last to trigger loading
      try {
        img.src = dataURL;
      } catch (error) {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to set image source: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  validateImageFile(file: File): { isValid: boolean; error?: string } {
    try {
      // Check if file exists
      if (!file) {
        return { isValid: false, error: 'No file provided' };
      }

      // Check if it's actually a File object
      if (!(file instanceof File)) {
        return { isValid: false, error: 'Invalid file object provided' };
      }

      // Check file name
      if (!file.name || typeof file.name !== 'string') {
        return { isValid: false, error: 'File must have a valid name' };
      }

      // Check file size constraints
      const maxSize = 10 * 1024 * 1024; // 10MB
      const minSize = 100; // 100 bytes minimum
      
      if (file.size > maxSize) {
        return { 
          isValid: false, 
          error: `Image file is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB. Current size: ${Math.round(file.size / (1024 * 1024) * 100) / 100}MB.` 
        };
      }

      if (file.size < minSize) {
        return { isValid: false, error: 'Image file is too small or corrupted' };
      }

      // Check MIME type
      const allowedTypes = [
        'image/jpeg', 
        'image/jpg', 
        'image/png', 
        'image/gif', 
        'image/webp',
        'image/bmp',
        'image/svg+xml'
      ];

      if (!file.type) {
        return { isValid: false, error: 'File type could not be determined' };
      }

      if (!allowedTypes.includes(file.type.toLowerCase())) {
        return { 
          isValid: false, 
          error: `Unsupported image format: ${file.type}. Supported formats: JPEG, PNG, GIF, WebP, BMP, SVG.` 
        };
      }

      // Additional file extension validation
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
      
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        return { 
          isValid: false, 
          error: 'File extension does not match an allowed image format' 
        };
      }

      // Check for potential security issues with file name
      if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
        return { isValid: false, error: 'File name contains invalid characters' };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: `File validation error: ${error instanceof Error ? error.message : 'Unknown validation error'}` 
      };
    }
  }
}

// Hook to create and use the image service
export const useEditorImageService = (
  template: PlateTemplate,
  onImageLoad?: (type: 'background' | 'frame', image: HTMLImageElement) => void
) => {
  const [imageService, setImageService] = useState<EditorImageService | null>(null);

  useEffect(() => {
    const service = new EditorImageService(template, onImageLoad);
    setImageService(service);
  }, [template, onImageLoad]);

  const processUserImage = useCallback(
    async (file: File, options?: ImageLoadOptions) => {
      return await imageService?.processUserImage(file, options) || null;
    },
    [imageService]
  );

  const validateImageFile = useCallback(
    (file: File) => {
      return imageService?.validateImageFile(file) || { isValid: false, error: 'Service not ready' };
    },
    [imageService]
  );

  const changeFrameSize = useCallback(
    async (size: 'slim' | 'std' | 'xl') => {
      await imageService?.changeFrameSize(size);
    },
    [imageService]
  );

  return {
    imageService,
    processUserImage,
    validateImageFile,
    getBackgroundImage: () => imageService?.getBackgroundImage() || null,
    getFrameImage: () => imageService?.getFrameImage() || null,
    changeFrameSize
  };
};