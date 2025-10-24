
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

// Shape element interface
export interface ShapeElement {
  id: string;
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'star' | 'hexagon' | 'pentagon';
  fillType: 'solid' | 'outline';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  flippedH?: boolean;
  flippedV?: boolean;
  layer?: 'base' | 'licenseplate';
}

// Centerline element interface
export interface CenterlineElement {
  id: string;
  type: 'centerline';
  x: number; // Center point x
  y: number; // Center point y
  width: number; // Canvas width
  height: number; // Canvas height
  color: string;
  strokeWidth: number;
  opacity: number;
  zIndex: number;
  visible?: boolean;
  locked?: boolean;
  layer?: 'base' | 'licenseplate';
  flippedH?: boolean;
  flippedV?: boolean;
}

export type Element = TextElement | ImageElement | PaintElement | ShapeElement | CenterlineElement;

export type ToolType = 'select' | 'text' | 'image' | 'brush' | 'airbrush' | 'spray' | 'eraser' | 'shape';

export interface ShapeSettings {
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'star' | 'hexagon' | 'pentagon';
  fillType: 'solid' | 'outline';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface PaintSettings {
  color: string;
  brushSize: number;
  opacity: number;
  brushType: 'brush' | 'airbrush' | 'spray';
}

export type FrameSize = 'slim' | 'std' | 'xl';

export interface EditorState {
  elements: Element[];
  selectedId: string | null;
  editingTextId: string | null;
  activeLayer: 'base' | 'licenseplate';
  activeTool: ToolType;
  paintSettings: PaintSettings;
  shapeSettings: ShapeSettings;
  isPainting: boolean;
  currentPaintStroke: PaintPoint[] | null;
  frameSize: FrameSize;
}
