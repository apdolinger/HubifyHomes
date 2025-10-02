import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, Monitor, Eye } from 'lucide-react';
import ResidentDashboard from '@/components/portal/ResidentDashboard';
import StaffDashboard from '@/components/portal/StaffDashboard';
import VendorDashboard from '@/components/portal/VendorDashboard';

type PortalRole = 'resident' | 'staff' | 'vendor';
type DeviceView = 'desktop' | 'mobile';

export default function PortalPreview() {
  const [selectedRole, setSelectedRole] = useState<PortalRole>('resident');
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop');

  const renderDashboard = () => {
    switch (selectedRole) {
      case 'resident':
        return <ResidentDashboard />;
      case 'staff':
        return <StaffDashboard />;
      case 'vendor':
        return <VendorDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye className="h-8 w-8" />
            Portal Preview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Preview how the portal looks for different user roles
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Preview Controls</CardTitle>
            <CardDescription>Select a role and device type to preview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Portal Role</label>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as PortalRole)}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resident" data-testid="option-resident">Resident</SelectItem>
                    <SelectItem value="staff" data-testid="option-staff">Staff</SelectItem>
                    <SelectItem value="vendor" data-testid="option-vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Device View</label>
                <div className="flex gap-2">
                  <Button
                    variant={deviceView === 'desktop' ? 'default' : 'outline'}
                    onClick={() => setDeviceView('desktop')}
                    className="flex-1"
                    data-testid="button-desktop"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Desktop
                  </Button>
                  <Button
                    variant={deviceView === 'mobile' ? 'default' : 'outline'}
                    onClick={() => setDeviceView('mobile')}
                    className="flex-1"
                    data-testid="button-mobile"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Mobile
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div
              className={`transition-all duration-300 ${
                deviceView === 'mobile'
                  ? 'max-w-[375px] mx-auto border-x-8 border-y-8 border-gray-800 rounded-3xl overflow-hidden'
                  : 'w-full'
              }`}
            >
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 overflow-auto" style={{ height: deviceView === 'mobile' ? '667px' : 'auto' }}>
                <div className="bg-white dark:bg-gray-800 border-b">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Hubify Portal</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Preview Mode - {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                    </p>
                  </div>
                </div>
                <div className="p-4 sm:p-6 lg:p-8">
                  {renderDashboard()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> This is a preview of the portal interface. The actual portal is accessible at{' '}
            <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">/portal</code> for registered users.
          </p>
        </div>
      </div>
    </div>
  );
}
