import Link from 'next/link';
import { Palette, Settings, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            License Plate Designer
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Create custom license plate designs with our powerful visual editor. 
            Choose from multiple country templates, add text and images, and export 
            high-resolution designs ready for printing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Palette className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Design Plates</h3>
            <p className="text-gray-600 mb-4">
              Use our intuitive editor to create custom license plate designs with text, images, and layers.
            </p>
            <Link
              href="/templates"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Start Designing
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">User Dashboard</h3>
            <p className="text-gray-600 mb-4">
              Save your designs, manage projects, and access your design history.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
            >
              View Dashboard
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Panel</h3>
            <p className="text-gray-600 mb-4">
              Manage templates, countries, and system settings for administrators.
            </p>
            <Link
              href="/admin"
              className="inline-block bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors"
            >
              Admin Panel
            </Link>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-600 mb-6">
            Choose a template and begin designing your custom license plate today.
          </p>
          <Link
            href="/templates"
            className="inline-block bg-gray-900 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Browse Templates
          </Link>
        </div>
      </div>
    </div>
  );
}
