-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Anyone can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "Anyone can view chat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

CREATE POLICY "Users can delete their own chat images"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-images');