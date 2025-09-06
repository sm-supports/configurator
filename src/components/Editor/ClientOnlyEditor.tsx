"use client";

import { useState, useEffect } from 'react';
import { PlateTemplate } from '@/types';

interface ClientOnlyEditorProps {
  template: PlateTemplate;
  onSave?: (designData: unknown) => void | Promise<void>;
}

export default function ClientOnlyEditor({ template, onSave }: ClientOnlyEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const [EditorComponent, setEditorComponent] = useState<React.ComponentType<{ template: PlateTemplate; onSave?: (designData: unknown) => void | Promise<void>; }> | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import Editor only on client side
    import('./Editor')
      .then((module) => {
        setEditorComponent(() => module.default);
      })
      .catch((error) => {
        console.error('Failed to load Editor component:', error);
      });
  }, []);

  if (!isClient || !EditorComponent) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg">Loading editor...</div>
      </div>
    );
  }

  return <EditorComponent template={template} onSave={onSave} />;
}
