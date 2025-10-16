import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SupportModal from "@/components/SupportModal";
import { 
  Calendar, 
  HelpCircle, 
  UserX, 
  Clock,
  ExternalLink,
  BookOpen,
  Lightbulb,
  Users,
  Eye,
  ArrowRight
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

interface CalendarWidgetProps {
  className?: string;
}

export function CalendarWidget({ className }: CalendarWidgetProps) {
  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });
  const orgId = (user as any)?.orgId;

  const { data: events, isLoading } = useQuery({
    queryKey: [`/api/orgs/${orgId}/events`],
    enabled: !!orgId,
  });

  // Detect scheduling conflicts for staff members
  const detectConflicts = (events: any[]) => {
    const conflicts = new Map<string, Set<string>>();
    
    events.forEach((event, index) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const eventStaff = (event.attendees || [])
        .filter((a: any) => a.type === 'user' && a.userId)
        .map((a: any) => a.userId);
      
      if (eventStaff.length === 0) return;
      
      events.forEach((otherEvent, otherIndex) => {
        if (index === otherIndex) return;
        
        const otherStart = new Date(otherEvent.start);
        const otherEnd = new Date(otherEvent.end);
        const otherStaff = (otherEvent.attendees || [])
          .filter((a: any) => a.type === 'user' && a.userId)
          .map((a: any) => a.userId);
        
        const hasTimeOverlap = eventStart < otherEnd && eventEnd > otherStart;
        const hasStaffOverlap = eventStaff.some((staffId: string) => otherStaff.includes(staffId));
        
        if (hasTimeOverlap && hasStaffOverlap) {
          if (!conflicts.has(event.id)) {
            conflicts.set(event.id, new Set());
          }
          conflicts.get(event.id)!.add(otherEvent.id);
        }
      });
    });
    
    return conflicts;
  };

  const allEventsList = events && Array.isArray(events) ? events : [];
  const conflicts = detectConflicts(allEventsList);

  // Get upcoming events (next 3)
  const upcomingEvents = allEventsList
    .filter(event => new Date(event.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 3);

  const getEventColors = (event: any) => {
    if (event.type === 'task') {
      // Task colors based on priority
      if (event.priority === 'urgent') return { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900', subtext: 'text-red-700' };
      if (event.priority === 'high') return { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-900', subtext: 'text-orange-700' };
      return { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-900', subtext: 'text-green-700' };
    }
    // Calendar events use blue
    return { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900', subtext: 'text-blue-700' };
  };

  const formatEventDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE'); // Day name like "Friday"
  };

  const formatEventTime = (dateStr: string, allDay: boolean) => {
    if (allDay) return 'All day';
    return format(parseISO(dateStr), 'h:mm a');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading events...</p>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming events</p>
          ) : (
            upcomingEvents.map((event: any) => {
              const colors = getEventColors(event);
              const hasConflict = conflicts.has(event.id);
              return (
                <div key={event.id} className={`flex items-center justify-between p-3 ${colors.bg} rounded-lg border-l-4 ${colors.border}`}>
                  <div>
                    <p className={`font-medium ${colors.text}`}>{event.title}</p>
                    <p className={`text-sm ${colors.subtext}`}>
                      {hasConflict 
                        ? '⚠️ Conflict' 
                        : event.propertyName || event.location || (event.type === 'task' ? 'Task' : 'Event')
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${colors.text}`}>{formatEventDate(event.start)}</p>
                    <p className={`text-xs ${colors.subtext}`}>{formatEventTime(event.start, event.allDay)}</p>
                  </div>
                </div>
              );
            })
          )}
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = '/calendar'}
            data-testid="button-view-full-calendar"
          >
            <Calendar className="w-4 h-4 mr-2" />
            View Full Calendar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface SupportWidgetProps {
  className?: string;
  externalModalOpen?: boolean;
  onExternalModalChange?: (open: boolean) => void;
}

export function SupportWidget({ className, externalModalOpen, onExternalModalChange }: SupportWidgetProps) {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const isModalOpen = externalModalOpen !== undefined ? externalModalOpen : internalModalOpen;
  const setModalOpen = onExternalModalChange || setInternalModalOpen;

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HelpCircle className="w-5 h-5 mr-2" />
            Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => window.open('https://help.hubifyhomes.app', '_blank')}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Help Documentation
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => window.open('https://help.hubifyhomes.app/videos', '_blank')}
              >
                <Users className="w-4 h-4 mr-2" />
                Training Videos
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => window.open('https://help.hubifyhomes.app/tips', '_blank')}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Tips & Tricks
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3">
              <h4 className="font-medium text-slate-900 mb-1">Quick Tip</h4>
              <p className="text-sm text-slate-600">
                Press "?" to open support, or "T" to quickly add a new task from anywhere.
              </p>
            </div>
            
            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => setModalOpen(true)}
              data-testid="button-contact-support"
            >
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

interface DuplicatesWidgetProps {
  className?: string;
}

export function DuplicatesWidget({ className }: DuplicatesWidgetProps) {
  const [, setLocation] = useLocation();

  const handleReviewContact = (contactName: string) => {
    // Navigate to duplicates management page to review the specific contact duplicate
    setLocation("/duplicates");
  };

  const handleReviewProperty = (propertyAddress: string) => {
    // Navigate to duplicates management page to review the specific property duplicate
    setLocation("/duplicates");
  };

  const handleViewAllDuplicates = () => {
    // Navigate to the dedicated duplicates management page
    setLocation("/duplicates");
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <UserX className="w-5 h-5 mr-2" />
            Duplicates
          </div>
          <Badge variant="secondary">3 found</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
            <div>
              <p className="font-medium text-orange-900">John Smith</p>
              <p className="text-sm text-orange-700">Possible duplicate contact</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleReviewContact("John Smith")}
              className="hover:bg-orange-100"
            >
              <Eye className="w-3 h-3 mr-1" />
              Review
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <div>
              <p className="font-medium text-red-900">456 Oak Street</p>
              <p className="text-sm text-red-700">Similar property address</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleReviewProperty("456 Oak Street")}
              className="hover:bg-red-100"
            >
              <Eye className="w-3 h-3 mr-1" />
              Review
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <div>
              <p className="font-medium text-yellow-900">Sarah Johnson</p>
              <p className="text-sm text-yellow-700">Phone number match</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleReviewContact("Sarah Johnson")}
              className="hover:bg-yellow-100"
            >
              <Eye className="w-3 h-3 mr-1" />
              Review
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full hover:bg-slate-50" 
            onClick={handleViewAllDuplicates}
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            View All Duplicates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}