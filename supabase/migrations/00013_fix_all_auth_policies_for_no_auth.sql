-- Fix groups table policies
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Creators can update their groups" ON groups;
DROP POLICY IF EXISTS "Creators can delete their groups" ON groups;

CREATE POLICY "Anyone can create groups" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update groups" ON groups FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete groups" ON groups FOR DELETE USING (true);

-- Fix conversations table policies if any exist
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;

-- Create open policies for conversations
CREATE POLICY "Anyone can view conversations" ON conversations FOR SELECT USING (true);
CREATE POLICY "Anyone can create conversations" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update conversations" ON conversations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete conversations" ON conversations FOR DELETE USING (true);

-- Fix solo_messages table policies
DROP POLICY IF EXISTS "Users can view their own messages" ON solo_messages;
DROP POLICY IF EXISTS "Users can create messages" ON solo_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON solo_messages;

CREATE POLICY "Anyone can view messages" ON solo_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can create messages" ON solo_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete messages" ON solo_messages FOR DELETE USING (true);