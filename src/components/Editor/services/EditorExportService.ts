import type Konva from 'konva';
import { PlateTemplate } from '@/types';
import { EditorState } from '../core/types';
import { exportToDataURL, downloadFile } from '../canvas/utils/canvasUtils';

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'pdf' | 'eps' | 'tiff';
  quality?: number;
  filename?: string;
}

export interface SaveOptions {
  name?: string;
  isPublic?: boolean;
  designId?: string;
}

export class EditorExportService {
  private stageRef: React.RefObject<Konva.Stage>;
  private template: PlateTemplate;

  constructor(stageRef: React.RefObject<Konva.Stage>, template: PlateTemplate) {
    this.stageRef = stageRef;
    this.template = template;
  }

  async exportImage(options: ExportOptions): Promise<boolean> {
    if (!this.stageRef.current) return false;

    try {
      const designName = `${this.template.name.replace(/\s+/g, '_')}_design`;
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = options.filename || `${designName}_${timestamp}_600dpi.${options.format}`;

      const dataURL = exportToDataURL(
        this.stageRef as React.RefObject<Konva.Stage>, 
        options.format === 'jpeg' ? 'image/jpeg' : 'image/png', 
        options.quality || 1
      );

      if (!dataURL) return false;

      if (options.format === 'pdf') {
        const { default: jsPDF } = await import('jspdf');
        const mmWidth = (this.template.width_px * 25.4) / 600;
        const mmHeight = (this.template.height_px * 25.4) / 600;
        
        const pdf = new jsPDF({
          orientation: mmWidth > mmHeight ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [mmWidth, mmHeight],
          compress: false
        });
        
        pdf.addImage(dataURL, 'PNG', 0, 0, mmWidth, mmHeight, undefined, 'NONE');
        pdf.save(`${designName}_${timestamp}_print_ready.pdf`);
      } else {
        downloadFile(dataURL, filename);
      }

      return true;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    }
  }

  async saveDesign(_state: EditorState, _userId: string, _options: SaveOptions = {}): Promise<{ success: boolean; error?: string; designId?: string }> {
    // Save functionality disabled in demo version
    return { success: false, error: 'Save feature coming soon in the full version!' };
  }

  generatePreviewUrl(): string | null {
    if (!this.stageRef.current) return null;
    
    try {
      return exportToDataURL(
        this.stageRef as React.RefObject<Konva.Stage>, 
        'image/png', 
        0.5 // Lower quality for preview
      );
    } catch (error) {
      console.error('Preview generation failed:', error);
      return null;
    }
  }

  async exportMultipleFormats(formats: ExportOptions['format'][]): Promise<boolean[]> {
    const results: boolean[] = [];
    
    for (const format of formats) {
      const result = await this.exportImage({ format });
      results.push(result);
    }
    
    return results;
  }

  getExportDimensions(): { width: number; height: number; mmWidth: number; mmHeight: number } {
    const width = this.template.width_px;
    const height = this.template.height_px;
    const mmWidth = (width * 25.4) / 600; // Convert px to mm at 600 DPI
    const mmHeight = (height * 25.4) / 600;
    
    return { width, height, mmWidth, mmHeight };
  }

  validateDesignForExport(state: EditorState): { isValid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (state.elements.length === 0) {
      warnings.push('Design is empty. Consider adding text or images.');
    }

    // Check for text elements with empty content
    const emptyTextElements = state.elements.filter(el => 
      el.type === 'text' && (!('text' in el) || !el.text?.trim())
    );
    
    if (emptyTextElements.length > 0) {
      warnings.push(`${emptyTextElements.length} text element(s) have no content.`);
    }

    // Check for elements outside template bounds
    const outOfBoundsElements = state.elements.filter(el => 
      el.x < 0 || el.y < 0 || 
      el.x + (el.width || 0) > this.template.width_px || 
      el.y + (el.height || 0) > this.template.height_px
    );

    if (outOfBoundsElements.length > 0) {
      warnings.push(`${outOfBoundsElements.length} element(s) extend outside the template bounds.`);
    }

    // Check for very small elements that might not print well
    const tinyElements = state.elements.filter(el => 
      (el.width || 0) < 20 || (el.height || 0) < 20
    );

    if (tinyElements.length > 0) {
      warnings.push(`${tinyElements.length} element(s) are very small and might not print clearly.`);
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}

// Hook to create and use the export service
export const useEditorExportService = (
  stageRef: React.RefObject<Konva.Stage>,
  template: PlateTemplate
) => {
  return new EditorExportService(stageRef, template);
};