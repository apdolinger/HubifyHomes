import { useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { LogOut, Loader2, ArrowLeft, Bell, FileText, ClipboardList } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface NotificationPrefs {
  emailInvoiceReminders: boolean;
  emailInspectionReminders: boolean;
}

export default function PortalNotifications() {
  const { user, isLoading, logout } = usePortalAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/portal/login');
    }
  }, [user, isLoading, setLocation]);

  const { data: notifPrefs, isLoading: prefsLoading } = useQuery<NotificationPrefs>({
    queryKey: ['/api/portal/notification-preferences'],
    enabled: !!user,
  });

  const updateNotifPrefsMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPrefs>) =>
      apiRequest('PATCH', '/api/portal/notification-preferences', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/notification-preferences'] });
      toast({ title: 'Notification preferences saved' });
    },
    onError: () => toast({ title: 'Failed to save preferences', variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hubify Portal</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Welcome, {user.firstName || user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/portal">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Portal
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Settings</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control which email notifications you receive from the portal.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Notifications</CardTitle>
            <CardDescription>Choose which emails you want to receive. You can change these at any time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prefsLoading ? (
              <>
                <div className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-10 rounded-full" />
                </div>
                <div className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                  <Skeleton className="h-6 w-10 rounded-full" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-gray-500 shrink-0" />
                    <div>
                      <Label className="font-medium cursor-pointer" htmlFor="invoice-reminders">
                        Invoice reminders
                      </Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Receive email reminders when invoices are due soon
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="invoice-reminders"
                    checked={notifPrefs?.emailInvoiceReminders !== false}
                    onCheckedChange={(checked) =>
                      updateNotifPrefsMutation.mutate({ emailInvoiceReminders: checked })
                    }
                    disabled={updateNotifPrefsMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <ClipboardList className="h-4 w-4 mt-0.5 text-gray-500 shrink-0" />
                    <div>
                      <Label className="font-medium cursor-pointer" htmlFor="inspection-reminders">
                        Inspection reminders
                      </Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Receive email reminders about upcoming property inspections
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="inspection-reminders"
                    checked={notifPrefs?.emailInspectionReminders !== false}
                    onCheckedChange={(checked) =>
                      updateNotifPrefsMutation.mutate({ emailInspectionReminders: checked })
                    }
                    disabled={updateNotifPrefsMutation.isPending}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
