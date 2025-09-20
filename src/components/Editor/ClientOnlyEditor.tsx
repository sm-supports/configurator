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
    // Immediately set client flag
    setIsClient(true);
    
    // Aggressive preloading with performance hints
    const loadEditor = async () => {
      try {
        // Use webpackPreload for better performance
        const editorModule = await import(
          /* webpackChunkName: "editor" */
          /* webpackPreload: true */
          './Editor'
        );
        setEditorComponent(() => editorModule.default);
      } catch (error) {
        console.error('Failed to load Editor:', error);
      }
    };
    
    // Start loading immediately, don't wait for idle
    loadEditor();
  }, []);

  // Show minimal loading state
  if (!isClient || !EditorComponent) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Fast loading skeleton */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b p-4 h-20">
          <div className="flex gap-2 items-center">
            <div className="w-10 h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex-1"></div>
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center">
            <div className="w-96 h-64 bg-gray-200 rounded-lg animate-pulse mb-4"></div>
            <div className="text-lg font-medium text-gray-600">Loading your canvas...</div>
          </div>
        </div>
      </div>
    );
  }

  return <EditorComponent template={template} existingDesign={existingDesign} onSave={onSave} />;
}
