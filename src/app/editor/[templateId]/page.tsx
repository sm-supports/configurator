"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { PlateTemplate, UserDesign } from '@/types';
import { getDesign } from '@/lib/designUtils';
import ClientOnlyEditor from '@/components/Editor/ClientOnlyEditor';
import EditorNavigation from '@/components/Navigation/EditorNavigation';

export default function EditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const templateId = params.templateId as string;
  const designId = searchParams.get('design');
  
  const [template, setTemplate] = useState<PlateTemplate | null>(null);
  const [existingDesign, setExistingDesign] = useState<UserDesign | null>(null);
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
        // Error fetching template - show sample template if Supabase is not configured
        // Show sample template if Supabase is not configured
        setTemplate({
          id: templateId,
          name: 'Sample Template',
          image_url: 'https://via.placeholder.com/1200x600/2563eb/ffffff?text=Sample+Template',
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
    } catch {
      // Error fetching template
      setError('Failed to load template');
    }
  }, [templateId]);

  const fetchExistingDesign = useCallback(async () => {
    if (!designId) return;
    
    try {
      const result = await getDesign(designId);
      if (result.error) {
        setError(`Failed to load design: ${result.error}`);
      } else if (result.design) {
        setExistingDesign(result.design);
        // Verify the design matches the template
        if (result.design.template_id !== templateId) {
          setError('Design does not match the selected template');
        }
      }
    } catch {
      setError('Failed to load existing design');
    }
  }, [designId, templateId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    await fetchTemplate();
    if (designId) {
      await fetchExistingDesign();
    }
    
    setLoading(false);
  }, [fetchTemplate, fetchExistingDesign, designId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    // TODO: Implement save to Supabase
    // Design data would be saved here
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    console.log('Download triggered');
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share triggered');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">Loading editor...</div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">Error</div>
          <div className="text-gray-600">{error || 'Template not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      <EditorNavigation 
        templateName={template.name}
        onSave={handleSave}
        onDownload={handleDownload}
        onShare={handleShare}
      />
      <div className="h-[calc(100vh-64px)]">
        <ClientOnlyEditor template={template} existingDesign={existingDesign} onSave={handleSave} />
      </div>
    </div>
  );
}
