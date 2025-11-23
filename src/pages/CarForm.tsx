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
}

const CarForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [carTypes, setCarTypes] = useState<any[]>([]);
  const [carYears, setCarYears] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    status: 'available',
    company_id: '',
    car_type_id: '',
    car_year_id: '',
    purchase_price: '',
    internal_notes: '',
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

      setFormData({
        title: data.title,
        status: data.status,
        company_id: data.company_id || '',
        car_type_id: data.car_type_id || '',
        car_year_id: data.car_year_id || '',
        purchase_price: data.purchase_price?.toString() || '',
        internal_notes: data.internal_notes || '',
      });
    } catch (error: any) {
      toast.error('שגיאה בטעינת הרכב');
      console.error('Error fetching car:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        title: formData.title,
        status: formData.status,
        company_id: formData.company_id || null,
        car_type_id: formData.car_type_id || null,
        car_year_id: formData.car_year_id || null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        internal_notes: formData.internal_notes || null,
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
          <div className="flex items-center gap-4 mb-6">
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

                        {/* Financial Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <div className="w-1 h-6 bg-primary rounded-full" />
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                              פרטים כספיים
                            </h3>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="price">מחיר רכישה (פנימי)</Label>
                            <div className="relative">
                              <Input
                                id="price"
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
