-- Make user_id nullable since we're not using authentication
ALTER TABLE api_keys ALTER COLUMN user_id DROP NOT NULL;

-- Set default value for user_id to a system UUID
ALTER TABLE api_keys ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

-- Update RLS policies to work without authentication
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;

-- Create new policies that work without authentication
CREATE POLICY "Anyone can view API keys" ON api_keys FOR SELECT USING (true);
CREATE POLICY "Anyone can insert API keys" ON api_keys FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update API keys" ON api_keys FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete API keys" ON api_keys FOR DELETE USING (true);