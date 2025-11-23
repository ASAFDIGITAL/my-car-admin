import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, DollarSign, User, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';

interface Sale {
  id: string;
  car_id: string;
  sale_price: number;
  buyer_name: string;
  buyer_phone: string | null;
  buyer_email: string | null;
  sale_date: string;
  notes: string | null;
  cars: {
    title: string;
  };
}

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          cars (title)
        `)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      toast.error('שגיאה בטעינת המכירות');
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.sale_price), 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
              מכירות
            </h1>
            <p className="text-muted-foreground">עקוב אחרי כל המכירות שלך</p>
          </div>
          <Link to="/sales/new">
            <Button className="gap-2 shadow-lg">
              <Plus className="w-4 h-4" />
              רשום מכירה חדשה
            </Button>
          </Link>
        </div>

        <Card className="shadow-lg border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">סה"כ מכירות</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  ₪{totalSales.toLocaleString()}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>היסטוריית מכירות</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">טוען...</div>
            ) : sales.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                אין מכירות רשומות
              </div>
            ) : (
              <div className="overflow-x-auto" dir="rtl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">תאריך</TableHead>
                      <TableHead className="text-right">רכב</TableHead>
                      <TableHead className="text-right">קונה</TableHead>
                      <TableHead className="text-right">טלפון</TableHead>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">מחיר</TableHead>
                      <TableHead className="text-right">הערות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(sale.sale_date), 'dd/MM/yyyy', { locale: he })}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{sale.cars.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {sale.buyer_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{sale.buyer_phone || '-'}</TableCell>
                        <TableCell className="text-sm">{sale.buyer_email || '-'}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-success flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {Number(sale.sale_price).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {sale.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Sales;
