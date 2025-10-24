import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-6">
      <div className="max-w-4xl mx-auto text-center">
        {/* Logo/Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
          We're Building Something
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Amazing
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
          Our website is currently under construction. In the meantime, check out our license plate design app!
        </p>

        {/* CTA Button */}
        <Link
          href="/editor/1"
          className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300"
        >
          <Sparkles className="w-5 h-5" />
          Try PlateCreate App
        </Link>

        {/* Coming Soon Badge */}
        <div className="mt-16">
          <p className="text-sm text-gray-400 uppercase tracking-wider mb-4">Coming Soon</p>
          <div className="flex flex-wrap justify-center gap-4 text-gray-500">
            <span className="px-4 py-2 bg-white/5 rounded-full text-sm backdrop-blur-sm">
              🎨 Advanced Editor
            </span>
            <span className="px-4 py-2 bg-white/5 rounded-full text-sm backdrop-blur-sm">
              🌍 Global Templates
            </span>
            <span className="px-4 py-2 bg-white/5 rounded-full text-sm backdrop-blur-sm">
              💾 Save & Share
            </span>
            <span className="px-4 py-2 bg-white/5 rounded-full text-sm backdrop-blur-sm">
              📱 Mobile App
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
