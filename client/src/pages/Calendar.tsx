import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Calendar, Plus, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarPage() {
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const calendarRef = useRef<FullCalendar>(null);

  // Get user's org from session
  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });
  const orgId = (user as any)?.orgId;

  // Fetch calendars
  const { data: calendars, isLoading: calendarsLoading, isError: calendarsError } = useQuery({
    queryKey: ["/api/orgs", orgId, "calendars"],
    enabled: !!orgId,
  });

  // Fetch events
  const { data: events, isLoading: eventsLoading, isError: eventsError } = useQuery({
    queryKey: ["/api/orgs", orgId, "events"],
    enabled: !!orgId,
  });

  const isLoading = calendarsLoading || eventsLoading;
  const hasError = calendarsError || eventsError;

  // Transform events for FullCalendar
  const calendarEvents = (events && Array.isArray(events)) ? events.map((event: any) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: (calendars && Array.isArray(calendars)) ? calendars.find((cal: any) => cal.id === event.calendarId)?.color || "#3b82f6" : "#3b82f6",
    extendedProps: {
      description: event.description,
      location: event.location,
      calendarId: event.calendarId,
    },
  })) : [];

  const handleDateClick = (arg: any) => {
    console.log("Date clicked:", arg.dateStr);
    // TODO: Open event creation modal
  };

  const handleEventClick = (clickInfo: any) => {
    console.log("Event clicked:", clickInfo.event);
    // TODO: Open event details modal
  };

  const handlePrevClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.prev();
  };

  const handleNextClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.next();
  };

  const handleTodayClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.today();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Calendar</h2>
          <p className="text-muted-foreground">There was an error loading your calendar data. Please try refreshing the page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTodayClick}
            data-testid="button-today"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevClick}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextClick}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            data-testid="button-calendar-settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            data-testid="button-create-event"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar with calendars list */}
        <Card className="col-span-3 p-4">
          <h2 className="font-semibold mb-4">My Calendars</h2>
          <div className="space-y-2">
            {calendars && Array.isArray(calendars) && calendars.length > 0 ? (
              calendars.map((calendar: any) => (
                <div
                  key={calendar.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                  data-testid={`calendar-item-${calendar.id}`}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <span className="text-sm">{calendar.name}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No calendars yet</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            data-testid="button-add-calendar"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Calendar
          </Button>
        </Card>

        {/* Main calendar view */}
        <Card className="col-span-9 p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            headerToolbar={{
              left: "",
              center: "title",
              right: "",
            }}
            events={calendarEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            height="auto"
          />
        </Card>
      </div>
    </div>
  );
}
