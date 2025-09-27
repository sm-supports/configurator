// Main Editor Components
export { default as Editor } from './Editor';
export { default as ClientOnlyEditor } from './ClientOnlyEditor';

// Core
export { EditorProvider, useEditorContext } from './core/context/EditorContext';
export type { EditorState, Element, EditorProps } from './core/types';
export { vehiclePlateFonts } from './core/constants';

// Canvas Components
export { Canvas } from './canvas/Canvas';
export { ImageElementComponent } from './canvas/elements/ImageElement';
export { TextElementComponent } from './canvas/elements/TextElement';
export { measureText, computeSpawnPosition, exportToDataURL, downloadFile } from './canvas/utils/canvasUtils';

// UI Components
export { EditorLayout } from './ui/layout/EditorLayout';
export { EditorContent } from './ui/layout/EditorContent';
export { DownloadDialog } from './ui/panels/DownloadDialog';
export { LayersPanel } from './ui/panels/LayersPanel';
export { Toolbar } from './ui/panels/Toolbar';
export { EditorErrorBoundary } from './ui/ErrorBoundary';

// Hooks
export { useEditorHistory } from './hooks/useEditorHistory';
export { useElementManipulation } from './hooks/useElementManipulation';
export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
export { useZoom } from './hooks/useZoom';

// Services
export { EditorStateManager, useEditorStateManager } from './services/EditorStateManager';
export { EditorExportService, useEditorExportService } from './services/EditorExportService';
export { EditorImageService, useEditorImageService } from './services/EditorImageService';