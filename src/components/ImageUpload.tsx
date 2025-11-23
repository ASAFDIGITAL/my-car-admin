import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  carId: string;
  onUploadComplete?: () => void;
}

interface UploadedImage {
  id: string;
  storage_path: string;
  file_name: string;
  is_primary: boolean;
}

export const ImageUpload = ({ carId, onUploadComplete }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { user } = useAuth();

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('car_images')
        .select('*')
        .eq('car_id', carId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  useEffect(() => {
    loadImages();
  }, [carId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!user) {
      toast.error('אנא התחבר כדי להעלות תמונות');
      return;
    }

    setUploading(true);

    try {
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} אינו קובץ תמונה`);
          continue;
        }

        // Validate file size (5MB)
        if (file.size > 5242880) {
          toast.error(`${file.name} גדול מדי (מקסימום 5MB)`);
          continue;
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('car-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('car-images')
          .getPublicUrl(filePath);

        // Save to database
        const { error: dbError } = await supabase
          .from('car_images')
          .insert({
            car_id: carId,
            storage_path: publicUrl,
            file_name: file.name,
            file_size: file.size,
            is_primary: images.length === 0, // First image is primary
            created_by: user.id,
          });

        if (dbError) throw dbError;
      }

      toast.success('התמונות הועלו בהצלחה');
      await loadImages();
      onUploadComplete?.();
    } catch (error: any) {
      console.error('Error uploading:', error);
      toast.error('שגיאה בהעלאת תמונות');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      const { error } = await supabase.rpc('set_primary_car_image', {
        image_uuid: imageId,
      });

      if (error) throw error;

      toast.success('התמונה הראשית עודכנה');
      await loadImages();
    } catch (error) {
      console.error('Error setting primary:', error);
      toast.error('שגיאה בעדכון תמונה ראשית');
    }
  };

  const handleDelete = async (imageId: string, storagePath: string) => {
    try {
      // Extract the path from the full URL
      const pathParts = storagePath.split('/car-images/');
      const filePath = pathParts[1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('car-images')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('car_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      toast.success('התמונה נמחקה');
      await loadImages();
      onUploadComplete?.();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('שגיאה במחיקת תמונה');
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          'border-2 border-dashed p-8 text-center transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-border',
          uploading && 'opacity-50 pointer-events-none'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          disabled={uploading}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium mb-1">
                גרור תמונות לכאן או לחץ לבחירה
              </p>
              <p className="text-sm text-muted-foreground">
                JPG, PNG, WEBP עד 5MB
              </p>
            </div>
            {uploading && (
              <p className="text-sm text-primary font-medium">מעלה...</p>
            )}
          </div>
        </label>
      </Card>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <Card key={image.id} className="relative group overflow-hidden">
              <div className="aspect-square">
                <img
                  src={image.storage_path}
                  alt={image.file_name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {image.is_primary && (
                <div className="absolute top-2 left-2 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  ראשית
                </div>
              )}

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.is_primary && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetPrimary(image.id)}
                    className="gap-1"
                  >
                    <Star className="w-3 h-3" />
                    קבע ראשית
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(image.id, image.storage_path)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && !uploading && (
        <Card className="p-8 text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">עדיין לא הועלו תמונות</p>
        </Card>
      )}
    </div>
  );
};
