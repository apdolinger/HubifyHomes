import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckSquare, Calendar, Upload, PlayCircle, StopCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function StaffDashboard() {
  const [isClockedIn, setIsClockedIn] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Staff Dashboard</h2>
        <p className="text-muted-foreground">Manage your tasks, schedule, and time tracking</p>
      </div>

      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white" data-testid="card-time-clock">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Current Status</p>
              <p className="text-2xl font-bold mt-1">
                {isClockedIn ? 'Clocked In' : 'Clocked Out'}
              </p>
              {isClockedIn && (
                <p className="text-sm opacity-90 mt-1">Started at 9:00 AM</p>
              )}
            </div>
            <Button
              size="lg"
              variant={isClockedIn ? 'destructive' : 'secondary'}
              onClick={() => setIsClockedIn(!isClockedIn)}
              data-testid="button-clock-toggle"
            >
              {isClockedIn ? (
                <>
                  <StopCircle className="h-5 w-5 mr-2" />
                  Clock Out
                </>
              ) : (
                <>
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Clock In
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card data-testid="card-tasks">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Tasks</CardTitle>
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Tasks assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Today</span>
                <Badge variant="default" data-testid="badge-today-tasks">5</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">This Week</span>
                <Badge variant="secondary" data-testid="badge-week-tasks">12</Badge>
              </div>
              <Button className="w-full mt-4" data-testid="button-view-tasks">
                View All Tasks
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-schedule">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Schedule</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Your upcoming shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="border-l-2 border-primary pl-3">
                <p className="font-medium text-sm">Today</p>
                <p className="text-xs text-muted-foreground">9:00 AM - 5:00 PM</p>
              </div>
              <div className="border-l-2 border-muted pl-3">
                <p className="font-medium text-sm">Tomorrow</p>
                <p className="text-xs text-muted-foreground">9:00 AM - 5:00 PM</p>
              </div>
              <Button variant="outline" className="w-full mt-4" data-testid="button-view-schedule">
                View Full Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-uploads">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Uploads</CardTitle>
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Upload photos and reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">8</p>
              <p className="text-sm text-muted-foreground">Uploads this week</p>
              <Button className="w-full mt-4" data-testid="button-new-upload">
                Upload Files
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-time-entries">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Time Entries</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardDescription>Recent time tracking entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium text-sm">Property Inspection</p>
                <p className="text-xs text-muted-foreground">Oceanview Residences - Unit 401</p>
              </div>
              <span className="font-semibold">2.5 hrs</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium text-sm">Maintenance Check</p>
                <p className="text-xs text-muted-foreground">Sunset Villas - Building A</p>
              </div>
              <span className="font-semibold">1.5 hrs</span>
            </div>
            <Button variant="link" className="p-0" data-testid="button-view-time-entries">
              View all entries →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
