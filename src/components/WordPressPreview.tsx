import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface WordPressPreviewProps {
  carId: string;
}

interface CarData {
  title: string;
  status: string;
  companies?: { name: string };
  car_types?: { name: string };
  car_years?: { year: number };
  purchase_price?: number;
  custom_fields?: any;
}

export const WordPressPreview = ({ carId }: WordPressPreviewProps) => {
  const [car, setCar] = useState<CarData | null>(null);
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarData();
  }, [carId]);

  const fetchCarData = async () => {
    try {
      // Fetch car with relations
      const { data: carData, error: carError } = await supabase
        .from('cars')
        .select(`
          *,
          companies(name),
          car_types(name),
          car_years(year)
        `)
        .eq('id', carId)
        .single();

      if (carError) throw carError;
      setCar(carData);

      // Fetch images
      const { data: images } = await supabase
        .from('car_images')
        .select('*')
        .eq('car_id', carId)
        .order('is_primary', { ascending: false });

      if (images && images.length > 0) {
        const imageUrls = images.map(img => {
          const { data: { publicUrl } } = supabase.storage
            .from('car-images')
            .getPublicUrl(img.storage_path);
          return publicUrl;
        });

        setPrimaryImage(imageUrls[0]);
        setGalleryImages(imageUrls);
      }
    } catch (error) {
      console.error('Error fetching car data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">טוען תצוגה מקדימה...</div>;
  }

  if (!car) {
    return <div className="text-center p-8">לא נמצא מידע על הרכב</div>;
  }

  const customFields = car.custom_fields || {};
  const statusColors: { [key: string]: string } = {
    available: 'bg-green-500',
    sold: 'bg-red-500',
    reserved: 'bg-yellow-500',
    maintenance: 'bg-blue-500',
  };

  const statusLabels: { [key: string]: string } = {
    available: 'זמין',
    sold: 'נמכר',
    reserved: 'שמור',
    maintenance: 'בתחזוקה',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* WordPress-style preview */}
      <Card className="overflow-hidden shadow-lg">
        {/* Header with status badge */}
        <div className="relative">
          {primaryImage && (
            <div className="w-full h-96 bg-muted">
              <img
                src={primaryImage}
                alt={car.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <Badge 
            className={`absolute top-4 right-4 ${statusColors[car.status]} text-white text-lg px-4 py-2`}
          >
            {statusLabels[car.status]}
          </Badge>
        </div>

        <div className="p-8 space-y-6">
          {/* Title */}
          <h1 className="text-4xl font-bold text-foreground">{car.title}</h1>

          {/* Main details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {car.companies && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">יצרן</p>
                <p className="text-lg font-semibold">{car.companies.name}</p>
              </div>
            )}
            {car.car_types && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">סוג</p>
                <p className="text-lg font-semibold">{car.car_types.name}</p>
              </div>
            )}
            {car.car_years && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">שנה</p>
                <p className="text-lg font-semibold">{car.car_years.year}</p>
              </div>
            )}
            {customFields.hand && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">יד</p>
                <p className="text-lg font-semibold">{customFields.hand}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Technical specifications */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">מפרט טכני</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customFields.km && (
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">ק״מ:</span>
                  <span>{customFields.km}</span>
                </div>
              )}
              {customFields.horsepower && (
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">כוח סוס:</span>
                  <span>{customFields.horsepower}</span>
                </div>
              )}
              {customFields.engine_type && (
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">סוג מנוע:</span>
                  <span>{customFields.engine_type}</span>
                </div>
              )}
              {customFields.seats && (
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">מושבים:</span>
                  <span>{customFields.seats}</span>
                </div>
              )}
              {customFields.field_56806 && (
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">מסיק״ק:</span>
                  <span>{customFields.field_56806}</span>
                </div>
              )}
              {customFields.testcar && (
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">טסט עד:</span>
                  <span>{customFields.testcar}</span>
                </div>
              )}
              {customFields.road_trip_date && (
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">תאריך עליה לכביש:</span>
                  <span>{customFields.road_trip_date}</span>
                </div>
              )}
              {customFields.number_car && (
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">מספר רכב:</span>
                  <span>{customFields.number_car}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Price section */}
          {customFields.price && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">מחיר</h2>
              <div className="text-4xl font-bold text-primary">
                ₪{customFields.price}
              </div>
              {customFields.memon && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-2">הצעת מימון:</p>
                  <p className="whitespace-pre-wrap">{customFields.memon}</p>
                </div>
              )}
            </div>
          )}

          {/* Gallery */}
          {galleryImages.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">גלריית תמונות</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryImages.map((url, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={url}
                        alt={`${car.title} - תמונה ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-lg">
        <p>זוהי תצוגה מקדימה של איך הרכב יראה באתר וורדפרס שלך</p>
        <p>העיצוב בפועל עשוי להשתנות בהתאם לתבנית האתר שלך</p>
      </div>
    </div>
  );
};
