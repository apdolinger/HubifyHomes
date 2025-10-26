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
  ArrowRight,
  RefreshCw,
  CheckCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

interface CalendarWidgetProps {
  className?: string;
}

interface ColorPreferences {
  events: string;
  taskUrgent: string;
  taskHigh: string;
  taskNormalLow: string;
}

const DEFAULT_COLOR_PREFERENCES: ColorPreferences = {
  events: '#3b82f6',      // Blue
  taskUrgent: '#ef4444',  // Red
  taskHigh: '#f59e0b',    // Orange
  taskNormalLow: '#10b981' // Green
};

export function CalendarWidget({ className }: CalendarWidgetProps) {
  const [, setLocation] = useLocation();
  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });
  const orgId = (user as any)?.orgId;
  const [colorPreferences, setColorPreferences] = useState<ColorPreferences>(DEFAULT_COLOR_PREFERENCES);

  // Load color preferences from localStorage
  useEffect(() => {
    if (!orgId) return;
    
    const stored = localStorage.getItem(`calendar-settings-${orgId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.colorPreferences) {
          // Merge with defaults to handle missing properties
          setColorPreferences({
            ...DEFAULT_COLOR_PREFERENCES,
            ...parsed.colorPreferences
          });
        }
      } catch (e) {
        console.error('Failed to parse calendar settings:', e);
      }
    }
  }, [orgId]);

  const { data: events, isLoading } = useQuery({
    queryKey: [`/api/orgs/${orgId}/events`],
    enabled: !!orgId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true, // Refresh when user returns to tab
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
    // Helper to convert hex color to tailwind-compatible bg/border/text classes
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 59, g: 130, b: 246 }; // default blue
    };

    let color = colorPreferences.events;
    
    if (event.type === 'task') {
      // Task colors based on priority
      if (event.priority === 'urgent') color = colorPreferences.taskUrgent;
      else if (event.priority === 'high') color = colorPreferences.taskHigh;
      else color = colorPreferences.taskNormalLow;
    }

    const rgb = hexToRgb(color);
    
    return {
      bg: '',
      border: '',
      text: '',
      subtext: '',
      customStyle: {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
        borderLeftColor: color,
        color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`
      }
    };
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
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow"
                  style={colors.customStyle}
                  onClick={() => {
                    // Navigate to calendar with the event's date and ID
                    const eventDate = parseISO(event.start);
                    const dateParam = format(eventDate, 'yyyy-MM-dd');
                    const targetUrl = `/calendar?date=${dateParam}&eventId=${event.id}`;
                    window.location.href = targetUrl;
                  }}
                  data-testid={`calendar-event-${event.id}`}
                >
                  <div>
                    <p className="font-medium" style={{ color: colors.customStyle.borderLeftColor }}>{event.title}</p>
                    <p className="text-sm opacity-80">
                      {hasConflict 
                        ? '⚠️ Conflict' 
                        : event.propertyName || event.location || (event.type === 'task' ? 'Task' : 'Event')
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium" style={{ color: colors.customStyle.borderLeftColor }}>{formatEventDate(event.start)}</p>
                    <p className="text-xs opacity-80">{formatEventTime(event.start, event.allDay)}</p>
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

  // Fetch live duplicate data
  const { data: duplicateGroups, isLoading } = useQuery<any[]>({
    queryKey: ['/api/duplicates'],
  });

  const handleViewAllDuplicates = () => {
    setLocation("/duplicates");
  };

  const handleViewDuplicate = (groupId: number) => {
    setLocation(`/duplicates?groupId=${groupId}`);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'bg-red-50 border-red-500 text-red-900';
    if (confidence >= 85) return 'bg-orange-50 border-orange-500 text-orange-900';
    if (confidence >= 70) return 'bg-yellow-50 border-yellow-500 text-yellow-900';
    return 'bg-blue-50 border-blue-500 text-blue-900';
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 95) return 'bg-red-100 text-red-800';
    if (confidence >= 85) return 'bg-orange-100 text-orange-800';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const formatDuplicateLabel = (group: any) => {
    const firstRecord = group.records?.[0];
    if (!firstRecord) return 'Unknown Duplicate';
    
    if (group.type === 'contact') {
      return `${firstRecord.first_name || ''} ${firstRecord.last_name || ''}`.trim() || 'Unknown Contact';
    } else {
      return firstRecord.name || firstRecord.address1 || 'Unknown Property';
    }
  };

  const formatDuplicateSubtext = (group: any) => {
    const matchFields = group.matchFields?.join(', ') || 'similar records';
    return `${group.confidence}% match on ${matchFields}`;
  };

  // Show top 3 duplicates sorted by confidence (clone array to avoid mutating React Query cache)
  const topDuplicates = duplicateGroups
    ? [...duplicateGroups].sort((a, b) => b.confidence - a.confidence).slice(0, 3)
    : [];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <UserX className="w-5 h-5 mr-2" />
            Duplicates
          </div>
          {isLoading ? (
            <Badge variant="secondary" data-testid="badge-duplicates-loading">Loading...</Badge>
          ) : (
            <Badge 
              variant="secondary" 
              className={duplicateGroups && duplicateGroups.length > 0 ? "bg-red-100 text-red-800" : ""}
              data-testid="badge-duplicates-count"
            >
              {duplicateGroups?.length || 0} found
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground" data-testid="duplicates-loading">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            Checking for duplicates...
          </div>
        ) : !duplicateGroups || duplicateGroups.length === 0 ? (
          <div className="text-center py-6" data-testid="duplicates-empty">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">All Clear!</p>
            <p className="text-xs text-gray-500">No duplicate records found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topDuplicates.map((group, idx) => (
              <div 
                key={group.id || idx}
                className={`flex items-center justify-between p-3 rounded-lg border-l-4 cursor-pointer hover:opacity-80 transition-opacity ${getConfidenceColor(group.confidence)}`}
                onClick={() => handleViewDuplicate(group.id)}
                data-testid={`duplicate-item-${idx}`}
              >
                <div className="flex-1">
                  <p className="font-medium">{formatDuplicateLabel(group)}</p>
                  <p className="text-sm opacity-80">{formatDuplicateSubtext(group)}</p>
                  <Badge className={`mt-1 text-xs ${getConfidenceBadgeColor(group.confidence)}`}>
                    {group.records?.length || 0} records
                  </Badge>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDuplicate(group.id);
                  }}
                  className="hover:bg-white/50"
                  data-testid={`button-review-${idx}`}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Review
                </Button>
              </div>
            ))}
            
            {duplicateGroups.length > 3 && (
              <div className="text-center text-sm text-muted-foreground pt-2">
                +{duplicateGroups.length - 3} more duplicate{duplicateGroups.length - 3 !== 1 ? 's' : ''}
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="w-full hover:bg-slate-50 mt-2" 
              onClick={handleViewAllDuplicates}
              data-testid="button-view-all-duplicates"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              View All Duplicates
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface BillingWidgetProps {
  className?: string;
}

export function BillingWidget({ className }: BillingWidgetProps) {
  const [, setLocation] = useLocation();

  // Fetch pending billing submissions with automatic polling every 30 seconds
  const { data: submissions, isLoading } = useQuery<any[]>({
    queryKey: ["/api/billing-submissions", { status: "pending" }],
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the window
  });

  const handleViewAllSubmissions = () => {
    setLocation("/admin?tab=billing");
  };

  const handleViewSubmission = (id: string) => {
    setLocation("/admin?tab=billing");
  };

  const pendingSubmissions = submissions || [];
  const pendingCount = pendingSubmissions.length;
  const recentSubmissions = pendingSubmissions.slice(0, 3);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Billing Queue
          </div>
          {isLoading ? (
            <Badge variant="secondary" data-testid="badge-billing-loading">Loading...</Badge>
          ) : (
            <Badge 
              variant="secondary" 
              className={pendingCount > 0 ? "bg-orange-100 text-orange-800" : ""}
              data-testid="badge-billing-count"
            >
              {pendingCount} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground" data-testid="billing-loading">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading billing submissions...
          </div>
        ) : pendingCount === 0 ? (
          <div className="text-center py-6" data-testid="billing-empty">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">All Caught Up!</p>
            <p className="text-xs text-gray-500">No pending billing submissions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSubmissions.map((submission, idx) => (
              <div 
                key={submission.id || idx}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => handleViewSubmission(submission.id)}
                data-testid={`billing-item-${idx}`}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{submission.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-slate-500">
                      {submission.sourceType === 'task' ? 'Task' : 
                       submission.sourceType === 'time_entry' ? 'Time Entry' : 
                       'Recurring Charge'}
                    </p>
                    <span className="text-xs text-slate-400">•</span>
                    <p className="text-xs font-semibold text-slate-700">
                      ${(submission.amountCents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewSubmission(submission.id);
                  }}
                  className="hover:bg-orange-50"
                  data-testid={`button-review-billing-${idx}`}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Review
                </Button>
              </div>
            ))}
            
            {pendingCount > 3 && (
              <div className="text-center text-sm text-muted-foreground pt-2">
                +{pendingCount - 3} more submission{pendingCount - 3 !== 1 ? 's' : ''}
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="w-full hover:bg-slate-50 mt-2" 
              onClick={handleViewAllSubmissions}
              data-testid="button-view-all-billing"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Review All Submissions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}