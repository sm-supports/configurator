"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { PlateTemplate, Country } from '@/types';
import { Filter, Globe } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<PlateTemplate[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch countries
      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('*')
        .order('name');

      if (countriesError) {
        // Error fetching countries - show sample data if Supabase is not configured
        // Show sample data if Supabase is not configured
        setCountries([
          { id: '1', name: 'United States', code: 'USA', flag_emoji: '🇺🇸', created_at: '', updated_at: '' },
          { id: '2', name: 'Canada', code: 'CAN', flag_emoji: '🇨🇦', created_at: '', updated_at: '' },
        ]);
      } else if (countriesData) {
        setCountries(countriesData);
      }

      // Fetch templates with country info
      const { data: templatesData, error: templatesError } = await supabase
        .from('plate_templates')
        .select(`
          *,
          country:countries(*)
        `)
        .eq('is_active', true)
        .order('name');

      if (templatesError) {
        // Error fetching templates - show sample data if Supabase is not configured
        // Show sample data if Supabase is not configured
        setTemplates([
          { 
            id: '1', 
            name: 'US Standard', 
            image_url: '/templates/us-standard.png', 
            width_px: 1200, 
            height_px: 600, 
            country_id: '1', 
            country: { id: '1', name: 'United States', code: 'USA', flag_emoji: '🇺🇸', created_at: '', updated_at: '' },
            is_active: true, 
            created_at: '', 
            updated_at: '' 
          },
        ]);
      } else if (templatesData) {
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set loading to false even on error
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  const filteredTemplates = selectedCountry === 'all' 
    ? templates 
    : templates.filter(t => t.country_id === selectedCountry);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Quick Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>My Designs</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>Admin Panel</span>
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            License Plate Templates
          </h1>
          <p className="text-gray-600">
            Choose a template to start designing your custom license plate
          </p>
        </div>

        {/* Country Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Filter by Country</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCountry('all')}
              className={`px-4 py-2 rounded-full border transition-colors ${
                selectedCountry === 'all'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              All Countries
            </button>
            {countries.map((country) => (
              <button
                key={country.id}
                onClick={() => setSelectedCountry(country.id)}
                className={`px-4 py-2 rounded-full border transition-colors flex items-center gap-2 ${
                  selectedCountry === country.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                <span>{country.flag_emoji}</span>
                <span>{country.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="aspect-[2/1] bg-gray-100 flex items-center justify-center">
                <Globe className="w-16 h-16 text-gray-400" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {template.name}
                  </span>
                  {template.country && (
                    <span className="text-2xl">{template.country.flag_emoji}</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {template.width_px} × {template.height_px} px
                </div>
                <button 
                  onClick={() => window.location.href = `/editor/${template.id}`}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Start Designing
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              No templates found for the selected country.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
