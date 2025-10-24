"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { PlateTemplate, Country } from '@/types';
import { checkAdminStatus } from '@/lib/adminUtils';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { ArrowLeft, Save, Upload, X, Trash2 } from 'lucide-react';

export const runtime = 'edge';

interface TemplateFormData {
  name: string;
  country_id: string;
  width_px: number;
  height_px: number;
  image_url: string;
  is_active: boolean;
}

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [countries, setCountries] = useState<Country[]>([]);
  const [template, setTemplate] = useState<PlateTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    country_id: '',
    width_px: 1200,
    height_px: 600,
    image_url: '',
    is_active: true
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const checkAdminAccess = useCallback(async () => {
    const adminStatus = await checkAdminStatus();
    if (!adminStatus) {
      router.push('/');
    }
  }, [router]);

  const fetchCountries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching countries:', error);
        setCountries([
          { id: '1', name: 'United States', code: 'USA', flag_emoji: '🇺🇸', created_at: '', updated_at: '' },
          { id: '2', name: 'Canada', code: 'CAN', flag_emoji: '🇨🇦', created_at: '', updated_at: '' },
        ]);
      } else {
        setCountries(data || []);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  }, []);

  const fetchTemplate = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plate_templates')
        .select(`
          *,
          country:countries(*)
        `)
        .eq('id', templateId)
        .single();

      if (error) {
        console.error('Error fetching template:', error);
        router.push('/admin');
        return;
      }

      if (data) {
        setTemplate(data);
        setFormData({
          name: data.name,
          country_id: data.country_id,
          width_px: data.width_px,
          height_px: data.height_px,
          image_url: data.image_url || '',
          is_active: data.is_active
        });
        setImagePreview(data.image_url || '');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  }, [templateId, router]);

  useEffect(() => {
    checkAdminAccess();
    fetchCountries();
    fetchTemplate();
  }, [checkAdminAccess, fetchCountries, fetchTemplate]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return formData.image_url;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, imageFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const templateData = {
        name: formData.name,
        country_id: formData.country_id,
        width_px: formData.width_px,
        height_px: formData.height_px,
        image_url: imageUrl,
        is_active: formData.is_active
      };

      const { error } = await supabase
        .from('plate_templates')
        .update(templateData)
        .eq('id', templateId);

      if (error) throw error;

      router.push('/admin');
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Error updating template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async () => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('plate_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      router.push('/admin');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">Template not found</p>
          <button
            onClick={() => router.push('/admin')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Template</h1>
            <p className="text-gray-600">
              Update the license plate template details
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., US Standard License Plate"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <select
                    required
                    value={formData.country_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, country_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.flag_emoji} {country.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width (pixels) *
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    max="2000"
                    value={formData.width_px}
                    onChange={(e) => setFormData(prev => ({ ...prev, width_px: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (pixels) *
                  </label>
                  <input
                    type="number"
                    required
                    min="50"
                    max="1000"
                    value={formData.height_px}
                    onChange={(e) => setFormData(prev => ({ ...prev, height_px: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Template Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Image
                </label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Choose New Image
                    </label>
                    {imageFile && (
                      <span className="text-sm text-gray-600">{imageFile.name}</span>
                    )}
                  </div>

                  {imagePreview && (
                    <div className="relative inline-block">
                      <div className="relative w-80 h-32 border border-gray-200 rounded-md overflow-hidden">
                        <Image
                          src={imagePreview}
                          alt="Template preview"
                          fill
                          sizes="320px"
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(formData.image_url);
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active (visible to users)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={deleteTemplate}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Template
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/admin')}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Update Template
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
