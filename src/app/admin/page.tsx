"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlateTemplate, Country } from '@/types';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

export default function AdminPage() {
  const [templates, setTemplates] = useState<PlateTemplate[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  // TODO: Implement add/edit forms
  // const [showAddForm, setShowAddForm] = useState(false);
  // const [editingTemplate, setEditingTemplate] = useState<PlateTemplate | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch countries
      const { data: countriesData } = await supabase
        .from('countries')
        .select('*')
        .order('name');

      if (countriesData) {
        setCountries(countriesData);
      }

      // Fetch all templates (including inactive)
      const { data: templatesData } = await supabase
        .from('plate_templates')
        .select(`
          *,
          country:countries(*)
        `)
        .order('name');

      if (templatesData) {
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleTemplateStatus = async (templateId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('plate_templates')
        .update({ is_active: !currentStatus })
        .eq('id', templateId);

      if (!error) {
        setTemplates(prev => 
          prev.map(t => 
            t.id === templateId ? { ...t, is_active: !currentStatus } : t
          )
        );
      }
    } catch (error) {
      console.error('Error updating template status:', error);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('plate_templates')
        .delete()
        .eq('id', templateId);

      if (!error) {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage license plate templates and system settings
          </p>
        </div>

        {/* Templates Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              License Plate Templates
            </h2>
            <button
              onClick={() => alert('Add template form coming soon!')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Template
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Country</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Dimensions</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{template.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.country?.flag_emoji}</span>
                        <span>{template.country?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {template.width_px} × {template.height_px} px
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                          className="p-1 hover:bg-gray-200 rounded"
                          title={template.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {template.is_active ? (
                            <EyeOff className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                        <button
                          onClick={() => alert('Edit template form coming soon!')}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="p-1 hover:bg-red-100 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Countries Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Countries ({countries.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {countries.map((country) => (
              <div
                key={country.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
              >
                <span className="text-2xl">{country.flag_emoji}</span>
                <div>
                  <div className="font-medium text-gray-900">{country.name}</div>
                  <div className="text-sm text-gray-500">{country.code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
