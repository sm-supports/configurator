# Navigation System Documentation

This document describes the comprehensive navigation system implemented for the License Plate Designer application.

## Overview

The navigation system provides seamless connectivity between all parts of the application, ensuring users can easily move between pages and access all features.

## Components

### 1. MainNavigation
**Location:** `src/components/Navigation/MainNavigation.tsx`

The primary navigation component that appears on all pages except the editor. Features:
- **Responsive Design**: Adapts to desktop and mobile screens
- **Authentication-aware**: Shows different options for authenticated vs. guest users
- **Role-based Navigation**: Admin links visible to admin users
- **User Menu**: Dropdown menu with user actions (Dashboard, Sign Out)

**Navigation Items:**
- **Public Users**: Home, Templates, Sign In, Sign Up
- **Authenticated Users**: Home, Templates, Dashboard, Admin Panel (if admin)

### 2. EditorNavigation
**Location:** `src/components/Navigation/EditorNavigation.tsx`

Specialized navigation for the editor pages with:
- **Back Button**: Returns to previous page or templates
- **Template Name**: Shows currently editing template
- **Editor Actions**: Save, Download, Share buttons
- **User Menu**: Quick access to dashboard and sign out

### 3. Breadcrumb
**Location:** `src/components/Navigation/Breadcrumb.tsx`

Auto-generated breadcrumb navigation:
- **Smart Generation**: Automatically creates breadcrumbs from URL paths
- **Readable Labels**: Converts path segments to user-friendly labels
- **Clickable Navigation**: All breadcrumb items (except current) are clickable
- **Home Integration**: Always starts with Home icon

### 4. Footer
**Location:** `src/components/Navigation/Footer.tsx`

Site-wide footer with:
- **Quick Links**: Essential navigation links
- **Authentication Links**: Sign In/Up for guests, Dashboard for users
- **Support Links**: API status and help resources
- **Brand Information**: Company details and copyright

### 5. QuickAccessMenu
**Location:** `src/components/Navigation/QuickAccessMenu.tsx`

Mobile-first floating action button menu:
- **Mobile Only**: Appears only on mobile devices
- **Quick Actions**: Home, Templates, Dashboard, Admin
- **Animated**: Smooth animations for open/close states
- **Context-aware**: Shows different actions based on user authentication

### 6. PageWrapper
**Location:** `src/components/Navigation/PageWrapper.tsx`

Main layout wrapper that includes:
- MainNavigation
- Breadcrumb (optional)
- Page content
- Footer
- QuickAccessMenu

## Page-Specific Navigation

### Home Page (`/`)
- Clean landing page with navigation in header
- Quick access cards to main features
- Call-to-action buttons for key workflows

### Templates Page (`/templates`)
- Filter by country functionality
- Quick navigation to Dashboard and Admin
- Direct links to start designing

### Dashboard Page (`/dashboard`)
- Quick action buttons (Create New Design, Admin Panel)
- Design management interface
- Filter options for design organization

### Admin Pages (`/admin/*`)
- Admin dashboard with quick action cards
- Back navigation to main areas
- Template management tools

### Editor Pages (`/editor/[templateId]`)
- Specialized editor navigation
- Template name display
- Editor-specific actions (Save, Download, Share)
- Back navigation

### Auth Pages (`/login`, `/register`)
- Back to Home navigation
- Cross-links between login and register
- Clean, focused interface

## Navigation Flow

### Primary User Journeys

1. **New User Journey**:
   Home → Sign Up → Templates → Editor → Dashboard

2. **Returning User Journey**:
   Home → Sign In → Dashboard → Editor

3. **Admin Journey**:
   Home → Sign In → Admin → Template Management

4. **Guest Journey**:
   Home → Templates → Sign Up → Continue Design

### Navigation Patterns

- **Breadcrumbs**: Show current location and path back to home
- **Back Buttons**: Context-aware back navigation
- **Quick Actions**: Fast access to primary actions
- **Cross-linking**: Related page suggestions and shortcuts

## Features

### Responsive Design
- **Desktop**: Full navigation with all options visible
- **Mobile**: Collapsible menu + floating action button
- **Tablet**: Optimized layout for medium screens

### Authentication Integration
- **Guest Users**: Focus on sign-up and templates
- **Authenticated Users**: Full access to all features
- **Admin Users**: Additional admin navigation options

### Visual Hierarchy
- **Primary Navigation**: Main menu bar
- **Secondary Navigation**: Breadcrumbs and page-specific buttons
- **Tertiary Navigation**: Footer links and quick access

### Accessibility
- **Keyboard Navigation**: All interactive elements accessible
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators
- **Color Contrast**: High contrast for all text and interactive elements

## Implementation Details

### State Management
- Uses React Context (`AuthContext`) for user state
- Real-time navigation updates based on authentication status
- Persistent navigation state across page transitions

### Routing
- Next.js App Router integration
- Dynamic route support for templates and admin pages
- Proper redirects for protected routes

### Styling
- Tailwind CSS for consistent styling
- Hover and focus states for all interactive elements
- Smooth transitions and animations
- Mobile-first responsive design

## Usage Examples

### Adding Navigation to a New Page

```tsx
// Automatic navigation (recommended)
// Navigation is automatically included via PageWrapper in layout.tsx

// Custom breadcrumbs
const breadcrumbs = [
  { label: 'Home', href: '/' },
  { label: 'Admin', href: '/admin' },
  { label: 'New Template' } // Current page (no href)
];

// Use in PageWrapper
<PageWrapper breadcrumbs={breadcrumbs}>
  {/* Page content */}
</PageWrapper>
```

### Adding Quick Actions

```tsx
// In page component
<div className="mb-6">
  <div className="flex flex-wrap gap-4">
    <Link href="/target" className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
      <Icon className="w-4 h-4" />
      <span>Action Name</span>
    </Link>
  </div>
</div>
```

## Best Practices

1. **Consistent Styling**: Use established Tailwind classes and patterns
2. **Accessibility**: Always include proper ARIA labels and semantic HTML
3. **Mobile-First**: Design for mobile devices first, then enhance for desktop
4. **Performance**: Use Next.js Link component for client-side navigation
5. **User Context**: Show relevant navigation options based on user state
6. **Clear Hierarchy**: Maintain visual hierarchy with primary, secondary, and tertiary navigation
7. **Feedback**: Provide clear feedback for navigation actions (hover states, active states)

## Future Enhancements

- **Search Functionality**: Global search in navigation
- **Favorites**: Quick access to frequently used templates
- **Recent Items**: Recently viewed designs in navigation
- **Notifications**: In-navigation notification system
- **Help Integration**: Contextual help and onboarding tours
