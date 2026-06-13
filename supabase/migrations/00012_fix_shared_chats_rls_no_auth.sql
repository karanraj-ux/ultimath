-- Fix shared_chats RLS to work without authentication
DROP POLICY IF EXISTS "Authenticated users can create shared chats" ON shared_chats;

-- Create new policy that works without authentication
CREATE POLICY "Anyone can create shared chats" ON shared_chats FOR INSERT WITH CHECK (true);