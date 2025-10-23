import { useEffect, useState, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { Calendar, Clock, MapPin, AlignLeft, Users, Link as LinkIcon, X, Mail, UserPlus, ChevronsUpDown, Check, ExternalLink, Plus, Repeat } from "lucide-react";
import { RRule, Frequency } from "rrule";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

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
  
  // Property combobox state
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [showQuickAddProperty, setShowQuickAddProperty] = useState(false);
  const [quickPropertyName, setQuickPropertyName] = useState('');
  const [quickPropertyAddress, setQuickPropertyAddress] = useState('');
  const [quickPropertyCity, setQuickPropertyCity] = useState('');
  const [quickPropertyState, setQuickPropertyState] = useState('');
  const [quickPropertyZip, setQuickPropertyZip] = useState('');
  
  // Task combobox state
  const [taskOpen, setTaskOpen] = useState(false);
  const [showQuickAddTask, setShowQuickAddTask] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDescription, setQuickTaskDescription] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal');
  
  // Client combobox state
  const [clientOpen, setClientOpen] = useState(false);
  
  // Team member attendee combobox state
  const [teamMemberAttendeeOpen, setTeamMemberAttendeeOpen] = useState(false);
  
  // Client attendee combobox state
  const [clientAttendeeOpen, setClientAttendeeOpen] = useState(false);
  
  // Email preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  
  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceByWeekday, setRecurrenceByWeekday] = useState<number[]>([]);
  const [recurrenceByMonthday, setRecurrenceByMonthday] = useState<number[]>([]);
  const [recurrenceBySetPos, setRecurrenceBySetPos] = useState<number | null>(null);
  const [recurrenceByMonth, setRecurrenceByMonth] = useState<number[]>([]);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'after' | 'on'>('never');
  const [recurrenceCount, setRecurrenceCount] = useState(10);
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  
  // Ref for property combobox scrolling
  const propertyListRef = useRef<HTMLDivElement>(null);

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
  
  // Watch propertyId to filter tasks
  const selectedPropertyId = form.watch('propertyId');
  
  // Filter tasks by selected property
  const filteredTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    
    // If no property selected, show all tasks
    if (!selectedPropertyId) return tasks as any[];
    
    // Filter tasks by selected property
    return (tasks as any[]).filter((task: any) => task.propertyId === selectedPropertyId);
  }, [tasks, selectedPropertyId]);

  // Parse RRULE string and populate recurrence state
  const parseRRule = (rruleString: string) => {
    try {
      const rule = RRule.fromString(`RRULE:${rruleString}`);
      const options = rule.options;
      
      setIsRecurring(true);
      
      // Set frequency
      if (options.freq === Frequency.DAILY) setRecurrenceFreq('daily');
      else if (options.freq === Frequency.WEEKLY) setRecurrenceFreq('weekly');
      else if (options.freq === Frequency.MONTHLY) setRecurrenceFreq('monthly');
      else if (options.freq === Frequency.YEARLY) setRecurrenceFreq('yearly');
      
      // Set interval
      setRecurrenceInterval(options.interval || 1);
      
      // Set weekdays (handle both single and array values)
      // Also extract position from Weekday objects with 'n' property
      let extractedSetPos: number | null = null;
      
      if (options.byweekday) {
        const weekdayArray = Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday];
        const weekdays = weekdayArray.map((wd: any) => {
          if (typeof wd === 'number') return wd;
          // Handle Weekday objects from RRule
          if (typeof wd === 'object' && 'weekday' in wd) {
            // Extract position if present (e.g., "first Monday" = {weekday: 0, n: 1})
            if ('n' in wd && wd.n !== undefined && wd.n !== null) {
              extractedSetPos = wd.n;
            }
            return wd.weekday;
          }
          return wd;
        });
        setRecurrenceByWeekday(weekdays);
      } else {
        setRecurrenceByWeekday([]);
      }
      
      // Set month days
      if (options.bymonthday) {
        setRecurrenceByMonthday(Array.isArray(options.bymonthday) ? options.bymonthday : [options.bymonthday]);
      } else {
        setRecurrenceByMonthday([]);
      }
      
      // Set position (first, second, last, etc.)
      // Prefer extracted position from Weekday.n over explicit BYSETPOS
      if (extractedSetPos !== null) {
        setRecurrenceBySetPos(extractedSetPos);
      } else if (options.bysetpos) {
        const pos = Array.isArray(options.bysetpos) ? options.bysetpos[0] : options.bysetpos;
        setRecurrenceBySetPos(pos);
      } else {
        setRecurrenceBySetPos(null);
      }
      
      // Set months
      if (options.bymonth) {
        setRecurrenceByMonth(Array.isArray(options.bymonth) ? options.bymonth : [options.bymonth]);
      } else {
        setRecurrenceByMonth([]);
      }
      
      // Set end type
      if (options.count) {
        setRecurrenceEndType('after');
        setRecurrenceCount(options.count);
      } else if (options.until) {
        setRecurrenceEndType('on');
        setRecurrenceUntil(format(new Date(options.until), 'yyyy-MM-dd'));
      } else {
        setRecurrenceEndType('never');
      }
    } catch (error) {
      console.error('Failed to parse RRULE:', error);
    }
  };

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      // For all-day events, use date-only format; for timed events, use datetime format
      const dateFormat = event.allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm";
      
      form.reset({
        orgId: event.orgId,
        calendarId: event.calendarId,
        title: event.title,
        description: (event.description || "") as string | null,
        location: (event.location || "") as string | null,
        allDay: event.allDay ?? false,
        start: event.start ? format(new Date(event.start), dateFormat) : "",
        end: event.end ? format(new Date(event.end), dateFormat) : "",
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
      
      // Parse and populate recurrence state if exists
      if (event.recurrenceRule) {
        parseRRule(event.recurrenceRule);
      } else {
        setIsRecurring(false);
      }
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
      
      // Reset recurrence state
      setIsRecurring(false);
      setRecurrenceFreq('weekly');
      setRecurrenceInterval(1);
      setRecurrenceByWeekday([]);
      setRecurrenceByMonthday([]);
      setRecurrenceBySetPos(null);
      setRecurrenceByMonth([]);
      setRecurrenceEndType('never');
      setRecurrenceCount(10);
      setRecurrenceUntil('');
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

  // Watch allDay field and convert date format when it changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'allDay') {
        const currentStart = form.getValues('start');
        const currentEnd = form.getValues('end');
        
        if (currentStart) {
          if (value.allDay) {
            // Converting to all-day: extract date only (YYYY-MM-DD)
            const startDate = currentStart.split('T')[0];
            form.setValue('start', startDate);
          } else {
            // Converting to timed: add default time
            if (!currentStart.includes('T')) {
              form.setValue('start', `${currentStart}T09:00`);
            }
          }
        }
        
        if (currentEnd) {
          if (value.allDay) {
            // Converting to all-day: extract date only (YYYY-MM-DD)
            const endDate = currentEnd.split('T')[0];
            form.setValue('end', endDate);
          } else {
            // Converting to timed: add default time
            if (!currentEnd.includes('T')) {
              form.setValue('end', `${currentEnd}T10:00`);
            }
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

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

      // Build payload object with only the fields that should be updated
      const payload: any = {
        title: data.title,
        calendarId: data.calendarId,
        allDay: data.allDay,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        timezone: data.timezone,
        visibility: data.visibility,
      };
      
      // Only include optional fields if they have values
      if (data.description?.trim()) {
        payload.description = data.description.trim();
      } else {
        payload.description = null;
      }
      
      if (data.location?.trim()) {
        payload.location = data.location.trim();
      } else {
        payload.location = null;
      }
      
      if (data.propertyId) {
        payload.propertyId = data.propertyId;
      } else {
        payload.propertyId = null;
      }
      
      if (data.taskId) {
        payload.taskId = data.taskId;
      } else {
        payload.taskId = null;
      }
      
      if (data.clientId) {
        payload.clientId = data.clientId;
      } else {
        payload.clientId = null;
      }
      
      if (data.recurrenceRule) {
        payload.recurrenceRule = data.recurrenceRule;
      } else {
        payload.recurrenceRule = null;
      }
      
      if (data.recurrenceExDates && data.recurrenceExDates.length > 0) {
        payload.recurrenceExDates = data.recurrenceExDates;
      } else {
        payload.recurrenceExDates = null;
      }
      
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

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      if (!event?.id) throw new Error("No event to delete");
      await apiRequest("DELETE", `/api/orgs/${orgId}/events/${event.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/events`] });
      toast({
        title: "Event deleted",
        description: "The event has been deleted successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      deleteEventMutation.mutate();
    }
  };

  const quickAddPropertyMutation = useMutation({
    mutationFn: async (propertyData: {
      name: string;
      address1: string;
      city: string;
      state: string;
      zip: string;
    }) => {
      const response = await apiRequest("POST", "/api/properties", {
        ...propertyData,
        type: "single-family",
        status: "occupied",
        units: 1,
      });
      return response.json();
    },
    onSuccess: (newProperty) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property added",
        description: `"${newProperty.name}" has been added successfully.`,
      });
      // Auto-select the new property
      form.setValue('propertyId', newProperty.id);
      // Reset quick add form
      setQuickPropertyName('');
      setQuickPropertyAddress('');
      setQuickPropertyCity('');
      setQuickPropertyState('');
      setQuickPropertyZip('');
      setShowQuickAddProperty(false);
      setPropertyOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add property",
        variant: "destructive",
      });
    },
  });

  const handleQuickAddProperty = () => {
    if (!quickPropertyName || !quickPropertyAddress || !quickPropertyCity || !quickPropertyState || !quickPropertyZip) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (quickPropertyState.length !== 2) {
      toast({
        title: "Invalid state",
        description: "State must be 2 characters (e.g., CA, NY)",
        variant: "destructive",
      });
      return;
    }
    
    if (quickPropertyZip.length < 5) {
      toast({
        title: "Invalid ZIP",
        description: "ZIP code must be at least 5 characters",
        variant: "destructive",
      });
      return;
    }

    quickAddPropertyMutation.mutate({
      name: quickPropertyName,
      address1: quickPropertyAddress,
      city: quickPropertyCity,
      state: quickPropertyState.toUpperCase(),
      zip: quickPropertyZip,
    });
  };

  const quickAddTaskMutation = useMutation({
    mutationFn: async (taskData: {
      title: string;
      description?: string;
      priority: 'urgent' | 'high' | 'normal' | 'low';
      propertyId?: number;
    }) => {
      const response = await apiRequest("POST", "/api/tasks", taskData);
      return response.json();
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task added",
        description: `"${newTask.title}" has been added successfully.`,
      });
      // Auto-select the new task
      form.setValue('taskId', newTask.id);
      // Reset quick add form
      setQuickTaskTitle('');
      setQuickTaskDescription('');
      setQuickTaskPriority('normal');
      setShowQuickAddTask(false);
      setTaskOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add task",
        variant: "destructive",
      });
    },
  });

  const handleQuickAddTask = () => {
    if (!quickTaskTitle) {
      toast({
        title: "Missing title",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    quickAddTaskMutation.mutate({
      title: quickTaskTitle,
      description: quickTaskDescription || undefined,
      priority: quickTaskPriority,
      propertyId: selectedPropertyId || undefined,
    });
  };

  const generateRRule = () => {
    if (!isRecurring) return null;
    
    const startDate = new Date(form.getValues('start'));
    
    const options: any = {
      freq: recurrenceFreq === 'daily' ? Frequency.DAILY :
            recurrenceFreq === 'weekly' ? Frequency.WEEKLY :
            recurrenceFreq === 'monthly' ? Frequency.MONTHLY :
            Frequency.YEARLY,
      interval: recurrenceInterval,
      dtstart: startDate,
    };
    
    if (recurrenceByWeekday.length > 0) {
      options.byweekday = recurrenceByWeekday.map(day => day === 0 ? RRule.SU : 
                                                         day === 1 ? RRule.MO :
                                                         day === 2 ? RRule.TU :
                                                         day === 3 ? RRule.WE :
                                                         day === 4 ? RRule.TH :
                                                         day === 5 ? RRule.FR : RRule.SA);
    }
    
    if (recurrenceByMonthday.length > 0) {
      options.bymonthday = recurrenceByMonthday;
    }
    
    if (recurrenceBySetPos !== null && recurrenceByWeekday.length > 0) {
      options.bysetpos = recurrenceBySetPos;
    }
    
    if (recurrenceByMonth.length > 0) {
      options.bymonth = recurrenceByMonth;
    }
    
    if (recurrenceEndType === 'after') {
      options.count = recurrenceCount;
    } else if (recurrenceEndType === 'on' && recurrenceUntil) {
      options.until = new Date(recurrenceUntil);
    }
    
    const rule = new RRule(options);
    return rule.toString().replace('RRULE:', '');
  };

  const onSubmit = (data: FormData) => {
    const rruleString = generateRRule();
    const submissionData = {
      ...data,
      recurrenceRule: rruleString,
    };
    
    if (isEditing) {
      updateEventMutation.mutate(submissionData);
    } else {
      createEventMutation.mutate(submissionData);
    }
  };

  const isPending = createEventMutation.isPending || updateEventMutation.isPending || quickAddPropertyMutation.isPending || quickAddTaskMutation.isPending;

  const handleClose = () => {
    setAttendees([]);
    setExternalEmail('');
    setExternalName('');
    onClose();
  };

  return (
    <>
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
                    Calendar
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={isPending}>
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

            {/* Recurring Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Recurring Event
                </label>
                <p className="text-xs text-muted-foreground">
                  Event repeats on a schedule
                </p>
              </div>
              <Switch
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
                data-testid="switch-recurring"
              />
            </div>

            {/* Recurrence Options */}
            {isRecurring && (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Frequency</label>
                    <Select value={recurrenceFreq} onValueChange={(value: any) => setRecurrenceFreq(value)}>
                      <SelectTrigger data-testid="select-recurrence-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Repeat Every</label>
                    <Input
                      type="number"
                      min={1}
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                      data-testid="input-recurrence-interval"
                    />
                  </div>
                </div>

                {/* Weekly: Day Selection */}
                {recurrenceFreq === 'weekly' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Repeat On</label>
                    <div className="flex gap-2 flex-wrap">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant={recurrenceByWeekday.includes(index) ? "default" : "outline"}
                          size="sm"
                          className="w-10 h-10 p-0"
                          onClick={() => {
                            setRecurrenceByWeekday(prev =>
                              prev.includes(index)
                                ? prev.filter(d => d !== index)
                                : [...prev, index]
                            );
                          }}
                          data-testid={`button-weekday-${index}`}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monthly: Week and Day Selection */}
                {recurrenceFreq === 'monthly' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Repeat By</label>
                      <Select
                        value={recurrenceBySetPos !== null ? 'position' : 'day'}
                        onValueChange={(value) => {
                          if (value === 'day') {
                            setRecurrenceBySetPos(null);
                            setRecurrenceByWeekday([]);
                          } else {
                            setRecurrenceByMonthday([]);
                          }
                        }}
                      >
                        <SelectTrigger data-testid="select-monthly-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Day of Month</SelectItem>
                          <SelectItem value="position">Week of Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {recurrenceBySetPos === null ? (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Day of Month</label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          placeholder="e.g., 15"
                          value={recurrenceByMonthday[0] || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setRecurrenceByMonthday(val ? [val] : []);
                          }}
                          data-testid="input-monthday"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Week</label>
                          <Select
                            value={recurrenceBySetPos?.toString()}
                            onValueChange={(value) => setRecurrenceBySetPos(parseInt(value))}
                          >
                            <SelectTrigger data-testid="select-week-position">
                              <SelectValue placeholder="Select week" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">First</SelectItem>
                              <SelectItem value="2">Second</SelectItem>
                              <SelectItem value="3">Third</SelectItem>
                              <SelectItem value="4">Fourth</SelectItem>
                              <SelectItem value="-1">Last</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Day</label>
                          <Select
                            value={recurrenceByWeekday[0]?.toString()}
                            onValueChange={(value) => setRecurrenceByWeekday([parseInt(value)])}
                          >
                            <SelectTrigger data-testid="select-weekday">
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sunday</SelectItem>
                              <SelectItem value="1">Monday</SelectItem>
                              <SelectItem value="2">Tuesday</SelectItem>
                              <SelectItem value="3">Wednesday</SelectItem>
                              <SelectItem value="4">Thursday</SelectItem>
                              <SelectItem value="5">Friday</SelectItem>
                              <SelectItem value="6">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Yearly: Month and Day Selection */}
                {recurrenceFreq === 'yearly' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Month</label>
                      <Select
                        value={recurrenceByMonth[0]?.toString()}
                        onValueChange={(value) => setRecurrenceByMonth([parseInt(value)])}
                      >
                        <SelectTrigger data-testid="select-month">
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">January</SelectItem>
                          <SelectItem value="2">February</SelectItem>
                          <SelectItem value="3">March</SelectItem>
                          <SelectItem value="4">April</SelectItem>
                          <SelectItem value="5">May</SelectItem>
                          <SelectItem value="6">June</SelectItem>
                          <SelectItem value="7">July</SelectItem>
                          <SelectItem value="8">August</SelectItem>
                          <SelectItem value="9">September</SelectItem>
                          <SelectItem value="10">October</SelectItem>
                          <SelectItem value="11">November</SelectItem>
                          <SelectItem value="12">December</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Day</label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        placeholder="e.g., 15"
                        value={recurrenceByMonthday[0] || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setRecurrenceByMonthday(val ? [val] : []);
                        }}
                        data-testid="input-yearly-day"
                      />
                    </div>
                  </div>
                )}

                {/* End Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Ends</label>
                  <Select value={recurrenceEndType} onValueChange={(value: any) => setRecurrenceEndType(value)}>
                    <SelectTrigger data-testid="select-end-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="after">After</SelectItem>
                      <SelectItem value="on">On Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrenceEndType === 'after' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Number of Occurrences</label>
                    <Input
                      type="number"
                      min={1}
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 1)}
                      data-testid="input-occurrence-count"
                    />
                  </div>
                )}

                {recurrenceEndType === 'on' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Input
                      type="date"
                      value={recurrenceUntil}
                      onChange={(e) => setRecurrenceUntil(e.target.value)}
                      data-testid="input-until-date"
                    />
                  </div>
                )}
              </div>
            )}

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
                render={({ field }) => {
                  const selectedProperty = properties && Array.isArray(properties)
                    ? (properties as any[]).find((p: any) => p.id === field.value)
                    : null;
                  
                  return (
                    <FormItem className="flex flex-col">
                      <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={propertyOpen}
                              className={cn(
                                "justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={isPending}
                              data-testid="select-property"
                            >
                              {selectedProperty
                                ? selectedProperty.name
                                : "Link to property (optional)"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command shouldFilter={true}>
                            <CommandInput placeholder="Search properties..." />
                              <CommandList 
                                ref={propertyListRef}
                                className="max-h-[400px] overflow-y-scroll overscroll-contain" 
                                style={{ WebkitOverflowScrolling: 'touch' }}
                                onWheel={(e) => {
                                  e.stopPropagation();
                                  if (propertyListRef.current) {
                                    propertyListRef.current.scrollTop += e.deltaY;
                                  }
                                }}
                              >
                                <CommandEmpty>
                                {!showQuickAddProperty ? (
                                  <div className="py-6 text-center text-sm">
                                    <p className="mb-2">No property found.</p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowQuickAddProperty(true)}
                                      data-testid="button-add-new-property"
                                    >
                                      Add New Property
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium text-sm">Quick Add Property</h4>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowQuickAddProperty(false)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <Input
                                      placeholder="Property name *"
                                      value={quickPropertyName}
                                      onChange={(e) => setQuickPropertyName(e.target.value)}
                                      data-testid="input-quick-property-name"
                                    />
                                    <Input
                                      placeholder="Address *"
                                      value={quickPropertyAddress}
                                      onChange={(e) => setQuickPropertyAddress(e.target.value)}
                                      data-testid="input-quick-property-address"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        placeholder="City *"
                                        value={quickPropertyCity}
                                        onChange={(e) => setQuickPropertyCity(e.target.value)}
                                        data-testid="input-quick-property-city"
                                      />
                                      <Input
                                        placeholder="State (e.g., CA) *"
                                        value={quickPropertyState}
                                        onChange={(e) => setQuickPropertyState(e.target.value)}
                                        maxLength={2}
                                        data-testid="input-quick-property-state"
                                      />
                                    </div>
                                    <Input
                                      placeholder="ZIP code *"
                                      value={quickPropertyZip}
                                      onChange={(e) => setQuickPropertyZip(e.target.value)}
                                      data-testid="input-quick-property-zip"
                                    />
                                    <Button
                                      type="button"
                                      onClick={handleQuickAddProperty}
                                      disabled={quickAddPropertyMutation.isPending}
                                      className="w-full"
                                      data-testid="button-save-quick-property"
                                    >
                                      {quickAddPropertyMutation.isPending ? "Adding..." : "Add Property"}
                                    </Button>
                                  </div>
                                )}
                              </CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="none"
                                  onSelect={() => {
                                    field.onChange(undefined);
                                    setPropertyOpen(false);
                                  }}
                                  data-testid="select-property-none"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      !field.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  No property
                                </CommandItem>
                                {properties && Array.isArray(properties) && (properties as any[]).map((property: any) => (
                                  <CommandItem
                                    key={property.id}
                                    value={property.name}
                                    onSelect={() => {
                                      field.onChange(property.id);
                                      setPropertyOpen(false);
                                    }}
                                    data-testid={`select-property-${property.id}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === property.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {property.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {selectedProperty && (
                        <Link href={`/property-profile/${selectedProperty.id}`}>
                          <div className="text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer mt-1">
                            <ExternalLink className="h-3 w-3" />
                            View property profile
                          </div>
                        </Link>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Task Link */}
              <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => {
                  const selectedTask = filteredTasks.find((t: any) => t.id === field.value);
                  
                  return (
                    <FormItem className="flex flex-col">
                      <Popover open={taskOpen} onOpenChange={setTaskOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={taskOpen}
                              className={cn(
                                "justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={isPending}
                              data-testid="select-task"
                            >
                              {selectedTask
                                ? selectedTask.title
                                : selectedPropertyId && filteredTasks.length === 0
                                ? "No tasks for this property"
                                : "Link to task (optional)"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            {!showQuickAddTask && <CommandInput placeholder="Search tasks..." />}
                            <CommandList className={cn(showQuickAddTask ? "max-h-[450px]" : "max-h-[300px]")}>
                              {showQuickAddTask ? (
                                <div className="p-4 space-y-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-sm">Quick Add Task</h4>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowQuickAddTask(false)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <Input
                                    placeholder="Task title *"
                                    value={quickTaskTitle}
                                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                                    data-testid="input-quick-task-title"
                                  />
                                  <Textarea
                                    placeholder="Description (optional)"
                                    value={quickTaskDescription}
                                    onChange={(e) => setQuickTaskDescription(e.target.value)}
                                    data-testid="input-quick-task-description"
                                    rows={2}
                                  />
                                  <Select
                                    value={quickTaskPriority}
                                    onValueChange={(value: 'urgent' | 'high' | 'normal' | 'low') => setQuickTaskPriority(value)}
                                  >
                                    <SelectTrigger data-testid="select-quick-task-priority">
                                      <SelectValue placeholder="Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="urgent">Urgent</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {selectedPropertyId && (
                                    <p className="text-xs text-muted-foreground">
                                      This task will be linked to the selected property
                                    </p>
                                  )}
                                  <Button
                                    type="button"
                                    onClick={handleQuickAddTask}
                                    disabled={quickAddTaskMutation.isPending}
                                    className="w-full"
                                    data-testid="button-save-quick-task"
                                  >
                                    {quickAddTaskMutation.isPending ? "Adding..." : "Add Task"}
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <CommandEmpty>
                                    <div className="py-6 text-center text-sm">
                                      <p className="mb-2">
                                        {selectedPropertyId 
                                          ? "No tasks found for this property." 
                                          : "No tasks found."}
                                      </p>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowQuickAddTask(true)}
                                        data-testid="button-add-new-task"
                                      >
                                        Add New Task
                                      </Button>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup>
                                    <CommandItem
                                      value="none"
                                      onSelect={() => {
                                        field.onChange(undefined);
                                        setTaskOpen(false);
                                      }}
                                      data-testid="select-task-none"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          !field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      No task
                                    </CommandItem>
                                    <CommandItem
                                      value="create-new-task"
                                      onSelect={() => {
                                        setShowQuickAddTask(true);
                                      }}
                                      data-testid="select-task-create-new"
                                      className="text-primary"
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Create a new task
                                    </CommandItem>
                                    {filteredTasks.map((task: any) => (
                                      <CommandItem
                                        key={task.id}
                                        value={task.title}
                                        onSelect={() => {
                                          field.onChange(task.id);
                                          setTaskOpen(false);
                                        }}
                                        data-testid={`select-task-${task.id}`}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === task.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {task.title}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {selectedPropertyId && filteredTasks.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Showing tasks for selected property
                        </p>
                      )}
                      {selectedTask && (
                        <Link href={`/task-profile/${selectedTask.id}`}>
                          <div className="text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer mt-1">
                            <ExternalLink className="h-3 w-3" />
                            View task profile
                          </div>
                        </Link>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Client Link */}
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => {
                  const selectedClient = clients && Array.isArray(clients)
                    ? (clients as any[]).find((c: any) => c.id === field.value)
                    : null;
                  
                  return (
                    <FormItem className="flex flex-col">
                      <Popover open={clientOpen} onOpenChange={setClientOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={clientOpen}
                              className={cn(
                                "justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={isPending}
                              data-testid="select-client"
                            >
                              {selectedClient
                                ? `${selectedClient.firstName} ${selectedClient.lastName} (${selectedClient.email})`
                                : "Link to client (optional)"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search clients..." />
                            <CommandList>
                              <CommandEmpty>No client found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="none"
                                  onSelect={() => {
                                    field.onChange(undefined);
                                    setClientOpen(false);
                                  }}
                                  data-testid="select-client-none"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      !field.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  No client
                                </CommandItem>
                                {clients && Array.isArray(clients) && (clients as any[]).map((client: any) => (
                                  <CommandItem
                                    key={client.id}
                                    value={`${client.firstName} ${client.lastName} ${client.email}`}
                                    onSelect={() => {
                                      field.onChange(client.id);
                                      setClientOpen(false);
                                    }}
                                    data-testid={`select-client-${client.id}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === client.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {client.firstName} {client.lastName} ({client.email})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {selectedClient && (
                        <Link href={`/person-profile/${selectedClient.id}`}>
                          <div className="text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer mt-1">
                            <ExternalLink className="h-3 w-3" />
                            View client profile
                          </div>
                        </Link>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
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
                  <Popover open={teamMemberAttendeeOpen} onOpenChange={setTeamMemberAttendeeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={teamMemberAttendeeOpen}
                        className="w-full justify-between font-normal text-muted-foreground"
                        disabled={isPending}
                        data-testid="select-team-member"
                      >
                        Select team member
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search team members..." />
                        <CommandList>
                          <CommandEmpty>No team member found.</CommandEmpty>
                          <CommandGroup>
                            {teamUsers && Array.isArray(teamUsers) && (teamUsers as any[]).filter(Boolean).map((user: any) => (
                              <CommandItem
                                key={user.id}
                                value={`${user.firstName} ${user.lastName} ${user.email}`}
                                onSelect={() => {
                                  if (!attendees.find(a => a.userId === user.id)) {
                                    setAttendees([...attendees, {
                                      id: `temp-${Date.now()}`,
                                      type: 'user',
                                      userId: user.id,
                                      email: user.email,
                                      name: `${user.firstName} ${user.lastName}`,
                                    }]);
                                  }
                                  setTeamMemberAttendeeOpen(false);
                                }}
                                data-testid={`select-team-member-${user.id}`}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    attendees.find(a => a.userId === user.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {user.firstName} {user.lastName} ({user.email})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                {attendeeType === 'client' && (
                  <Popover open={clientAttendeeOpen} onOpenChange={setClientAttendeeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientAttendeeOpen}
                        className="w-full justify-between font-normal text-muted-foreground"
                        disabled={isPending}
                        data-testid="select-client-attendee"
                      >
                        Select client
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search clients..." />
                        <CommandList>
                          <CommandEmpty>No client found.</CommandEmpty>
                          <CommandGroup>
                            {clients && Array.isArray(clients) && (clients as any[]).filter(Boolean).map((client: any) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.firstName} ${client.lastName} ${client.email}`}
                                onSelect={() => {
                                  if (!attendees.find(a => a.clientId === client.id)) {
                                    setAttendees([...attendees, {
                                      id: `temp-${Date.now()}`,
                                      type: 'client',
                                      clientId: client.id,
                                      email: client.email,
                                      name: `${client.firstName} ${client.lastName}`,
                                    }]);
                                  }
                                  setClientAttendeeOpen(false);
                                }}
                                data-testid={`select-client-attendee-${client.id}`}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    attendees.find(a => a.clientId === client.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {client.firstName} {client.lastName} ({client.email})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
            <div className="flex justify-between items-center gap-3 pt-4">
              {isEditing && event?.id && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/orgs/${orgId}/events/${event.id}/email-preview`);
                      if (response.ok) {
                        const html = await response.text();
                        setPreviewHtml(html);
                        setShowPreview(true);
                      } else {
                        toast({
                          title: "Preview Error",
                          description: "Could not load email preview",
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "Preview Error",
                        description: "Could not load email preview",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={isPending}
                  data-testid="button-preview-email"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Preview Email
                </Button>
              )}
              
              {/* Delete button (only for existing events) */}
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending || deleteEventMutation.isPending}
                  data-testid="button-delete-event"
                  className="mr-auto"
                >
                  {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
                </Button>
              )}
              
              <div className="flex gap-3 ml-auto">
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
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    
    {/* Email Preview Modal */}
    <Dialog open={showPreview} onOpenChange={setShowPreview}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Email Invitation Preview</DialogTitle>
          <DialogDescription>
            This is how the email invitation will appear to recipients with your organization's branding.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto border rounded-lg bg-gray-50">
          {previewHtml && (
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full min-h-[600px]"
              title="Email Preview"
              sandbox="allow-same-origin"
              data-testid="email-preview-iframe"
            />
          )}
        </div>
        <div className="flex justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => setShowPreview(false)}
            data-testid="button-close-preview"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
