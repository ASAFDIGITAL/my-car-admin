import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, DollarSign, Car as CarIcon, ChevronDown, ChevronUp } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Car {
  id: string;
  title: string;
  status: 'available' | 'sold' | 'reserved' | 'maintenance';
  purchase_price: number;
  companies: { name: string } | null;
  car_types: { name: string } | null;
  car_years: { year: number } | null;
  created_at: string;
  custom_fields: any;
  car_images: Array<{ storage_path: string; is_primary: boolean }>;
  wordpress_id: number | null;
  internal_notes: string | null;
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
  const [engineTypeFilter, setEngineTypeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [kmFilter, setKmFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  const toggleRow = (carId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(carId)) {
        newSet.delete(carId);
      } else {
        newSet.add(carId);
      }
      return newSet;
    });
  };

  const filteredCars = cars.filter((car) => {
    const searchLower = search.toLowerCase();
    const customFields = (car.custom_fields as any) || {};
    const numberCar = customFields.number_car || '';
    const engineType = customFields.engine_type || '';
    const km = customFields.km || '';
    const year = car.car_years?.year?.toString() || '';

    // Text search
    const matchesSearch =
      car.title.toLowerCase().includes(searchLower) ||
      car.companies?.name.toLowerCase().includes(searchLower) ||
      numberCar.toLowerCase().includes(searchLower) ||
      engineType.toLowerCase().includes(searchLower);

    // Engine type filter
    const matchesEngineType =
      engineTypeFilter === 'all' || engineType.toLowerCase().includes(engineTypeFilter.toLowerCase());

    // Year filter
    const matchesYear = yearFilter === 'all' || year === yearFilter;

    // KM filter
    let matchesKm = true;
    if (kmFilter !== 'all' && km) {
      const kmNum = parseInt(km);
      if (kmFilter === 'low' && kmNum > 100000) matchesKm = false;
      if (kmFilter === 'medium' && (kmNum <= 100000 || kmNum > 300000)) matchesKm = false;
      if (kmFilter === 'high' && kmNum <= 300000) matchesKm = false;
    }

    return matchesSearch && matchesEngineType && matchesYear && matchesKm;
  });

  // Get unique years and engine types for filters
  const uniqueYears = Array.from(new Set(cars.map((car) => car.car_years?.year).filter(Boolean))).sort(
    (a, b) => (b as number) - (a as number)
  );
  const uniqueEngineTypes = Array.from(
    new Set(
      cars
        .map((car) => (car.custom_fields as any)?.engine_type)
        .filter((type) => type && type.trim() !== '')
    )
  ).sort();

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
              חיפוש וסינון רכבים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
              <Input
                placeholder="חפש לפי שם רכב, יצרן, מספר רכב..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-right"
              />
              <Select value={engineTypeFilter} onValueChange={setEngineTypeFilter}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="סוג מנוע" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל סוגי המנוע</SelectItem>
                  {uniqueEngineTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="שנה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל השנים</SelectItem>
                  {uniqueYears.map((year) => (
                    <SelectItem key={year} value={year?.toString() || ''}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={kmFilter} onValueChange={setKmFilter}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="קילומטראז'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקילומטראז'</SelectItem>
                  <SelectItem value="low">עד 100,000 ק"מ</SelectItem>
                  <SelectItem value="medium">100,000 - 300,000 ק"מ</SelectItem>
                  <SelectItem value="high">מעל 300,000 ק"מ</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <div className="overflow-x-auto" dir="rtl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right w-12"></TableHead>
                      <TableHead className="text-right">תמונה</TableHead>
                      <TableHead className="text-right">שם הרכב</TableHead>
                      <TableHead className="text-right">מספר רכב</TableHead>
                      <TableHead className="text-right">יצרן</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCars.map((car) => {
                      const primaryImage = car.car_images?.find((img) => img.is_primary);
                      const customFields = (car.custom_fields as any) || {};
                      const numberCar = customFields.number_car || '-';
                      const km = customFields.km || '-';
                      const engineType = customFields.engine_type || '-';
                      const hand = customFields.hand || '-';
                      const horsepower = customFields.horsepower || '-';
                      const seats = customFields.seats || '-';
                      const price = customFields.price || '-';
                      const roadTripDate = customFields.road_trip_date || '-';
                      
                      const primaryImageUrl = primaryImage
                        ? supabase.storage.from('car-images').getPublicUrl(primaryImage.storage_path).data
                            .publicUrl
                        : null;
                      const wordpressUrl = car.wordpress_id
                        ? `https://walid-group.co.il/?p=${car.wordpress_id}`
                        : null;
                      const isExpanded = expandedRows.has(car.id);
                      
                      return (
                        <>
                          <TableRow key={car.id} className="group">
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleRow(car.id)}
                                className="hover:bg-accent/10"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              {primaryImageUrl ? (
                                <img
                                  src={primaryImageUrl}
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
                            <TableCell>{numberCar}</TableCell>
                            <TableCell>{car.companies?.name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusColors[car.status]}>
                                {statusLabels[car.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {wordpressUrl && (
                                  <a href={wordpressUrl} target="_blank" rel="noreferrer">
                                    <Button variant="ghost" size="icon" className="hover:bg-accent/10">
                                      <CarIcon className="w-4 h-4" />
                                    </Button>
                                  </a>
                                )}
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
                          {isExpanded && (
                            <TableRow key={`${car.id}-details`} className="bg-muted/30">
                              <TableCell colSpan={7}>
                                <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" dir="rtl">
                                  <div>
                                    <span className="text-sm font-semibold text-muted-foreground">סוג:</span>
                                    <p className="text-sm mt-1">{car.car_types?.name || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-muted-foreground">שנה:</span>
                                    <p className="text-sm mt-1">{car.car_years?.year || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-muted-foreground">ק"מ:</span>
                                    <p className="text-sm mt-1">{km !== '-' ? `${parseInt(km).toLocaleString()} ק"מ` : '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-muted-foreground">מחיר רכישה:</span>
                                    <p className="text-sm mt-1">
                                      {car.purchase_price ? `₪${Number(car.purchase_price).toLocaleString()}` : '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-muted-foreground">סוג מנוע:</span>
                                    <p className="text-sm mt-1">{engineType}</p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-muted-foreground">יד:</span>
                                    <p className="text-sm mt-1">{hand}</p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-muted-foreground">כוח סוס:</span>
                                    <p className="text-sm mt-1">{horsepower}</p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-muted-foreground">מספר מושבים:</span>
                                    <p className="text-sm mt-1">{seats}</p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-muted-foreground">מחיר מבוקש:</span>
                                    <p className="text-sm mt-1">{price !== '-' ? `₪${parseInt(price).toLocaleString()}` : '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-muted-foreground">תאריך טסט:</span>
                                    <p className="text-sm mt-1">{roadTripDate}</p>
                                  </div>
                                  {car.internal_notes && (
                                    <div className="col-span-2 md:col-span-3 lg:col-span-4">
                                      <span className="text-sm font-semibold text-muted-foreground">הערות פנימיות:</span>
                                      <p className="text-sm mt-1 whitespace-pre-wrap">{car.internal_notes}</p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
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
