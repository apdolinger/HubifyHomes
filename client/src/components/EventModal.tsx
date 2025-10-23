import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, AlignLeft, Users, Link as LinkIcon, X, Mail, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertEventSchema, type Event, type EventAttendee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
  event?: Event | null;
  defaultDate?: Date;
  defaultCalendarId?: string;
}

const formSchema = insertEventSchema.extend({
  start: z.string().min(1, "Start date and time is required"),
  end: z.string().min(1, "End date and time is required"),
}).refine(
  (data) => {
    const start = new Date(data.start);
    const end = new Date(data.end);
    // For all-day events, allow same day (end >= start)
    // For timed events, require end > start
    return data.allDay ? end >= start : end > start;
  },
  {
    message: "End time must be after start time",
    path: ["end"],
  }
);

type FormData = z.infer<typeof formSchema>;

type Attendee = {
  id: string;
  type: 'user' | 'client' | 'external';
  userId?: string;
  clientId?: string;
  email?: string;
  name?: string;
};

export function EventModal({
  open,
  onClose,
  orgId,
  userId,
  event,
  defaultDate,
  defaultCalendarId,
}: EventModalProps) {
  const { toast } = useToast();
  const isEditing = !!event;
  
  // Attendees state
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeeType, setAttendeeType] = useState<'user' | 'client' | 'external'>('user');
  const [externalEmail, setExternalEmail] = useState('');
  const [externalName, setExternalName] = useState('');

  // Fetch calendars for the dropdown
  const { data: calendars } = useQuery({
    queryKey: [`/api/orgs/${orgId}/calendars`],
    enabled: !!orgId && open,
  });

  // Fetch properties for linking
  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
    enabled: open,
  });

  // Fetch tasks for linking
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: open,
  });

  // Fetch clients for linking
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    enabled: open,
  });

  // Fetch team users for attendees
  const { data: teamUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: open,
  });

  // Fetch existing attendees when editing
  const { data: existingAttendees } = useQuery<EventAttendee[]>({
    queryKey: [`/api/orgs/${orgId}/events/${event?.id}/attendees`],
    enabled: open && !!event?.id,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orgId,
      calendarId: defaultCalendarId || "",
      title: "",
      description: "" as string | null,
      location: "" as string | null,
      allDay: false,
      start: defaultDate ? format(defaultDate, "yyyy-MM-dd'T'HH:mm") : "",
      end: defaultDate ? format(new Date(defaultDate.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm") : "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      visibility: "org" as string | null,
      organizerId: userId,
      createdById: userId,
      propertyId: undefined,
      taskId: undefined,
      clientId: undefined,
      recurrenceRule: null,
      recurrenceExDates: null,
    },
  });

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      form.reset({
        orgId: event.orgId,
        calendarId: event.calendarId,
        title: event.title,
        description: (event.description || "") as string | null,
        location: (event.location || "") as string | null,
        allDay: event.allDay ?? false,
        start: event.start ? format(new Date(event.start), "yyyy-MM-dd'T'HH:mm") : "",
        end: event.end ? format(new Date(event.end), "yyyy-MM-dd'T'HH:mm") : "",
        timezone: event.timezone || "UTC",
        visibility: (event.visibility || "org") as string | null,
        organizerId: event.organizerId,
        createdById: event.createdById,
        propertyId: event.propertyId || undefined,
        taskId: event.taskId || undefined,
        clientId: event.clientId || undefined,
        recurrenceRule: event.recurrenceRule || null,
        recurrenceExDates: event.recurrenceExDates || null,
      });
    } else {
      form.reset({
        orgId,
        calendarId: defaultCalendarId || "",
        title: "",
        description: "" as string | null,
        location: "" as string | null,
        allDay: false,
        start: defaultDate ? format(defaultDate, "yyyy-MM-dd'T'HH:mm") : "",
        end: defaultDate ? format(new Date(defaultDate.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm") : "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        visibility: "org" as string | null,
        organizerId: userId,
        createdById: userId,
        propertyId: undefined,
        taskId: undefined,
        clientId: undefined,
        recurrenceRule: null,
        recurrenceExDates: null,
      });
    }

    // Load existing attendees when editing
    if (event && existingAttendees) {
      const mappedAttendees: Attendee[] = existingAttendees.map(ea => ({
        id: ea.id.toString(),
        type: ea.type as 'user' | 'client' | 'external',
        userId: ea.userId || undefined,
        clientId: ea.clientId || undefined,
        email: ea.email || undefined,
        name: ea.name || undefined,
      }));
      setAttendees(mappedAttendees);
    } else if (!event && open) {
      setAttendees([]);
      setExternalEmail('');
      setExternalName('');
    }
  }, [event, orgId, userId, defaultDate, defaultCalendarId, existingAttendees, form, open]);

  const createEventMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Normalize dates for all-day events to avoid timezone issues
      let startDate, endDate;
      if (data.allDay) {
        // For all-day events, use date-only and set to start of day in local time
        startDate = new Date(data.start);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(data.end);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(data.start);
        endDate = new Date(data.end);
      }

      const payload = {
        ...data,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        description: data.description?.trim() || null,
        location: data.location?.trim() || null,
        propertyId: data.propertyId || null,
        taskId: data.taskId || null,
        clientId: data.clientId || null,
      };
      const response = await apiRequest("POST", `/api/orgs/${orgId}/events`, payload);
      const newEvent = await response.json();
      
      // Save attendees
      if (attendees.length > 0 && newEvent?.id) {
        await Promise.all(
          attendees.map(attendee =>
            apiRequest("POST", `/api/orgs/${orgId}/events/${newEvent.id}/attendees`, {
              eventId: newEvent.id,
              type: attendee.type,
              userId: attendee.userId || null,
              clientId: attendee.clientId || null,
              email: attendee.email || null,
              name: attendee.name || null,
              responseStatus: "needsAction",
              isOptional: false,
              notifyByEmail: true,
            })
          )
        );
      }
      
      return newEvent;
    },
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/events`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/events/${newEvent.id}/attendees`] });
      toast({
        title: "Event created",
        description: "Your event has been created successfully.",
      });
      setAttendees([]);
      setExternalEmail('');
      setExternalName('');
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Normalize dates for all-day events to avoid timezone issues
      let startDate, endDate;
      if (data.allDay) {
        // For all-day events, use date-only and set to start of day in local time
        startDate = new Date(data.start);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(data.end);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(data.start);
        endDate = new Date(data.end);
      }

      const payload = {
        ...data,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        description: data.description?.trim() || null,
        location: data.location?.trim() || null,
        propertyId: data.propertyId || null,
        taskId: data.taskId || null,
        clientId: data.clientId || null,
      };
      const response = await apiRequest("PATCH", `/api/orgs/${orgId}/events/${event?.id}`, payload);
      const updatedEvent = await response.json();
      
      // Reconcile attendees: delete removed ones and add new ones
      if (event?.id) {
        const existingAttendeesData = existingAttendees || [];
        
        // Find attendees to delete (in existing but not in current)
        const attendeesToDelete = existingAttendeesData.filter(ea => 
          !attendees.find(a => 
            (a.userId && a.userId === ea.userId) ||
            (a.clientId && a.clientId === ea.clientId) ||
            (a.email && a.email === ea.email)
          )
        );
        
        // Delete removed attendees
        if (attendeesToDelete.length > 0) {
          await Promise.all(
            attendeesToDelete.map(ea =>
              apiRequest("DELETE", `/api/orgs/${orgId}/events/${event.id}/attendees/${ea.id}`)
            )
          );
        }
        
        // Find attendees to add (in current but not in existing)
        const attendeesToAdd = attendees.filter(a => 
          !existingAttendeesData.find(ea =>
            (a.userId && a.userId === ea.userId) ||
            (a.clientId && a.clientId === ea.clientId) ||
            (a.email && a.email === ea.email)
          )
        );
        
        // Add new attendees
        if (attendeesToAdd.length > 0) {
          await Promise.all(
            attendeesToAdd.map(attendee =>
              apiRequest("POST", `/api/orgs/${orgId}/events/${event.id}/attendees`, {
                eventId: event.id,
                type: attendee.type,
                userId: attendee.userId || null,
                clientId: attendee.clientId || null,
                email: attendee.email || null,
                name: attendee.name || null,
                responseStatus: "needsAction",
                isOptional: false,
                notifyByEmail: true,
              })
            )
          );
        }
      }
      
      return updatedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/events`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/events/${event?.id}/attendees`] });
      toast({
        title: "Event updated",
        description: "Your event has been updated successfully.",
      });
      setAttendees([]);
      setExternalEmail('');
      setExternalName('');
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateEventMutation.mutate(data);
    } else {
      createEventMutation.mutate(data);
    }
  };

  const isPending = createEventMutation.isPending || updateEventMutation.isPending;

  const handleClose = () => {
    setAttendees([]);
    setExternalEmail('');
    setExternalName('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-event">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">
            {isEditing ? "Edit Event" : "Create Event"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the event details below." : "Fill in the details to create a new event."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Team meeting, Property inspection, etc."
                      data-testid="input-event-title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Calendar Selection */}
            <FormField
              control={form.control}
              name="calendarId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Calendar *
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger data-testid="select-calendar">
                        <SelectValue placeholder="Select a calendar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {calendars && Array.isArray(calendars) && (calendars as any[]).map((calendar: any) => (
                        <SelectItem key={calendar.id} value={calendar.id} data-testid={`select-calendar-${calendar.id}`}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: calendar.color || "#3b82f6" }}
                            />
                            {calendar.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* All Day Toggle */}
            <FormField
              control={form.control}
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>All Day Event</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      data-testid="switch-all-day"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Start Date/Time */}
            <FormField
              control={form.control}
              name="start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Start Date & Time *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type={form.watch("allDay") ? "date" : "datetime-local"}
                      data-testid="input-start-datetime"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Date/Time */}
            <FormField
              control={form.control}
              name="end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    End Date & Time *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type={form.watch("allDay") ? "date" : "datetime-local"}
                      data-testid="input-end-datetime"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Add location"
                      data-testid="input-location"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <AlignLeft className="h-4 w-4" />
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add event description..."
                      className="min-h-[100px]"
                      data-testid="input-description"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visibility */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Visibility
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger data-testid="select-visibility">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="private">Private (Only me)</SelectItem>
                      <SelectItem value="org">Organization</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Links Section */}
            <div className="space-y-3 pt-4 border-t">
              <FormLabel className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Link to Property, Task, or Client
              </FormLabel>

              {/* Property Link */}
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                      value={field.value?.toString() || "none"}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-property">
                          <SelectValue placeholder="Link to property (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No property</SelectItem>
                        {properties && Array.isArray(properties) && (properties as any[]).map((property: any) => (
                          <SelectItem key={property.id} value={property.id.toString()}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Task Link */}
              <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                      value={field.value?.toString() || "none"}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-task">
                          <SelectValue placeholder="Link to task (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No task</SelectItem>
                        {tasks && Array.isArray(tasks) && (tasks as any[]).map((task: any) => (
                          <SelectItem key={task.id} value={task.id.toString()}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Client Link */}
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                      value={field.value || "none"}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-client">
                          <SelectValue placeholder="Link to client (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No client</SelectItem>
                        {clients && Array.isArray(clients) && (clients as any[]).map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.firstName} {client.lastName} ({client.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Attendees Section */}
            <div className="space-y-3 pt-4 border-t">
              <FormLabel className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Event Attendees
              </FormLabel>

              {/* Display current attendees */}
              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attendees.map((attendee) => (
                    <Badge key={attendee.id} variant="secondary" className="flex items-center gap-1">
                      {attendee.type === 'user' && (
                        <>
                          <Users className="h-3 w-3" />
                          {(teamUsers as any[])?.find((u: any) => u.id === attendee.userId)?.firstName} {(teamUsers as any[])?.find((u: any) => u.id === attendee.userId)?.lastName}
                        </>
                      )}
                      {attendee.type === 'client' && (
                        <>
                          <Users className="h-3 w-3" />
                          {(clients as any[])?.find((c: any) => c.id === attendee.clientId)?.firstName} {(clients as any[])?.find((c: any) => c.id === attendee.clientId)?.lastName}
                        </>
                      )}
                      {attendee.type === 'external' && (
                        <>
                          <Mail className="h-3 w-3" />
                          {attendee.name || attendee.email}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setAttendees(attendees.filter(a => a.id !== attendee.id))}
                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add attendee controls */}
              <div className="space-y-3">
                <Select value={attendeeType} onValueChange={(value: any) => setAttendeeType(value)} disabled={isPending}>
                  <SelectTrigger data-testid="select-attendee-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Team Member</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="external">External Email</SelectItem>
                  </SelectContent>
                </Select>

                {attendeeType === 'user' && (
                  <Select
                    onValueChange={(value) => {
                      const user = (teamUsers as any[])?.find((u: any) => u.id === value);
                      if (user && !attendees.find(a => a.userId === value)) {
                        setAttendees([...attendees, {
                          id: `temp-${Date.now()}`,
                          type: 'user',
                          userId: user.id,
                          email: user.email,
                          name: `${user.firstName} ${user.lastName}`,
                        }]);
                      }
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger data-testid="select-team-member">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamUsers && Array.isArray(teamUsers) && (teamUsers as any[]).filter(Boolean).map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {attendeeType === 'client' && (
                  <Select
                    onValueChange={(value) => {
                      const client = (clients as any[])?.find((c: any) => c.id === value);
                      if (client && !attendees.find(a => a.clientId === value)) {
                        setAttendees([...attendees, {
                          id: `temp-${Date.now()}`,
                          type: 'client',
                          clientId: client.id,
                          email: client.email,
                          name: `${client.firstName} ${client.lastName}`,
                        }]);
                      }
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger data-testid="select-client-attendee">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients && Array.isArray(clients) && (clients as any[]).filter(Boolean).map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.firstName} {client.lastName} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {attendeeType === 'external' && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Name"
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      disabled={isPending}
                      data-testid="input-external-name"
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={externalEmail}
                      onChange={(e) => setExternalEmail(e.target.value)}
                      disabled={isPending}
                      data-testid="input-external-email"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (externalEmail && !attendees.find(a => a.email === externalEmail)) {
                          setAttendees([...attendees, {
                            id: `temp-${Date.now()}`,
                            type: 'external',
                            email: externalEmail,
                            name: externalName || externalEmail,
                          }]);
                          setExternalEmail('');
                          setExternalName('');
                        }
                      }}
                      disabled={!externalEmail || isPending}
                      data-testid="button-add-external"
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-event">
                {isPending ? "Saving..." : isEditing ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
