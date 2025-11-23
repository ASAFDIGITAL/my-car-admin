import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Settings as SettingsIcon } from 'lucide-react';
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

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface CarType {
  id: string;
  name: string;
  slug: string;
}

interface CarYear {
  id: string;
  year: number;
}

const Settings = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [carTypes, setCarTypes] = useState<CarType[]>([]);
  const [carYears, setCarYears] = useState<CarYear[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCompany, setNewCompany] = useState('');
  const [newCarType, setNewCarType] = useState('');
  const [newYear, setNewYear] = useState('');
  const [deleteItem, setDeleteItem] = useState<{ type: string; id: string; name: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (type: 'company' | 'typecar' | 'yearcar', value: string) => {
    if (!value.trim()) {
      toast.error('יש למלא את השדה');
      return;
    }

    try {
      setLoading(true);

      const taxonomyData: any = {
        action: 'create',
        taxonomyType: type,
        data: { name: value },
      };

      if (type === 'yearcar') {
        const yearNum = parseInt(value);
        if (isNaN(yearNum)) {
          toast.error('שנה לא תקינה');
          return;
        }
        taxonomyData.data = { name: value, year: yearNum };
      }

      const { data, error } = await supabase.functions.invoke('wordpress-taxonomy', {
        body: taxonomyData,
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        await fetchData();
        
        // Clear input
        if (type === 'company') setNewCompany('');
        if (type === 'typecar') setNewCarType('');
        if (type === 'yearcar') setNewYear('');
      } else {
        throw new Error(data.error || 'Failed to add');
      }
    } catch (error: any) {
      console.error('Error adding:', error);
      toast.error(`שגיאה בהוספה: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('wordpress-taxonomy', {
        body: {
          action: 'delete',
          taxonomyType: deleteItem.type,
          data: { id: deleteItem.id },
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        await fetchData();
      } else {
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(`שגיאה במחיקה: ${error.message}`);
    } finally {
      setLoading(false);
      setDeleteItem(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              הגדרות מערכת
            </h1>
            <p className="text-muted-foreground">ניהול יצרנים, סוגי רכב ושנים</p>
          </div>
        </div>

        <Tabs defaultValue="companies" dir="rtl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="companies">יצרנים</TabsTrigger>
            <TabsTrigger value="types">סוגי רכב</TabsTrigger>
            <TabsTrigger value="years">שנים</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>הוסף יצרן חדש</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2" dir="rtl">
                  <Input
                    placeholder="שם היצרן"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    disabled={loading}
                    className="text-right"
                  />
                  <Button
                    onClick={() => handleAdd('company', newCompany)}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    הוסף
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>יצרנים קיימים ({companies.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" dir="rtl">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="font-medium">{company.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          setDeleteItem({ type: 'company', id: company.id, name: company.name })
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="types" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>הוסף סוג רכב חדש</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2" dir="rtl">
                  <Input
                    placeholder="סוג הרכב"
                    value={newCarType}
                    onChange={(e) => setNewCarType(e.target.value)}
                    disabled={loading}
                    className="text-right"
                  />
                  <Button
                    onClick={() => handleAdd('typecar', newCarType)}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    הוסף
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>סוגי רכב קיימים ({carTypes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" dir="rtl">
                  {carTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="font-medium">{type.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteItem({ type: 'typecar', id: type.id, name: type.name })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="years" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>הוסף שנה חדשה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2" dir="rtl">
                  <Input
                    type="number"
                    placeholder="שנה (לדוגמה: 2024)"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    disabled={loading}
                    className="text-right"
                  />
                  <Button onClick={() => handleAdd('yearcar', newYear)} disabled={loading} className="gap-2">
                    <Plus className="w-4 h-4" />
                    הוסף
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>שנים קיימות ({carYears.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" dir="rtl">
                  {carYears.map((year) => (
                    <div
                      key={year.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="font-medium">{year.year}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          setDeleteItem({ type: 'yearcar', id: year.id, name: year.year.toString() })
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את "{deleteItem?.name}" גם מהמערכת וגם מ-WordPress. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Settings;