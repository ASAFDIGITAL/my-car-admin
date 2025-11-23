import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Settings as SettingsIcon, Wifi, CheckCircle2, XCircle } from 'lucide-react';
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

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResults, setConnectionResults] = useState<any>(null);
  
  const [wpUrl, setWpUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpPassword, setWpPassword] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);

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

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionResults(null);
      toast.loading('בודק חיבור ל-WordPress...');

      const { data, error } = await supabase.functions.invoke('wordpress-test-connection');

      if (error) {
        toast.dismiss();
        toast.error(`שגיאה בבדיקת החיבור: ${error.message}`);
        return;
      }

      toast.dismiss();
      setConnectionResults(data);
      
      if (data.success) {
        toast.success(data.summary);
      } else {
        toast.error(data.summary || 'נמצאו בעיות בחיבור');
      }
    } catch (error: any) {
      toast.dismiss();
      console.error('Error testing connection:', error);
      toast.error(`שגיאה בבדיקת החיבור: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!wpUrl.trim() || !wpUsername.trim() || !wpPassword.trim()) {
      toast.error('יש למלא את כל השדות');
      return;
    }

    try {
      setSavingCredentials(true);
      toast.loading('שומר פרטי חיבור...');

      // Save to environment variables via Supabase secrets
      // Note: This will update the secrets, which requires backend deployment
      const { error: urlError } = await supabase.functions.invoke('update-wp-credentials', {
        body: {
          url: wpUrl,
          username: wpUsername,
          password: wpPassword,
        },
      });

      if (urlError) {
        throw urlError;
      }

      toast.dismiss();
      toast.success('פרטי החיבור נשמרו בהצלחה');
      
      // Clear password field for security
      setWpPassword('');
      
      // Clear previous test results
      setConnectionResults(null);
    } catch (error: any) {
      toast.dismiss();
      console.error('Error saving credentials:', error);
      toast.error(`שגיאה בשמירת פרטים: ${error.message}`);
    } finally {
      setSavingCredentials(false);
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

        <Tabs defaultValue="wordpress" dir="rtl">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="wordpress">חיבור WordPress</TabsTrigger>
            <TabsTrigger value="companies">יצרנים</TabsTrigger>
            <TabsTrigger value="types">סוגי רכב</TabsTrigger>
            <TabsTrigger value="years">שנים</TabsTrigger>
          </TabsList>

          <TabsContent value="wordpress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  פרטי חיבור ל-WordPress
                </CardTitle>
                <CardDescription>
                  הזן את פרטי החיבור לאתר WordPress שלך
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4" dir="rtl">
                <div className="space-y-2">
                  <label className="text-sm font-medium">כתובת אתר WordPress</label>
                  <Input
                    type="url"
                    placeholder="https://walid-group.co.il"
                    value={wpUrl}
                    onChange={(e) => setWpUrl(e.target.value)}
                    disabled={savingCredentials}
                    className="text-right"
                  />
                  <p className="text-xs text-muted-foreground">
                    הכתובת המלאה של האתר (כולל https://)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">שם משתמש</label>
                  <Input
                    type="text"
                    placeholder="שם המשתמש ב-WordPress"
                    value={wpUsername}
                    onChange={(e) => setWpUsername(e.target.value)}
                    disabled={savingCredentials}
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">סיסמת אפליקציה (App Password)</label>
                  <Input
                    type="password"
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={wpPassword}
                    onChange={(e) => setWpPassword(e.target.value)}
                    disabled={savingCredentials}
                    className="text-right"
                  />
                  <p className="text-xs text-muted-foreground">
                    לא הסיסמה הרגילה - סיסמת אפליקציה שנוצרת בהגדרות המשתמש ב-WordPress
                  </p>
                </div>

                <Button
                  onClick={handleSaveCredentials}
                  disabled={savingCredentials}
                  className="gap-2 w-full"
                  size="lg"
                >
                  {savingCredentials ? 'שומר...' : 'שמור פרטי חיבור'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  בדיקת חיבור ל-WordPress
                </CardTitle>
                <CardDescription>
                  בדוק את החיבור והרשאות ל-WordPress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="gap-2"
                  size="lg"
                >
                  <Wifi className="w-4 h-4" />
                  {testingConnection ? 'בודק חיבור...' : 'בדוק חיבור'}
                </Button>

                {connectionResults && (
                  <div className="space-y-3 p-4 bg-muted rounded-lg" dir="rtl">
                    <h3 className="font-semibold text-lg">תוצאות בדיקה:</h3>
                    
                    {Object.entries(connectionResults.tests || {}).map(([key, test]: [string, any]) => (
                      <div key={key} className="flex items-start gap-3 p-3 bg-background rounded-md">
                        {test.success ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={test.success ? 'text-green-600' : 'text-destructive'}>
                            {test.message}
                          </p>
                          {test.details && (
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                              {JSON.stringify(test.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}

                    {connectionResults.summary && (
                      <div className={`p-4 rounded-md font-medium ${
                        connectionResults.success 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-destructive/10 text-destructive border border-destructive/20'
                      }`}>
                        {connectionResults.summary}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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