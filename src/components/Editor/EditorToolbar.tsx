"use client";

import { useRef } from 'react';
import { Type, Image as ImageIcon, Download, Save, Undo, Redo } from 'lucide-react';

interface EditorToolbarProps {
  onAddText: () => void;
  onAddImage: (file: File) => void;
  onExport: () => void;
  onSave: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function EditorToolbar({
  onAddText,
  onAddImage,
  onExport,
  onSave,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onAddImage(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tools</h3>
        <div className="space-y-3">
          <button
            onClick={onAddText}
            className="w-full flex items-center gap-3 px-4 py-3 text-base text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
          >
            <Type className="w-5 h-5" />
            Add Text
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 text-base text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
          >
            <ImageIcon className="w-5 h-5" />
            Add Image
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
        <div className="space-y-3">
          <button
            onClick={onSave}
            className="w-full flex items-center gap-3 px-4 py-3 text-base text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
          >
            <Save className="w-5 h-5" />
            Save Design
          </button>
          
          <button
            onClick={onExport}
            className="w-full flex items-center gap-3 px-4 py-3 text-base text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
          >
            <Download className="w-5 h-5" />
            Export Image
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">History</h3>
        <div className="space-y-3">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`w-full flex items-center justify-between px-4 py-3 text-base rounded-lg transition-colors border ${
              canUndo
                ? 'text-gray-900 bg-white hover:bg-gray-100 border-gray-200 hover:border-gray-300 cursor-pointer'
                : 'text-gray-500 bg-gray-100 border-gray-200 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-3">
              <Undo className="w-5 h-5" />
              Undo
            </div>
            <span className="text-xs text-gray-400">Ctrl+Z</span>
          </button>
          
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`w-full flex items-center justify-between px-4 py-3 text-base rounded-lg transition-colors border ${
              canRedo
                ? 'text-gray-900 bg-white hover:bg-gray-100 border-gray-200 hover:border-gray-300 cursor-pointer'
                : 'text-gray-500 bg-gray-100 border-gray-200 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-3">
              <Redo className="w-5 h-5" />
              Redo
            </div>
            <span className="text-xs text-gray-400">Ctrl+Y</span>
          </button>
        </div>
      </div>
    </div>
  );
}
