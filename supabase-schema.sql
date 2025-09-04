-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create countries table
CREATE TABLE countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(3) NOT NULL UNIQUE,
  flag_emoji VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plate_templates table
CREATE TABLE plate_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  image_url TEXT NOT NULL,
  width_px INTEGER NOT NULL,
  height_px INTEGER NOT NULL,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_designs table
CREATE TABLE user_designs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES plate_templates(id) ON DELETE CASCADE,
  design_json JSONB NOT NULL,
  name VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add admin flag to auth.users (if using Supabase Auth)
-- Note: This requires enabling the auth.users table for RLS
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Enable RLS on all tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE plate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_designs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for countries (public read, admin write)
CREATE POLICY "Countries are viewable by everyone" ON countries
  FOR SELECT USING (true);

CREATE POLICY "Countries are insertable by admins" ON countries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.is_admin = true
    )
  );

CREATE POLICY "Countries are updatable by admins" ON countries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.is_admin = true
    )
  );

-- RLS Policies for plate_templates (public read, admin write)
CREATE POLICY "Plate templates are viewable by everyone" ON plate_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Plate templates are insertable by admins" ON plate_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.is_admin = true
    )
  );

CREATE POLICY "Plate templates are updatable by admins" ON plate_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.is_admin = true
    )
  );

-- RLS Policies for user_designs (users can only see their own)
CREATE POLICY "Users can view own designs" ON user_designs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own designs" ON user_designs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own designs" ON user_designs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own designs" ON user_designs
  FOR DELETE USING (auth.uid() = user_id);

-- Insert some sample countries
INSERT INTO countries (name, code, flag_emoji) VALUES
  ('United States', 'USA', '🇺🇸'),
  ('Canada', 'CAN', '🇨🇦'),
  ('United Kingdom', 'GBR', '🇬🇧'),
  ('Germany', 'DEU', '🇩🇪'),
  ('France', 'FRA', '🇫🇷'),
  ('Australia', 'AUS', '🇦🇺');

-- Insert sample plate templates
INSERT INTO plate_templates (name, image_url, width_px, height_px, country_id) VALUES
  ('US Standard', '/templates/us-standard.png', 1200, 600, (SELECT id FROM countries WHERE code = 'USA')),
  ('US Motorcycle', '/templates/us-motorcycle.png', 600, 300, (SELECT id FROM countries WHERE code = 'USA')),
  ('Canadian Standard', '/templates/canada-standard.png', 1200, 600, (SELECT id FROM countries WHERE code = 'CAN')),
  ('UK Standard', '/templates/uk-standard.png', 1200, 600, (SELECT id FROM countries WHERE code = 'GBR'));

-- Create indexes for better performance
CREATE INDEX idx_plate_templates_country ON plate_templates(country_id);
CREATE INDEX idx_plate_templates_active ON plate_templates(is_active);
CREATE INDEX idx_user_designs_user ON user_designs(user_id);
CREATE INDEX idx_user_designs_template ON user_designs(template_id);
