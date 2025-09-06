"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Footer() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Don't show footer on editor pages or auth pages
  if (pathname.startsWith('/editor/') || pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return null;
  }

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold mb-4">License Plate Designer</h3>
            <p className="text-gray-400 mb-4">
              Create custom license plate designs with our powerful visual editor. 
              Choose from multiple country templates and export high-resolution designs.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-md font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/templates" className="text-gray-400 hover:text-white transition-colors">
                  Templates
                </Link>
              </li>
              {user && (
                <li>
                  <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
              )}
              {!user && (
                <>
                  <li>
                    <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="text-gray-400 hover:text-white transition-colors">
                      Sign Up
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-md font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/api/health" className="text-gray-400 hover:text-white transition-colors">
                  API Status
                </Link>
              </li>
              <li>
                <span className="text-gray-400">
                  Help Center
                </span>
              </li>
              <li>
                <span className="text-gray-400">
                  Contact Us
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 License Plate Designer. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
