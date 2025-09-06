"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const pathname = usePathname();

  // Don't show breadcrumbs on home page or editor pages
  if (pathname === '/' || pathname.startsWith('/editor/')) {
    return null;
  }

  // Generate breadcrumbs from pathname if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/' }
    ];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Create readable labels
      let label = segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Handle special cases
      switch (segment) {
        case 'admin':
          label = 'Admin Panel';
          break;
        case 'templates':
          if (segments[index - 1] === 'admin') {
            label = 'Manage Templates';
          } else {
            label = 'Templates';
          }
          break;
        case 'dashboard':
          label = 'Dashboard';
          break;
        case 'login':
          label = 'Sign In';
          break;
        case 'register':
          label = 'Sign Up';
          break;
        case 'new':
          label = 'Create New';
          break;
        default:
          // For dynamic routes like [id], show as ID
          if (segment.match(/^[a-f0-9-]{36}$/)) {
            label = 'Template';
          }
          break;
      }

      // Don't make the last item clickable
      breadcrumbs.push({
        label,
        href: index === segments.length - 1 ? undefined : currentPath
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();

  return (
    <nav className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 py-3 text-sm">
          {breadcrumbItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
                >
                  {index === 0 && <Home className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className="text-gray-500 flex items-center space-x-1">
                  {index === 0 && <Home className="w-4 h-4" />}
                  <span>{item.label}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
