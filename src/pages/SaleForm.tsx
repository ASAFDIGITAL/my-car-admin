import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  car_id: string;
  sale_price: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  buyer_id_number: string;
  sale_date: string;
  notes: string;
}

const SaleForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [cars, setCars] = useState<any[]>([]);

  const [formData, setFormData] = useState<FormData>({
    car_id: '',
    sale_price: '',
    buyer_name: '',
    buyer_phone: '',
    buyer_email: '',
    buyer_id_number: '',
    sale_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchAvailableCars();
    
    // Get carId from URL if exists
    const carIdFromUrl = searchParams.get('carId');
    if (carIdFromUrl) {
      setFormData(prev => ({ ...prev, car_id: carIdFromUrl }));
    }
  }, [searchParams]);

  const fetchAvailableCars = async () => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('id, title, status')
        .in('status', ['available', 'sold'])
        .order('title');

      if (error) throw error;
      setCars(data || []);
    } catch (error) {
      console.error('Error fetching cars:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Insert sale
      const { error: saleError } = await supabase
        .from('sales')
        .insert([{
          car_id: formData.car_id,
          sale_price: parseFloat(formData.sale_price),
          buyer_name: formData.buyer_name,
          buyer_phone: formData.buyer_phone || null,
          buyer_email: formData.buyer_email || null,
          buyer_id_number: formData.buyer_id_number || null,
          sale_date: new Date(formData.sale_date).toISOString(),
          notes: formData.notes || null,
        }]);

      if (saleError) throw saleError;

      // Update car status to sold
      const { error: carError } = await supabase
        .from('cars')
        .update({ status: 'sold' })
        .eq('id', formData.car_id);

      if (carError) throw carError;

      toast.success('המכירה נרשמה בהצלחה');
      navigate('/sales');
    } catch (error: any) {
      toast.error('שגיאה ברישום המכירה');
      console.error('Error saving sale:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/sales">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
              רישום מכירה חדשה
            </h1>
            <p className="text-muted-foreground">רשום מכירה של רכב</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>פרטי המכירה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="car">בחר רכב *</Label>
                <Select
                  value={formData.car_id}
                  onValueChange={(value) => setFormData({ ...formData, car_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר רכב" />
                  </SelectTrigger>
                  <SelectContent>
                    {cars.map((car) => (
                      <SelectItem key={car.id} value={car.id}>
                        {car.title}
                        {car.status === 'sold' && (
                          <span className="text-xs text-muted-foreground mr-2">(נמכר)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">מחיר מכירה *</Label>
                  <div className="relative">
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.sale_price}
                      onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                      placeholder="0.00"
                      required
                      className="pr-8"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      ₪
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">תאריך מכירה *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.sale_date}
                    onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg">פרטי הקונה</h3>

                <div className="space-y-2">
                  <Label htmlFor="buyer_name">שם הקונה *</Label>
                  <Input
                    id="buyer_name"
                    value={formData.buyer_name}
                    onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                    placeholder="שם מלא"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buyer_phone">טלפון</Label>
                    <Input
                      id="buyer_phone"
                      type="tel"
                      value={formData.buyer_phone}
                      onChange={(e) => setFormData({ ...formData, buyer_phone: e.target.value })}
                      placeholder="050-1234567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buyer_email">אימייל</Label>
                    <Input
                      id="buyer_email"
                      type="email"
                      value={formData.buyer_email}
                      onChange={(e) => setFormData({ ...formData, buyer_email: e.target.value })}
                      placeholder="buyer@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer_id">ת.ז / ח.פ</Label>
                  <Input
                    id="buyer_id"
                    value={formData.buyer_id_number}
                    onChange={(e) => setFormData({ ...formData, buyer_id_number: e.target.value })}
                    placeholder="מספר תעודת זהות או חברה"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">הערות</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="הערות נוספות על המכירה..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="gap-2">
                  <Save className="w-4 h-4" />
                  {loading ? 'שומר...' : 'רשום מכירה'}
                </Button>
                <Link to="/sales">
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

export default SaleForm;
