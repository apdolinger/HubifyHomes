import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, FileText, CheckCircle, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function VendorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Vendor Dashboard</h2>
        <p className="text-muted-foreground">Manage work orders, invoices, and job completion</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-active-jobs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">In progress</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-jobs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting start</p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed-jobs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card data-testid="card-revenue">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$8,450</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-work-orders">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Work Orders</CardTitle>
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Active and pending assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start justify-between border-b pb-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">HVAC Repair</p>
                  <p className="text-xs text-muted-foreground">Oceanview Residences - Unit 401</p>
                  <p className="text-xs text-muted-foreground">Due: Dec 5, 2025</p>
                </div>
                <Badge variant="default" data-testid="badge-urgent">Urgent</Badge>
              </div>
              <div className="flex items-start justify-between border-b pb-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Plumbing Service</p>
                  <p className="text-xs text-muted-foreground">Sunset Villas - Building A</p>
                  <p className="text-xs text-muted-foreground">Due: Dec 8, 2025</p>
                </div>
                <Badge variant="secondary" data-testid="badge-scheduled">Scheduled</Badge>
              </div>
              <Button className="w-full" data-testid="button-view-work-orders">
                View All Work Orders
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-invoices">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invoices</CardTitle>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Recent invoicing activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium text-sm">Invoice #1234</p>
                  <p className="text-xs text-muted-foreground">HVAC Repair - Unit 401</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">$850.00</p>
                  <Badge variant="outline" className="text-xs" data-testid="badge-pending-invoice">Pending</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium text-sm">Invoice #1233</p>
                  <p className="text-xs text-muted-foreground">Pool Maintenance</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">$450.00</p>
                  <Badge variant="default" className="bg-green-500 text-xs" data-testid="badge-paid-invoice">Paid</Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full" data-testid="button-create-invoice">
                Create New Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-job-completion">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Job Completion</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardDescription>Mark jobs as complete and submit reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Pool Cleaning Service</p>
                <p className="text-sm text-muted-foreground">Oceanview Residences - Pool Area</p>
                <p className="text-xs text-muted-foreground mt-1">Started: 2 hours ago</p>
              </div>
              <Button data-testid="button-complete-job">
                Complete Job
              </Button>
            </div>
            <Button variant="link" className="p-0" data-testid="button-view-job-history">
              View job history →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
