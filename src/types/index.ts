export interface Country {
  id: string;
  name: string;
  code: string;
  flag_emoji: string;
  created_at: string;
  updated_at: string;
}

export interface PlateTemplate {
  id: string;
  name: string;
  image_url: string;
  width_px: number;
  height_px: number;
  country_id: string;
  country?: Country;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserDesign {
  id: string;
  user_id: string;
  template_id: string;
  design_json: DesignData;
  name?: string;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
  template?: PlateTemplate;
}

export interface DesignData {
  elements: DesignElement[];
  template_id: string;
  width: number;
  height: number;
}

export interface DesignElement {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  flippedH?: boolean;
  flippedV?: boolean;
  opacity?: number;
  layer?: 'base' | 'licenseplate';
}

export interface TextElement extends DesignElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  color: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface ImageElement extends DesignElement {
  type: 'image';
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
}

export interface EditorState {
  selectedElement: string | null;
  elements: DesignElement[];
  template: PlateTemplate | null;
  zoom: number;
  pan: { x: number; y: number };
}
