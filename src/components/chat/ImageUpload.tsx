import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Image, X, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
  onImageRemove: () => void;
  currentImage?: string;
  disabled?: boolean;
}

export function ImageUpload({ onImageSelect, onImageRemove, currentImage, disabled }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
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
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);

      // Convert to base64 for now (in production, upload to Supabase Storage)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onImageSelect(base64String);
        toast.success('Image uploaded');
      };
      reader.onerror = () => {
        toast.error('Failed to read image');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onImageRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {currentImage ? (
        <div className="relative inline-block">
          <img
            src={currentImage}
            alt="Upload preview"
            className="h-20 w-20 object-cover rounded-lg border"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploading}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Image className="h-4 w-4 mr-2" />
                Upload Image
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
