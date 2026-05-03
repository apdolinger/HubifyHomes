import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Monitor, Eye, Building2, CheckSquare, Receipt, FileText } from 'lucide-react';

type DeviceView = 'desktop' | 'mobile';

const SECTIONS = [
  { icon: Building2, title: 'My Properties', desc: 'Properties linked to the portal user.' },
  { icon: CheckSquare, title: 'My Tasks', desc: 'Open tasks at the user’s properties.' },
  { icon: Receipt, title: 'My Invoices', desc: 'Non-draft invoices for the user’s client.' },
  { icon: FileText, title: 'Documents', desc: 'Community documents shared with the user.' },
];

export default function PortalPreview() {
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye className="h-8 w-8" />
            Portal Preview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Preview of the four sections shown to clients on `/portal` after sign-in.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Preview Controls</CardTitle>
            <CardDescription>Toggle the device frame</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 max-w-sm">
              <Button
                variant={deviceView === 'desktop' ? 'default' : 'outline'}
                onClick={() => setDeviceView('desktop')}
                className="flex-1"
                data-testid="button-desktop"
              >
                <Monitor className="h-4 w-4 mr-2" /> Desktop
              </Button>
              <Button
                variant={deviceView === 'mobile' ? 'default' : 'outline'}
                onClick={() => setDeviceView('mobile')}
                className="flex-1"
                data-testid="button-mobile"
              >
                <Smartphone className="h-4 w-4 mr-2" /> Mobile
              </Button>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">Preview Mode</p>
                  </div>
                </div>
                <div className="p-4 sm:p-6 lg:p-8 grid gap-4 md:grid-cols-2">
                  {SECTIONS.map((s) => (
                    <Card key={s.title}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{s.title}</CardTitle>
                          <s.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{s.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> This is a static preview. The live client portal at{' '}
            <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">/portal</code> renders real data for the
            authenticated portal user.
          </p>
        </div>
      </div>
    </div>
  );
}
