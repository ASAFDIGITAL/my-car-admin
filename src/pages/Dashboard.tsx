import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import Layout from '@/components/Layout';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  totalCars: number;
  availableCars: number;
  soldCars: number;
  totalSales: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalCars: 0,
    availableCars: 0,
    soldCars: 0,
    totalSales: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total cars
      const { count: totalCars } = await supabase
        .from('cars')
        .select('*', { count: 'exact', head: true });

      // Fetch available cars
      const { count: availableCars } = await supabase
        .from('cars')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

      // Fetch sold cars
      const { count: soldCars } = await supabase
        .from('cars')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sold');

      // Fetch total sales amount
      const { data: salesData } = await supabase
        .from('sales')
        .select('sale_price');

      const totalSales = salesData?.reduce((sum, sale) => sum + Number(sale.sale_price), 0) || 0;

      setStats({
        totalCars: totalCars || 0,
        availableCars: availableCars || 0,
        soldCars: soldCars || 0,
        totalSales,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'סה"כ רכבים',
      value: stats.totalCars,
      icon: Car,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'רכבים זמינים',
      value: stats.availableCars,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'רכבים שנמכרו',
      value: stats.soldCars,
      icon: ShoppingCart,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'סה"כ מכירות',
      value: `₪${stats.totalSales.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-yellow-500 to-yellow-600',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
            לוח בקרה
          </h1>
          <p className="text-muted-foreground">מבט כולל על מערכת ניהול הרכבים</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="overflow-hidden group hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} text-white group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>ברוכים הבאים למערכת ניהול הרכבים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              מערכת זו מאפשרת לך לנהל את כל הרכבים שלך בצורה יעילה ומקצועית.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>הוסף והסר רכבים בקלות</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>עקוב אחרי מכירות ופרטי לקוחות</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>נהל מחירים והערות פנימיות</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>התחבר לאתר הוורדפריס שלך</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
