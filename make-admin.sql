-- Script to make a user an admin
-- Replace 'user-email@example.com' with the actual email of the user you want to make admin

-- Option 1: Make user admin by email (if you know their email)
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users 
WHERE email = 'user-email@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- Option 2: Make the most recent user an admin (if you just registered)
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- Option 3: Make all existing users admins (for testing)
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users 
ON CONFLICT (user_id) DO NOTHING;
