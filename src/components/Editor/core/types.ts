
import { PlateTemplate, TextElement, ImageElement, UserDesign } from '@/types';

export interface EditorProps {
  template: PlateTemplate;
  existingDesign?: UserDesign | null;
  onSave?: (designData: unknown) => void | Promise<void>;
}

// Paint stroke point interface
export interface PaintPoint {
  x: number;
  y: number;
  pressure?: number; // For variable opacity/size
  timestamp?: number; // For spray effect timing
}

// Paint element interface
export interface PaintElement {
  id: string;
  type: 'paint';
  points: PaintPoint[];
  color: string;
  brushSize: number;
  opacity: number;
  brushType: 'brush' | 'airbrush' | 'spray';
  x: number; // For positioning (inherited from base)
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  flippedH?: boolean;
  flippedV?: boolean;
  layer?: 'base' | 'licenseplate';
}

export type Element = TextElement | ImageElement | PaintElement;

export type ToolType = 'select' | 'text' | 'image' | 'brush' | 'airbrush' | 'spray';

export interface PaintSettings {
  color: string;
  brushSize: number;
  opacity: number;
  brushType: 'brush' | 'airbrush' | 'spray';
}

export interface EditorState {
  elements: Element[];
  selectedId: string | null;
  editingTextId: string | null;
  activeLayer: 'base' | 'licenseplate';
  activeTool: ToolType;
  paintSettings: PaintSettings;
  isPainting: boolean;
  currentPaintStroke: PaintPoint[] | null;
}
