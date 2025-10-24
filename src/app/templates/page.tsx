import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { PlateTemplate, Country } from '@/types';
import { Filter, Globe } from 'lucide-react';

export const runtime = 'edge';

// Server-rendered page: fetch data in parallel, minimal client JS
export const revalidate = 60;


// Allow explicit any here because Next's PageProps type is generated and a local
// named type caused a mismatch with Next's expected PageProps.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function TemplatesPage(props: any) {
  const searchParams = await props?.searchParams ?? {};
  const selectedCountry = typeof searchParams.country === 'string' ? searchParams.country : 'all';

  const [countriesResp, templatesResp] = await Promise.all([
    supabase.from('countries').select('id,name,code,flag_emoji').order('name'),
    supabase
      .from('plate_templates')
      .select('id,name,image_url,width_px,height_px,country_id,is_active,country:countries(id,name,flag_emoji,code)')
      .eq('is_active', true)
      .order('name'),
  ]);

  let countries: Country[] = [];
  let templates: PlateTemplate[] = [];

  if (countriesResp.error || !countriesResp.data) {
    countries = [
      { id: '1', name: 'United States', code: 'USA', flag_emoji: '🇺🇸', created_at: '', updated_at: '' },
      { id: '2', name: 'Canada', code: 'CAN', flag_emoji: '🇨🇦', created_at: '', updated_at: '' },
    ];
  } else {
    countries = countriesResp.data as Country[];
  }

  if (templatesResp.error || !templatesResp.data) {
    templates = [
      {
        id: '1',
        name: 'US Standard',
        image_url: 'https://via.placeholder.com/1200x600/2563eb/ffffff?text=US+Standard',
        width_px: 1200,
        height_px: 600,
        country_id: '1',
        country: { id: '1', name: 'United States', code: 'USA', flag_emoji: '🇺🇸', created_at: '', updated_at: '' },
        is_active: true,
        created_at: '',
        updated_at: '',
      },
    ];
  } else {
    // Define a typed shape for the raw row we get back from Supabase to avoid `any`
    type RawTemplate = {
      id: number | string;
      name?: string | null;
      image_url?: string | null;
      width_px?: number | null;
      height_px?: number | null;
      country_id?: number | string | null;
      country?: Country | Country[] | null;
      is_active?: boolean | null;
      created_at?: string | null;
      updated_at?: string | null;
    };

    templates = ((templatesResp.data as unknown) as RawTemplate[]).map((t) => ({
      id: String(t.id),
      name: t.name ?? '',
      image_url: t.image_url ?? '',
      width_px: t.width_px ?? 0,
      height_px: t.height_px ?? 0,
      country_id: t.country_id ? String(t.country_id) : (t.country && !Array.isArray(t.country) ? String(t.country.id) : (Array.isArray(t.country) && t.country[0] ? String(t.country[0].id) : '')),
      country: Array.isArray(t.country) ? t.country[0] ?? null : (t.country ?? null),
      is_active: !!t.is_active,
      created_at: t.created_at ?? '',
      updated_at: t.updated_at ?? '',
    })) as PlateTemplate[];
  }

  const filteredTemplates = selectedCountry === 'all' ? templates : templates.filter((t) => t.country_id === selectedCountry);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard" className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              <Filter className="w-4 h-4" />
              <span>My Designs</span>
            </Link>
            <Link href="/admin" className="inline-flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
              <Globe className="w-4 h-4" />
              <span>Admin Panel</span>
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">License Plate Templates</h1>
          <p className="text-gray-600">Choose a template to start designing your custom license plate</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Filter by Country</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/templates" className={`px-4 py-2 rounded-full border transition-colors ${selectedCountry === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>
              All Countries
            </Link>
            {countries.map((country) => (
              <Link key={country.id} href={`/templates?country=${country.id}`} className={`px-4 py-2 rounded-full border transition-colors flex items-center gap-2 ${selectedCountry === country.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>
                <span>{country.flag_emoji}</span>
                <span>{country.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-[2/1] bg-gray-100 flex items-center justify-center">
                {template.image_url ? (
                  <Image src={template.image_url} alt={template.name} width={600} height={300} className="object-cover w-full h-full" />
                ) : (
                  <Globe className="w-16 h-16 text-gray-400" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-semibold text-gray-900">{template.name}</span>
                  {template.country && (
                    <span className="text-2xl">{template.country.flag_emoji}</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-3">{template.width_px} × {template.height_px} px</div>
                <Link href={`/editor/${template.id}`} className="w-full block bg-blue-600 text-white py-2 px-4 rounded-md text-center hover:bg-blue-700 transition-colors">
                  Start Designing
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No templates found for the selected country.</p>
          </div>
        )}
      </div>
    </div>
  );
}
