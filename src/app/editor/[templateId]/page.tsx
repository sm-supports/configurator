"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { PlateTemplate } from '@/types';
import ClientOnlyEditor from '@/components/Editor/ClientOnlyEditor';

export default function EditorPage() {
  const params = useParams();
  const templateId = params.templateId as string;
  const [template, setTemplate] = useState<PlateTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplate = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('plate_templates')
        .select(`
          *,
          country:countries(*)
        `)
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (fetchError) {
        console.error('Error fetching template:', fetchError);
        // Show sample template if Supabase is not configured
        setTemplate({
          id: templateId,
          name: 'Sample Template',
          image_url: '/templates/sample.png',
          width_px: 1200,
          height_px: 600,
          country_id: '1',
          country: { id: '1', name: 'United States', code: 'USA', flag_emoji: '🇺🇸', created_at: '', updated_at: '' },
          is_active: true,
          created_at: '',
          updated_at: ''
        });
        return;
      }

      if (data) {
        setTemplate(data);
      } else {
        setError('Template not found');
      }
    } catch (err) {
      console.error('Error fetching template:', err);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleSave = async (designData: unknown) => {
    // TODO: Implement save to Supabase
    console.log('Saving design:', designData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading editor...</div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">Error</div>
          <div className="text-gray-600">{error || 'Template not found'}</div>
        </div>
      </div>
    );
  }

  return <ClientOnlyEditor template={template} onSave={handleSave} />;
}
