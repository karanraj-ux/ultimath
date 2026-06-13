import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { Paperclip, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadButtonProps {
  onImageUploaded: (url: string) => void;
  disabled?: boolean;
}

export function ImageUploadButton({ onImageUploaded, disabled }: ImageUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setUploading(true);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(data.path);

      onImageUploaded(urlData.publicUrl);
      toast.success('Image uploaded successfully');
    } catch (err) {
      console.error('Failed to upload image:', err);
      toast.error('Failed to upload image');
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />
      
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="h-20 w-20 object-cover rounded-lg border"
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={clearPreview}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
