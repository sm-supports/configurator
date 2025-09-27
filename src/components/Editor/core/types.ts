
import { PlateTemplate, TextElement, ImageElement, UserDesign } from '@/types';

export interface EditorProps {
  template: PlateTemplate;
  existingDesign?: UserDesign | null;
  onSave?: (designData: unknown) => void | Promise<void>;
}

export type Element = TextElement | ImageElement;

export interface EditorState {
  elements: Element[];
  selectedId: string | null;
  editingTextId: string | null;
  activeLayer: 'base' | 'licenseplate';
}
