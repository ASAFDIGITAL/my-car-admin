import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

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
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/cars">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
              {isEdit ? 'עריכת רכב' : 'הוספת רכב חדש'}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? 'ערוך את פרטי הרכב' : 'הוסף רכב חדש למערכת'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>פרטי הרכב</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">שם הרכב *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="לדוגמה: מרצדס בנץ ספרינטר 519 2019"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="price">מחיר רכישה (פנימי)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">מחיר זה לא יופיע באתר הציבורי</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">הערות פנימיות</Label>
                <Textarea
                  id="notes"
                  value={formData.internal_notes}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  placeholder="הערות, פרטים נוספים..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="gap-2">
                  <Save className="w-4 h-4" />
                  {loading ? 'שומר...' : isEdit ? 'עדכן' : 'הוסף'}
                </Button>
                <Link to="/cars">
                  <Button type="button" variant="outline">
                    ביטול
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </Layout>
  );
};

export default CarForm;
