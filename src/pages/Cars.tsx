import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, DollarSign, Car as CarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Car {
  id: string;
  title: string;
  status: 'available' | 'sold' | 'reserved' | 'maintenance';
  purchase_price: number;
  companies: { name: string } | null;
  car_types: { name: string } | null;
  car_years: { year: number } | null;
  created_at: string;
  car_images: Array<{ storage_path: string; is_primary: boolean }>;
}

const statusColors = {
  available: 'bg-green-500/10 text-green-700 border-green-500/20',
  sold: 'bg-red-500/10 text-red-700 border-red-500/20',
  reserved: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  maintenance: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
};

const statusLabels = {
  available: 'זמין',
  sold: 'נמכר',
  reserved: 'שמור',
  maintenance: 'בתחזוקה',
};

const Cars = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select(`
          *,
          companies (name),
          car_types (name),
          car_years (year),
          car_images (storage_path, is_primary)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCars(data || []);
    } catch (error: any) {
      toast.error('שגיאה בטעינת הרכבים');
      console.error('Error fetching cars:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast.success('הרכב נמחק בהצלחה');
      fetchCars();
    } catch (error: any) {
      toast.error('שגיאה במחיקת הרכב');
      console.error('Error deleting car:', error);
    } finally {
      setDeleteId(null);
    }
  };

  const filteredCars = cars.filter((car) =>
    car.title.toLowerCase().includes(search.toLowerCase()) ||
    car.companies?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
              ניהול רכבים
            </h1>
            <p className="text-muted-foreground">צפה ונהל את כל הרכבים שלך</p>
          </div>
          <Link to="/cars/new">
            <Button className="gap-2 shadow-lg">
              <Plus className="w-4 h-4" />
              הוסף רכב חדש
            </Button>
          </Link>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              חיפוש רכבים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="חפש לפי שם רכב או יצרן..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">טוען...</div>
            ) : filteredCars.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {search ? 'לא נמצאו רכבים מתאימים' : 'אין רכבים במערכת'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>תמונה</TableHead>
                      <TableHead>שם הרכב</TableHead>
                      <TableHead>יצרן</TableHead>
                      <TableHead>סוג</TableHead>
                      <TableHead>שנה</TableHead>
                      <TableHead>מחיר רכישה</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCars.map((car) => {
                      const primaryImage = car.car_images?.find(img => img.is_primary);
                      return (
                        <TableRow key={car.id}>
                          <TableCell>
                            {primaryImage ? (
                              <img 
                                src={primaryImage.storage_path} 
                                alt={car.title}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                                <CarIcon className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{car.title}</TableCell>
                        <TableCell>{car.companies?.name || '-'}</TableCell>
                        <TableCell>{car.car_types?.name || '-'}</TableCell>
                          <TableCell>{car.car_years?.year || '-'}</TableCell>
                          <TableCell>
                            {car.purchase_price ? (
                              <span className="flex items-center gap-1 text-sm">
                                <DollarSign className="w-3 h-3" />
                                {Number(car.purchase_price).toLocaleString()}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[car.status]}>
                              {statusLabels[car.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 justify-end">
                              <Link to={`/cars/edit/${car.id}`}>
                                <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-destructive/10 text-destructive"
                                onClick={() => setDeleteId(car.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הרכב לצמיתות. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Cars;
