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

  constructor(template: PlateTemplate, onImageLoad?: (type: 'background' | 'frame', image: HTMLImageElement) => void) {
    this.template = template;
    this.onImageLoad = onImageLoad;
    this.loadTemplateImages();
  }

  private async loadTemplateImages() {
    // Load background image
    if (this.template.image_url) {
      try {
        const bgImg = await this.loadImage(this.template.image_url);
        this.bgImage = bgImg;
        this.onImageLoad?.('background', bgImg);
      } catch (error) {
        console.error(`Failed to load background image from ${this.template.image_url}:`, 
          error instanceof Error ? error.message : 'Image failed to load');
      }
    }

    // Load the license plate frame image
    try {
      const frameImg = await this.loadImage('/license-plate-frame.png');
      this.frameImage = frameImg;
      this.onImageLoad?.('frame', frameImg);
    } catch (error) {
      console.error('Failed to load frame image from /license-plate-frame.png:', 
        error instanceof Error ? error.message : 'Image failed to load');
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

  async processUserImage(file: File, options: ImageLoadOptions = {}): Promise<ImageElement | null> {
    try {
      const dataURL = await this.fileToDataURL(file);
      const img = await this.loadImage(dataURL);

      const {
        maxWidth = this.template.width_px * 0.6,
        maxHeight = this.template.height_px * 0.6,
        minSize = 100,
        centerOnLoad = true
      } = options;

      const { width: targetW, height: targetH } = this.calculateOptimalSize(
        img.width,
        img.height,
        maxWidth,
        maxHeight,
        minSize
      );

      const { x, y } = centerOnLoad 
        ? this.getCenterPosition(targetW, targetH)
        : { x: 0, y: 0 };

      return {
        id: uuidv4(),
        type: 'image',
        imageUrl: dataURL,
        x,
        y,
        width: targetW,
        height: targetH,
        originalWidth: img.width,
        originalHeight: img.height,
        zIndex: 0, // Will be set by the state manager
        visible: true,
        locked: false,
        flippedH: false,
        flippedV: false,
        layer: 'base'
      };
    } catch (error) {
      console.error('Failed to process image:', error);
      return null;
    }
  }

  private fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private calculateOptimalSize(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    minSize: number
  ): { width: number; height: number } {
    const scaleW = maxWidth / originalWidth;
    const scaleH = maxHeight / originalHeight;
    const scale = Math.min(scaleW, scaleH, 1);
    
    let targetW = Math.max(minSize, originalWidth * scale);
    let targetH = Math.max(minSize, originalHeight * scale);
    
    if (originalWidth * scale < minSize || originalHeight * scale < minSize) {
      const aspectRatio = originalWidth / originalHeight;
      if (aspectRatio > 1) {
        targetW = minSize * aspectRatio;
        targetH = minSize;
      } else {
        targetW = minSize;
        targetH = minSize / aspectRatio;
      }
    }
    
    return { width: targetW, height: targetH };
  }

  private getCenterPosition(width: number, height: number): { x: number; y: number } {
    return {
      x: (this.template.width_px - width) / 2,
      y: (this.template.height_px - height) / 2
    };
  }

  getBackgroundImage(): HTMLImageElement | null {
    return this.bgImage;
  }

  getFrameImage(): HTMLImageElement | null {
    return this.frameImage;
  }

  async updateTemplate(newTemplate: PlateTemplate) {
    this.template = newTemplate;
    await this.loadTemplateImages();
  }

  // Image optimization utilities
  compressImage(dataURL: string, quality: number = 0.8): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataURL);
        }
      };
      
      img.src = dataURL;
    });
  }

  resizeImage(dataURL: string, maxWidth: number, maxHeight: number): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const { width, height } = this.calculateOptimalSize(
          img.width,
          img.height,
          maxWidth,
          maxHeight,
          1
        );
        
        canvas.width = width;
        canvas.height = height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(dataURL);
        }
      };
      
      img.src = dataURL;
    });
  }

  validateImageFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      return { isValid: false, error: 'Image file is too large. Maximum size is 10MB.' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Unsupported image format. Please use JPEG, PNG, GIF, or WebP.' };
    }

    return { isValid: true };
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

  return {
    imageService,
    processUserImage,
    validateImageFile,
    getBackgroundImage: () => imageService?.getBackgroundImage() || null,
    getFrameImage: () => imageService?.getFrameImage() || null
  };
};