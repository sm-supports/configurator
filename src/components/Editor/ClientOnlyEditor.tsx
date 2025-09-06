"use client";

import { useState, useEffect } from 'react';
import { PlateTemplate, UserDesign } from '@/types';

interface ClientOnlyEditorProps {
  template: PlateTemplate;
  existingDesign?: UserDesign | null;
  onSave?: (designData: unknown) => void | Promise<void>;
}

export default function ClientOnlyEditor({ template, existingDesign, onSave }: ClientOnlyEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const [EditorComponent, setEditorComponent] = useState<React.ComponentType<{ 
    template: PlateTemplate; 
    existingDesign?: UserDesign | null;
    onSave?: (designData: unknown) => void | Promise<void>; 
  }> | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import Editor only on client side
    import('./Editor')
      .then((module) => {
        setEditorComponent(() => module.default);
      })
      .catch(() => {
        // Editor component failed to load
      });
  }, []);

  if (!isClient || !EditorComponent) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg">Loading editor...</div>
      </div>
    );
  }

  return <EditorComponent template={template} existingDesign={existingDesign} onSave={onSave} />;
}
