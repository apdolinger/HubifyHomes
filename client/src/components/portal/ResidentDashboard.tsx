import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Wrench, FileText, MessageSquare, Home, Calendar } from 'lucide-react';

export default function ResidentDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Resident Dashboard</h2>
        <p className="text-muted-foreground">Manage your property, payments, and requests</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card data-testid="card-payments">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payments</CardTitle>
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>View and manage your payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">$1,850.00</p>
              <p className="text-sm text-muted-foreground">Due on Dec 1, 2025</p>
              <Button className="w-full mt-4" data-testid="button-make-payment">
                Make Payment
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-maintenance">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Maintenance</CardTitle>
              <Wrench className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Submit and track requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-muted-foreground">Active requests</p>
              <Button className="w-full mt-4" variant="outline" data-testid="button-new-request">
                New Request
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-documents">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Access your documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">12</p>
              <p className="text-sm text-muted-foreground">Total documents</p>
              <Button className="w-full mt-4" variant="outline" data-testid="button-view-documents">
                View All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-messages">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Messages</CardTitle>
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Recent communications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-l-2 border-primary pl-4">
                <p className="font-medium">Property Manager</p>
                <p className="text-sm text-muted-foreground">Scheduled maintenance next week</p>
                <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
              </div>
              <Button variant="link" className="p-0" data-testid="button-view-messages">
                View all messages →
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-property-info">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Property Info</CardTitle>
              <Home className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Your property details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">Unit 401</p>
              <p className="text-sm text-muted-foreground">Oceanview Residences</p>
              <p className="text-sm text-muted-foreground">Miami Beach, FL</p>
              <Button variant="link" className="p-0 mt-2" data-testid="button-property-details">
                View details →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
