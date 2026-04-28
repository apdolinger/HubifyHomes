import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import StaffDashboard from '@/components/portal/StaffDashboard';
import VendorDashboard from '@/components/portal/VendorDashboard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { LogOut, Loader2, Bell } from 'lucide-react';

export default function Portal() {
  const { user, isLoading, logout } = usePortalAuth();
  const [, setLocation] = useLocation();
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/portal/login');
    }
  }, [user, isLoading, setLocation]);

  const { data: notifPrefs } = useQuery<{ emailInvoiceReminders: boolean }>({
    queryKey: ['/api/portal/notification-preferences'],
    enabled: !!user && notifSettingsOpen,
  });

  const updateNotifPrefsMutation = useMutation({
    mutationFn: async (updates: { emailInvoiceReminders: boolean }) =>
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
            <Button variant="ghost" size="icon" onClick={() => setNotifSettingsOpen(true)} title="Notification settings">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'staff' && <StaffDashboard />}
        {user.role === 'vendor' && <VendorDashboard />}
      </main>

      {/* Portal notification preferences dialog */}
      <Dialog open={notifSettingsOpen} onOpenChange={setNotifSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-4 p-3 border rounded-lg">
              <div>
                <Label className="font-medium">Invoice email reminders</Label>
                <p className="text-sm text-slate-500 mt-0.5">
                  Receive email reminders when invoices are due soon
                </p>
              </div>
              <Switch
                checked={notifPrefs?.emailInvoiceReminders !== false}
                onCheckedChange={(checked) =>
                  updateNotifPrefsMutation.mutate({ emailInvoiceReminders: checked })
                }
                disabled={updateNotifPrefsMutation.isPending}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
