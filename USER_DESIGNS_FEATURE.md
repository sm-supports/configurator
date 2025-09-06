# User Design Saving Feature

This feature allows users to save their created license plate designs to their profile and manage them through a dedicated dashboard.

## Features Added

### 1. Design Saving
- **Save Button**: Added a purple "Save" button in the editor toolbar
- **Authentication Check**: Users must be logged in to save designs
- **Visual Feedback**: Button shows loading state and success/error messages
- **Auto-naming**: Designs are automatically named with template name and timestamp

### 2. Profile/Dashboard Page
- **My Designs Page**: Located at `/profile`
- **Design Management**: View, edit, and delete saved designs
- **Design Cards**: Each design shows name, template, creation date, and element count
- **Public/Private Toggle**: Designs can be marked as public or private
- **Direct Edit Links**: Click "Edit" to open design in editor

### 3. Load Existing Designs
- **URL Parameters**: Load existing designs via `?design=<design_id>` in editor URL
- **Seamless Editing**: Existing designs load with all elements and properties preserved
- **Template Validation**: Ensures design matches the selected template

### 4. Navigation Integration
- **My Designs Link**: Added to main navigation for authenticated users
- **Easy Access**: Quick access to saved designs from anywhere in the app

## API Endpoints

### POST /api/designs
Save a new design
```json
{
  "design_json": { "elements": [...], "template_id": "...", "width": 1200, "height": 600 },
  "template_id": "uuid",
  "name": "Design Name",
  "is_public": false
}
```

### GET /api/designs
Get all designs for the current user
- Query param `user_id`: Get public designs for a specific user

### GET /api/designs/[id]
Get a specific design by ID

### PUT /api/designs/[id]
Update an existing design
```json
{
  "design_json": { ... },
  "name": "Updated Name",
  "is_public": true
}
```

### DELETE /api/designs/[id]
Delete a design

## Database Schema

The feature requires a new `user_designs` table:

```sql
CREATE TABLE user_designs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES plate_templates(id) ON DELETE CASCADE,
  design_json JSONB NOT NULL,
  name VARCHAR(255),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Row Level Security (RLS) policies ensure users can only access their own designs and public designs from others.

## Usage

### Saving a Design
1. Create a design in the editor
2. Click the purple "Save" button in the toolbar
3. Design is automatically saved with template name
4. Success message appears briefly

### Viewing Saved Designs
1. Navigate to "My Designs" in the main menu
2. See all your saved designs in a grid layout
3. Each card shows design details and actions

### Editing a Saved Design
1. From the "My Designs" page, click "Edit" on any design
2. Design loads in the editor with all elements preserved
3. Make changes and save again to update

### Managing Designs
- **Delete**: Click the trash icon to delete a design (with confirmation)
- **Public/Private**: Designs marked as public can be viewed by others
- **Direct Links**: Share editor links with `?design=<id>` to load specific designs

## Files Added/Modified

### New Files
- `/src/app/api/designs/route.ts` - Main designs API
- `/src/app/api/designs/[id]/route.ts` - Individual design API
- `/src/lib/designUtils.ts` - Design utility functions
- `/src/app/profile/page.tsx` - User profile/dashboard page
- `/database_schema.sql` - Database schema

### Modified Files
- `/src/components/Editor/Editor.tsx` - Added save functionality and button
- `/src/components/Editor/ClientOnlyEditor.tsx` - Support for existing designs
- `/src/app/editor/[templateId]/page.tsx` - Load existing designs from URL
- `/src/components/Navigation/MainNavigation.tsx` - Added "My Designs" link
- `/src/types/index.ts` - Already had UserDesign type defined

## Setup Instructions

### 1. Database Setup
Run the SQL commands in `database_schema.sql` in your Supabase dashboard to create the required tables and policies.

### 2. Environment Variables
Ensure your Supabase environment variables are configured:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Authentication
The feature requires users to be authenticated. Ensure your authentication flow is working.

### 4. Testing
1. Sign up/login as a user
2. Go to Templates and select a template
3. Create a design in the editor
4. Click "Save" - should see success message
5. Navigate to "My Designs" to see saved design
6. Click "Edit" to reload the design in editor

## Security

- All API endpoints require authentication via Supabase auth tokens
- Row Level Security ensures users can only access their own designs
- Public designs can be viewed by anyone but only modified by owners
- Input validation on all design data
- CSRF protection via Next.js built-in features

## Future Enhancements

- Design thumbnails/previews
- Design sharing via public links
- Design categories/tags
- Design templates marketplace
- Export designs as images
- Collaborative editing
- Design version history
