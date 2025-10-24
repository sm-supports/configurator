"use client";

import { useState, useEffect } from 'react';
import { PlateTemplate } from '@/types';
import ClientOnlyEditor from '@/components/Editor/ClientOnlyEditor';

export const runtime = 'edge';

// Preload the editor chunk immediately
if (typeof window !== 'undefined') {
  import('@/components/Editor/Editor').catch(() => {
    // Silently fail if preload fails
  });
}

// Sample template data for demo
const SAMPLE_TEMPLATE: PlateTemplate = {
  id: '1',
  name: 'US Standard',
  image_url: 'https://via.placeholder.com/1200x600/2563eb/ffffff?text=US+Standard',
  width_px: 1200,
  height_px: 600,
  country_id: '1',
  country: { id: '1', name: 'United States', code: 'USA', flag_emoji: '🇺🇸', created_at: '', updated_at: '' },
  is_active: true,
  created_at: '',
  updated_at: ''
};

export default function EditorPage() {
  const [template] = useState<PlateTemplate>(SAMPLE_TEMPLATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple loading simulation
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    console.log('Save feature coming soon!');
    alert('Save feature coming soon! This is a demo version.');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-lg text-white">Loading editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      <div className="h-full">
        <ClientOnlyEditor template={template} existingDesign={null} onSave={handleSave} />
      </div>
    </div>
  );
}
