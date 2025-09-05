-- Supabase Database Schema for License Plate Configurator
-- Run this SQL in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(3) NOT NULL UNIQUE,
  flag_emoji VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- License plate templates table
CREATE TABLE IF NOT EXISTS plate_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image_url TEXT,
  width_px INTEGER NOT NULL,
  height_px INTEGER NOT NULL,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User designs table (saved designs)
CREATE TABLE IF NOT EXISTS user_designs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL, -- References auth.users(id)
  template_id UUID REFERENCES plate_templates(id) ON DELETE CASCADE,
  design_json JSONB NOT NULL,
  name VARCHAR(255),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE, -- References auth.users(id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plate_templates_country_id ON plate_templates(country_id);
CREATE INDEX IF NOT EXISTS idx_plate_templates_active ON plate_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_user_designs_user_id ON user_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_designs_template_id ON user_designs(template_id);
CREATE INDEX IF NOT EXISTS idx_user_designs_public ON user_designs(is_public);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE plate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Countries: Allow read access to all authenticated users
CREATE POLICY "Countries are viewable by everyone" ON countries
  FOR SELECT USING (true);

-- Countries: Only admins can modify
CREATE POLICY "Countries are modifiable by admins" ON countries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Plate templates: Allow read access to active templates for everyone
CREATE POLICY "Active templates are viewable by everyone" ON plate_templates
  FOR SELECT USING (is_active = true);

-- Plate templates: Allow read access to all templates for admins
CREATE POLICY "All templates are viewable by admins" ON plate_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Plate templates: Only admins can modify
CREATE POLICY "Templates are modifiable by admins" ON plate_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- User designs: Users can only see their own designs
CREATE POLICY "Users can view their own designs" ON user_designs
  FOR SELECT USING (auth.uid() = user_id);

-- User designs: Users can only modify their own designs
CREATE POLICY "Users can modify their own designs" ON user_designs
  FOR ALL USING (auth.uid() = user_id);

-- Public designs: Allow viewing public designs
CREATE POLICY "Public designs are viewable by everyone" ON user_designs
  FOR SELECT USING (is_public = true);

-- Admin users: Only admins can view admin list
CREATE POLICY "Admin users are viewable by admins" ON admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Functions for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plate_templates_updated_at BEFORE UPDATE ON plate_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_designs_updated_at BEFORE UPDATE ON user_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage Setup
-- Create storage buckets for template images and user uploads

-- Create templates bucket for template images
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true);

-- Create user-uploads bucket for user uploaded images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-uploads', 'user-uploads', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Storage Policies

-- Templates bucket: Allow public read access
CREATE POLICY "Templates are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'templates');

-- Templates bucket: Only admins can upload/modify
CREATE POLICY "Admins can upload templates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'templates' AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update templates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'templates' AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete templates" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'templates' AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- User uploads bucket: Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public access to user uploads (for shared designs)
CREATE POLICY "Public can view user uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-uploads');

-- Insert sample data
INSERT INTO countries (name, code, flag_emoji) VALUES
  ('United States', 'USA', '🇺🇸'),
  ('Canada', 'CAN', '🇨🇦'),
  ('United Kingdom', 'GBR', '🇬🇧'),
  ('Germany', 'DEU', '🇩🇪'),
  ('France', 'FRA', '🇫🇷'),
  ('Australia', 'AUS', '🇦🇺'),
  ('Japan', 'JPN', '🇯🇵')
ON CONFLICT (code) DO NOTHING;

-- Insert sample templates
INSERT INTO plate_templates (name, image_url, width_px, height_px, country_id, is_active) VALUES
  ('US Standard', '/templates/us-standard.png', 1200, 600,
   (SELECT id FROM countries WHERE code = 'USA'), true),
  ('US Motorcycle', '/templates/us-motorcycle.png', 800, 400,
   (SELECT id FROM countries WHERE code = 'USA'), true),
  ('Canadian Standard', '/templates/ca-standard.png', 1200, 600,
   (SELECT id FROM countries WHERE code = 'CAN'), true),
  ('UK Standard', '/templates/uk-standard.png', 1200, 600,
   (SELECT id FROM countries WHERE code = 'GBR'), true),
  ('German Standard', '/templates/de-standard.png', 1200, 600,
   (SELECT id FROM countries WHERE code = 'DEU'), true)
ON CONFLICT DO NOTHING;
