"use client";

import { useState, useEffect } from 'react';
import { PlateTemplate } from '@/types';
import { EditorState } from '@/types';

interface ClientOnlyEditorProps {
  template: PlateTemplate;
  initialDesign?: EditorState;
  onSave?: (design: EditorState) => void;
}

export default function ClientOnlyEditor({ template, initialDesign, onSave }: ClientOnlyEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const [EditorComponent, setEditorComponent] = useState<React.ComponentType<{
    template: PlateTemplate;
    initialDesign?: EditorState;
    onSave?: (design: EditorState) => void;
  }> | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import Editor only on client side
    import('./Editor').then((module) => {
      setEditorComponent(() => module.default);
    });
  }, []);

  if (!isClient || !EditorComponent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading editor...</div>
      </div>
    );
  }

  return <EditorComponent template={template} initialDesign={initialDesign} onSave={onSave} />;
}
