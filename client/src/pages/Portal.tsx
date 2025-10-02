import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import ResidentDashboard from '@/components/portal/ResidentDashboard';
import StaffDashboard from '@/components/portal/StaffDashboard';
import VendorDashboard from '@/components/portal/VendorDashboard';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';

export default function Portal() {
  const { user, isLoading, logout } = usePortalAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/portal/login');
    }
  }, [user, isLoading, setLocation]);

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
          <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'resident' && <ResidentDashboard />}
        {user.role === 'staff' && <StaffDashboard />}
        {user.role === 'vendor' && <VendorDashboard />}
      </main>
    </div>
  );
}
