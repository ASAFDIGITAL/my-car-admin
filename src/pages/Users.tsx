import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, ShieldOff, User, UserPlus, Trash2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; action: 'add' | 'remove' } | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [newUserData, setNewUserData] = useState({ email: '', password: '', fullName: '' });
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

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setActionLoading(userToDelete);

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('המשתמש נמחק בהצלחה');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'שגיאה במחיקת המשתמש');
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.password || !newUserData.fullName) {
      toast.error('נא למלא את כל השדות');
      return;
    }

    try {
      setActionLoading('creating');

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserData.email,
          password: newUserData.password,
          fullName: newUserData.fullName,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('המשתמש נוצר בהצלחה');
      setNewUserData({ email: '', password: '', fullName: '' });
      setCreateDialogOpen(false);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'שגיאה ביצירת משתמש');
    } finally {
      setActionLoading(null);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ניהול משתמשים</h1>
            <p className="text-muted-foreground mt-2">
              צפה בכל המשתמשים במערכת, הוסף או הסר הרשאות אדמין
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            הוסף משתמש חדש
          </Button>
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

                  <div className="flex gap-2">
                    {user.id !== currentUser?.id && (
                      <>
                        <Button
                          variant={user.isAdmin ? 'outline' : 'default'}
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
                              הסר אדמין
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4" />
                              הוסף אדמין
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={actionLoading === user.id}
                          className="gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          מחק
                        </Button>
                      </>
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

      {/* Role Change Dialog */}
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

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת משתמש</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק משתמש זה? פעולה זו לא ניתנת לביטול והמשתמש יאבד את כל הגישה למערכת.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive text-destructive-foreground">
              מחק משתמש
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוסף משתמש חדש</DialogTitle>
            <DialogDescription>
              צור חשבון משתמש חדש במערכת. המשתמש יוכל להתחבר באמצעות האימייל והסיסמה שתגדיר.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4" dir="rtl">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-right block">שם מלא</Label>
              <Input
                id="fullName"
                value={newUserData.fullName}
                onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                placeholder="הזן שם מלא"
                className="text-right"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-right block">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="example@email.com"
                className="text-right"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-right block">סיסמה</Label>
              <Input
                id="password"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                placeholder="הזן סיסמה"
                className="text-right"
                dir="rtl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateUser} disabled={actionLoading === 'creating'}>
              {actionLoading === 'creating' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  יוצר...
                </>
              ) : (
                'צור משתמש'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Users;
