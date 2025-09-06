"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  Palette, 
  LayoutDashboard, 
  Settings,
  Home,
  X,
  Sparkles
} from 'lucide-react';

export default function QuickAccessMenu() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const quickActions = [
    { 
      href: '/', 
      label: 'Home', 
      icon: Home, 
      gradient: 'from-blue-500 to-blue-600',
      show: true 
    },
    { 
      href: '/templates', 
      label: 'Templates', 
      icon: Palette, 
      gradient: 'from-green-500 to-emerald-600',
      show: true 
    },
    { 
      href: '/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      gradient: 'from-purple-500 to-violet-600',
      show: !!user 
    },
    { 
      href: '/admin', 
      label: 'Admin', 
      icon: Settings, 
      gradient: 'from-orange-500 to-amber-600',
      show: !!user 
    },
  ];

  const visibleActions = quickActions.filter(action => action.show);

  return (
    <div className="fixed bottom-6 right-6 z-50 lg:hidden">
      {/* Quick Action Buttons */}
      {isOpen && (
        <div className="flex flex-col space-y-3 mb-4">
          {visibleActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <div key={action.href} className="relative group">
                <Link
                  href={action.href}
                  onClick={() => setIsOpen(false)}
                  className={`bg-gradient-to-r ${action.gradient} text-white w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transform transition-all duration-300 hover:scale-110 hover:shadow-xl backdrop-blur-sm`}
                  style={{
                    animationDelay: `${index * 80}ms`,
                    animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <Icon className="w-6 h-6" />
                </Link>
                
                {/* Tooltip */}
                <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  {action.label}
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Toggle Button with enhanced design */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative bg-gradient-to-r from-blue-600 to-purple-600 text-white w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center transform transition-all duration-300 hover:shadow-xl ${
          isOpen ? 'rotate-45 from-red-500 to-pink-600 scale-105' : 'hover:scale-110'
        }`}
      >
        {isOpen ? (
          <X className="w-8 h-8" />
        ) : (
          <>
            <Plus className="w-8 h-8" />
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-400" />
          </>
        )}
        
        {/* Pulse animation when closed */}
        {!isOpen && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl animate-ping opacity-75"></div>
        )}
      </button>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.8) rotate(-10deg);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}
