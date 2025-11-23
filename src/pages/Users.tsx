import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, ShieldOff, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  isAdmin: boolean;
}

const Users = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; action: 'add' | 'remove' } | null>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      // Combine data
      const adminUserIds = new Set(adminRoles?.map(role => role.user_id) || []);
      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        isAdmin: adminUserIds.has(profile.id),
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('שגיאה בטעינת משתמשים');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId: string, action: 'add' | 'remove') => {
    setSelectedUser({ id: userId, action });
    setDialogOpen(true);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser) return;

    const { id: userId, action } = selectedUser;

    try {
      setActionLoading(userId);

      if (action === 'add') {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;
        toast.success('הרשאות אדמין נוספו בהצלחה');
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
        toast.success('הרשאות אדמין הוסרו בהצלחה');
      }

      await fetchUsers();
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast.error('שגיאה בשינוי הרשאות');
    } finally {
      setActionLoading(null);
      setDialogOpen(false);
      setSelectedUser(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">ניהול משתמשים</h1>
          <p className="text-muted-foreground mt-2">
            צפה בכל המשתמשים במערכת והוסף או הסר הרשאות אדמין
          </p>
        </div>

        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-xl">
                        {user.full_name || 'ללא שם'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {user.email}
                      </CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        {user.isAdmin ? (
                          <Badge variant="default" className="gap-1">
                            <Shield className="w-3 h-3" />
                            אדמין
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <User className="w-3 h-3" />
                            משתמש רגיל
                          </Badge>
                        )}
                        {user.id === currentUser?.id && (
                          <Badge variant="outline">את/ה</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {user.id !== currentUser?.id && (
                      <Button
                        variant={user.isAdmin ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => handleRoleChange(user.id, user.isAdmin ? 'remove' : 'add')}
                        disabled={actionLoading === user.id}
                        className="gap-2"
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : user.isAdmin ? (
                          <>
                            <ShieldOff className="w-4 h-4" />
                            הסר הרשאות אדמין
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4" />
                            הוסף הרשאות אדמין
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  נרשם בתאריך: {new Date(user.created_at).toLocaleDateString('he-IL')}
                </div>
              </CardContent>
            </Card>
          ))}

          {users.length === 0 && (
            <Card className="shadow-md">
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">לא נמצאו משתמשים במערכת</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.action === 'add' ? 'הוספת הרשאות אדמין' : 'הסרת הרשאות אדמין'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.action === 'add'
                ? 'האם אתה בטוח שברצונך להוסיף הרשאות אדמין למשתמש זה? משתמש זה יקבל גישה מלאה למערכת.'
                : 'האם אתה בטוח שברצונך להסיר הרשאות אדמין ממשתמש זה? המשתמש יאבד גישה למערכת הניהול.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>אישור</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Users;
