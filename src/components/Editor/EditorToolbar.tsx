"use client";

import { useRef } from 'react';
import { Type, Image as ImageIcon, Download, Save, Undo, Redo } from 'lucide-react';

interface EditorToolbarProps {
  onAddText: () => void;
  onAddImage: (file: File) => void;
  onExport: () => void;
  onSave: () => void;
}

export default function EditorToolbar({
  onAddText,
  onAddImage,
  onExport,
  onSave
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
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Tools</h3>
        <div className="space-y-2">
          <button
            onClick={onAddText}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Type className="w-4 h-4" />
            Add Text
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
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
        <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
        <div className="space-y-2">
          <button
            onClick={onSave}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Design
          </button>
          
          <button
            onClick={onExport}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Image
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">History</h3>
        <div className="space-y-2">
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 rounded-md cursor-not-allowed"
            disabled
          >
            <Undo className="w-4 h-4" />
            Undo
          </button>
          
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 rounded-md cursor-not-allowed"
            disabled
          >
            <Redo className="w-4 h-4" />
            Redo
          </button>
        </div>
      </div>
    </div>
  );
}
