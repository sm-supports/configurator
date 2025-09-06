"use client";

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import MainNavigation from './MainNavigation';
import Breadcrumb from './Breadcrumb';
import Footer from './Footer';
import QuickAccessMenu from './QuickAccessMenu';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageWrapperProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
}

export default function PageWrapper({ 
  children, 
  breadcrumbs, 
  showBreadcrumbs = true 
}: PageWrapperProps) {
  const pathname = usePathname();
  const isEditorRoute = pathname?.startsWith('/editor');

  // For editor routes, don't show the main navigation, footer, or quick access menu
  if (isEditorRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MainNavigation />
      {/* Add padding-top to account for fixed navbar */}
      <div className="pt-16">
        {showBreadcrumbs && <Breadcrumb items={breadcrumbs} />}
        <main className="flex-1">
          {children}
        </main>
      </div>
      <Footer />
      <QuickAccessMenu />
    </div>
  );
}
