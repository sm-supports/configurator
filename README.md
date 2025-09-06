# Configurator - License Plate Designer

A modern web application for designing custom license plates with an intuitive drag-and-drop editor. Built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Deployment Ready

This project is optimized for **Vercel deployment** with all production configurations in place. See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step deployment instructions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sm-supports/configurator)

## Features

### 🎨 Visual Editor
- **Canvas-based editor** using Konva.js for smooth interactions
- **Text elements** with customizable fonts, sizes, colors, and positioning
- **Image uploads** with drag & drop, resizing, and positioning
- **Layer management** with bring forward/send backward functionality
- **High-resolution export** for print-ready designs

### 🌍 Template Management
- **Country-based templates** with filtering and sorting
- **Multiple plate dimensions** (standard, motorcycle, etc.)
- **Admin controls** for adding/editing templates

### 👤 User Management
- **Authentication** via Supabase Auth (email/password)
- **User Dashboard** with saved design management
- **Design persistence** with automatic saving
- **Public/Private design sharing**

### 🔧 Admin Features
- **Template CRUD operations** for administrators
- **Country management** for expanding to new regions
- **User design monitoring** and analytics
- **Complete admin panel** with create/edit/delete functionality

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: TailwindCSS
- **Canvas**: Konva.js (React-Konva)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: React hooks + Zustand
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd configurator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   ```

4. **Set up Supabase Authentication**
   
   **Step 1: Create a Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Click "Start your project" and create a new project
   - Wait for the project to be fully set up
   
   **Step 2: Get your credentials**
   - Go to Project Settings → API
   - Copy the "Project URL" (starts with `https://`)
   - Copy the "anon public" key
   - Add these to your `.env.local` file
   
   **Step 3: Configure Authentication**
   - Go to Authentication → Settings in your Supabase dashboard
   - Under "Site URL", add your local development URL: `http://localhost:3000`
   - For production, add your deployed URL
   - Enable email confirmation if desired (recommended for production)

5. **Set up Supabase database** (optional for basic auth)
   - If you want to use the full template/design features, run the SQL commands from `supabase-schema.sql` in your Supabase SQL editor
   - For basic authentication testing, this step can be skipped initially

6. **Start the development server**
6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication Setup

### Quick Start (Development)
1. Create a free Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your Project URL and anon key from Settings → API
4. Add them to `.env.local`
5. That's it! Sign up/sign in will now work

### Common Issues
- **"Authentication is not configured"**: Make sure your `.env.local` file has the correct Supabase URL and anon key
- **Login redirects fail**: Check that your Site URL in Supabase matches your development URL
- **Email verification**: For production, configure email templates in Supabase Auth settings

### Testing Authentication
1. Start the dev server: `npm run dev`
2. Click "Sign Up" on the homepage
3. Create an account with any email/password
4. You should be redirected to the templates page
5. Access the dashboard and admin areas (protected routes)

## Database Schema

The application uses the following main tables:

- **`countries`**: Country information with flags and codes
- **`plate_templates`**: License plate templates with dimensions and country associations
- **`user_designs`**: User-created designs stored as JSON with metadata
- **`auth.users`**: Supabase Auth users with admin flags

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── admin/             # Admin dashboard and CRUD operations
│   │   ├── templates/     # Template management (new/edit)
│   │   │   ├── new/       # Create new template
│   │   │   └── [id]/      # Edit existing template
│   ├── dashboard/         # User dashboard for saved designs
│   ├── editor/            # Design editor
│   ├── templates/         # Template browsing
│   └── page.tsx           # Home page
├── components/             # Reusable React components
│   ├── Auth/              # Authentication components
│   ├── Editor/            # Editor-related components
│   └── Navigation/        # Navigation components
├── contexts/              # React contexts
├── lib/                   # Utility functions and configurations
├── types/                 # TypeScript type definitions
└── styles/                # Global styles
```

## Available Routes

- `/` - Home page with navigation
- `/login` - User authentication
- `/register` - User registration
- `/templates` - Browse license plate templates
- `/editor/[templateId]` - Design editor for specific template
- `/dashboard` - User dashboard with saved designs
- `/admin` - Admin dashboard (admin access required)
- `/admin/templates/new` - Create new template (admin only)
- `/admin/templates/[id]` - Edit existing template (admin only)

## Development

### Running the app
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Key Components

- **`Editor.tsx`**: Main canvas editor with Konva integration
- **`EditorToolbar.tsx`**: Left sidebar with design tools
- **`LayerPanel.tsx`**: Right sidebar for layer management
- **`TemplatesPage.tsx`**: Template browsing with country filtering

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- Build the app: `npm run build`
- Deploy the `out` directory to your hosting provider

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Roadmap

### Phase 1 (Completed ✅)
- ✅ Basic editor with text and images
- ✅ Template management
- ✅ User authentication
- ✅ Admin dashboard with full CRUD
- ✅ User dashboard with saved designs
- ✅ Supabase storage integration
- ✅ Responsive design improvements

### Phase 2 (In Progress)
- [ ] Advanced text formatting options
- [ ] Image filters and effects
- [ ] Design templates and presets
- [ ] Social sharing features

### Phase 3 (Planned)
- [ ] Payment integration
- [ ] Order management
- [ ] Mobile app
- [ ] Template marketplace

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@yourcompany.com or create an issue in this repository.
