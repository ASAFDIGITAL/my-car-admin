import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight, Save, Image } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageUpload } from '@/components/ImageUpload';

interface FormData {
  title: string;
  status: 'available' | 'sold' | 'reserved' | 'maintenance';
  company_id: string;
  car_type_id: string;
  car_year_id: string;
  purchase_price: string;
  internal_notes: string;
  hand: string;
  km: string;
  field_56806: string;
  horsepower: string;
  engine_type: string;
  testcar: string;
  price: string;
  memon: string;
  seats: string;
  road_trip_date: string;
  number_car: string;
}

const CarForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [carTypes, setCarTypes] = useState<any[]>([]);
  const [carYears, setCarYears] = useState<any[]>([]);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    status: 'available',
    company_id: '',
    car_type_id: '',
    car_year_id: '',
    purchase_price: '',
    internal_notes: '',
    hand: '',
    km: '',
    field_56806: '',
    horsepower: '',
    engine_type: '',
    testcar: '',
    price: '',
    memon: '',
    seats: '',
    road_trip_date: '',
    number_car: '',
  });

  useEffect(() => {
    fetchTaxonomies();
    if (isEdit) {
      fetchCar();
    }
  }, [id]);

  const fetchTaxonomies = async () => {
    try {
      const [companiesRes, typesRes, yearsRes] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('car_types').select('*').order('name'),
        supabase.from('car_years').select('*').order('year', { ascending: false }),
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      if (typesRes.data) setCarTypes(typesRes.data);
      if (yearsRes.data) setCarYears(yearsRes.data);
    } catch (error) {
      console.error('Error fetching taxonomies:', error);
    }
  };

  const fetchCar = async () => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const customFields = data.custom_fields as any || {};
      
      setFormData({
        title: data.title,
        status: data.status,
        company_id: data.company_id || '',
        car_type_id: data.car_type_id || '',
        car_year_id: data.car_year_id || '',
        purchase_price: data.purchase_price?.toString() || '',
        internal_notes: data.internal_notes || '',
        hand: customFields.hand || '',
        km: customFields.km || '',
        field_56806: customFields.field_56806 || '',
        horsepower: customFields.horsepower || '',
        engine_type: customFields.engine_type || '',
        testcar: customFields.testcar || '',
        price: customFields.price || '',
        memon: customFields.memon || '',
        seats: customFields.seats || '',
        road_trip_date: customFields.road_trip_date || '',
        number_car: customFields.number_car || '',
      });

      // Fetch primary image
      const { data: imageData } = await supabase.rpc('get_car_primary_image', {
        car_uuid: id
      });
      
      if (imageData) {
        const { data: { publicUrl } } = supabase.storage
          .from('car-images')
          .getPublicUrl(imageData);
        setPrimaryImageUrl(publicUrl);
      }
    } catch (error: any) {
      toast.error('שגיאה בטעינת הרכב');
      console.error('Error fetching car:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const customFields = {
        hand: formData.hand,
        km: formData.km,
        field_56806: formData.field_56806,
        horsepower: formData.horsepower,
        engine_type: formData.engine_type,
        testcar: formData.testcar,
        price: formData.price,
        memon: formData.memon,
        seats: formData.seats,
        road_trip_date: formData.road_trip_date,
        number_car: formData.number_car,
      };

      const dataToSave = {
        title: formData.title,
        status: formData.status,
        company_id: formData.company_id || null,
        car_type_id: formData.car_type_id || null,
        car_year_id: formData.car_year_id || null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        internal_notes: formData.internal_notes || null,
        custom_fields: customFields,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('cars')
          .update(dataToSave)
          .eq('id', id);

        if (error) throw error;
        
        // Check if status changed to sold
        if (formData.status === 'sold') {
          toast.success('הרכב עודכן בהצלחה');
          // Navigate to create sale for this car
          navigate(`/sales/new?carId=${id}`);
          return;
        }
        
        toast.success('הרכב עודכן בהצלחה');
      } else {
        const { error } = await supabase
          .from('cars')
          .insert([dataToSave]);

        if (error) throw error;
        toast.success('הרכב נוסף בהצלחה');
      }

      navigate('/cars');
    } catch (error: any) {
      toast.error(isEdit ? 'שגיאה בעדכון הרכב' : 'שגיאה בהוספת הרכב');
      console.error('Error saving car:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link to="/cars">
                <Button variant="ghost" size="icon">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isEdit ? 'עריכת רכב' : 'הוספת רכב חדש'}
                </h1>
                <p className="text-muted-foreground">
                  {isEdit ? 'ערוך את פרטי הרכב' : 'הוסף רכב חדש למערכת'}
                </p>
              </div>
            </div>
            
            {isEdit && primaryImageUrl && (
              <div className="w-40 h-40 rounded-lg overflow-hidden border-2 border-border shadow-lg">
                <img 
                  src={primaryImageUrl} 
                  alt="תמונה ראשית" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">פרטי הרכב</TabsTrigger>
              {isEdit && (
                <TabsTrigger value="images">
                  <Image className="w-4 h-4 ml-2" />
                  תמונות
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="details">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Empty space on left */}
                <div className="hidden lg:block lg:col-span-2" />

                {/* Main form on the right */}
                <div className="lg:col-span-10">
                  <form onSubmit={handleSubmit}>
                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-2xl">פרטי הרכב</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        {/* Basic Details Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <div className="w-1 h-6 bg-primary rounded-full" />
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                              פרטים בסיסיים
                            </h3>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="title">שם הרכב *</Label>
                              <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="לדוגמה: מרצדס בנץ ספרינטר 519 2019"
                                required
                                className="text-lg"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="company">יצרן</Label>
                                <Select
                                  value={formData.company_id}
                                  onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="בחר יצרן" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {companies.map((company) => (
                                      <SelectItem key={company.id} value={company.id}>
                                        {company.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="type">סוג רכב</Label>
                                <Select
                                  value={formData.car_type_id}
                                  onValueChange={(value) => setFormData({ ...formData, car_type_id: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="בחר סוג" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {carTypes.map((type) => (
                                      <SelectItem key={type.id} value={type.id}>
                                        {type.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="year">שנה</Label>
                                <Select
                                  value={formData.car_year_id}
                                  onValueChange={(value) => setFormData({ ...formData, car_year_id: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="בחר שנה" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {carYears.map((year) => (
                                      <SelectItem key={year.id} value={year.id}>
                                        {year.year}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="status">סטטוס</Label>
                              <Select
                                value={formData.status}
                                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="available">זמין</SelectItem>
                                  <SelectItem value="sold">נמכר</SelectItem>
                                  <SelectItem value="reserved">שמור</SelectItem>
                                  <SelectItem value="maintenance">בתחזוקה</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Technical Details Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <div className="w-1 h-6 bg-primary rounded-full" />
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                              פרטים טכניים
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="hand">יד</Label>
                              <Input
                                id="hand"
                                type="number"
                                value={formData.hand}
                                onChange={(e) => setFormData({ ...formData, hand: e.target.value })}
                                placeholder="1"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="km">ק״מ</Label>
                              <Input
                                id="km"
                                value={formData.km}
                                onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                                placeholder="0"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="number_car">מספר רכב</Label>
                              <Input
                                id="number_car"
                                value={formData.number_car}
                                onChange={(e) => setFormData({ ...formData, number_car: e.target.value })}
                                placeholder="מספר רכב"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="horsepower">כוח סוס</Label>
                              <Input
                                id="horsepower"
                                value={formData.horsepower}
                                onChange={(e) => setFormData({ ...formData, horsepower: e.target.value })}
                                placeholder="כוח סוס"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="engine_type">סוג מנוע</Label>
                              <Input
                                id="engine_type"
                                value={formData.engine_type}
                                onChange={(e) => setFormData({ ...formData, engine_type: e.target.value })}
                                placeholder="סוג מנוע"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="seats">מושבים</Label>
                              <Input
                                id="seats"
                                value={formData.seats}
                                onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                                placeholder="מספר מושבים"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="field_56806">מסיק״ק</Label>
                              <Input
                                id="field_56806"
                                value={formData.field_56806}
                                onChange={(e) => setFormData({ ...formData, field_56806: e.target.value })}
                                placeholder="מסיק״ק"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="testcar">טסט עד</Label>
                              <Input
                                id="testcar"
                                type="date"
                                value={formData.testcar}
                                onChange={(e) => setFormData({ ...formData, testcar: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="road_trip_date">תאריך עליה לכביש</Label>
                              <Input
                                id="road_trip_date"
                                value={formData.road_trip_date}
                                onChange={(e) => setFormData({ ...formData, road_trip_date: e.target.value })}
                                placeholder="תאריך עליה לכביש"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Financial Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <div className="w-1 h-6 bg-primary rounded-full" />
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                              פרטים כספיים
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="purchase_price">מחיר רכישה (פנימי)</Label>
                              <div className="relative">
                                <Input
                                  id="purchase_price"
                                  type="number"
                                  step="0.01"
                                  value={formData.purchase_price}
                                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                                  placeholder="0.00"
                                  className="text-lg pr-8"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                  ₪
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">מחיר זה לא יופיע באתר הציבורי</p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="price">מחיר</Label>
                              <div className="relative">
                                <Input
                                  id="price"
                                  value={formData.price}
                                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                  placeholder="מחיר"
                                  className="text-lg pr-8"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                  ₪
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="memon">הצעת מימון (מחיר)</Label>
                              <Textarea
                                id="memon"
                                value={formData.memon}
                                onChange={(e) => setFormData({ ...formData, memon: e.target.value })}
                                placeholder="הצעת מימון"
                                rows={2}
                                className="resize-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Notes Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <div className="w-1 h-6 bg-primary rounded-full" />
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                              הערות והארות
                            </h3>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="notes">הערות פנימיות</Label>
                            <Textarea
                              id="notes"
                              value={formData.internal_notes}
                              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                              placeholder="הערות, פרטים נוספים..."
                              rows={4}
                              className="resize-none"
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-border">
                          <Button type="submit" disabled={loading} size="lg" className="gap-2">
                            <Save className="w-4 h-4" />
                            {loading ? 'שומר...' : isEdit ? 'עדכן' : 'הוסף'}
                          </Button>
                          <Link to="/cars">
                            <Button type="button" variant="outline" size="lg">
                              ביטול
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </form>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="images">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="hidden lg:block lg:col-span-2" />
                <div className="lg:col-span-10">
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-2xl">תמונות הרכב</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ImageUpload carId={id!} />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default CarForm;
