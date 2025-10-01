import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, AlignLeft, Users, Link as LinkIcon } from "lucide-react";
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
import { insertEventSchema, type Event } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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
    return end > start;
  },
  {
    message: "End time must be after start time",
    path: ["end"],
  }
);

type FormData = z.infer<typeof formSchema>;

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

  // Fetch calendars for the dropdown
  const { data: calendars } = useQuery({
    queryKey: ["/api/orgs", orgId, "calendars"],
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
  }, [event, orgId, userId, defaultDate, defaultCalendarId, form]);

  const createEventMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        start: new Date(data.start).toISOString(),
        end: new Date(data.end).toISOString(),
        propertyId: data.propertyId || null,
        taskId: data.taskId || null,
        clientId: data.clientId || null,
      };
      return await apiRequest(`/api/orgs/${orgId}/events`, "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", orgId, "events"] });
      toast({
        title: "Event created",
        description: "Your event has been created successfully.",
      });
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
      const payload = {
        ...data,
        start: new Date(data.start).toISOString(),
        end: new Date(data.end).toISOString(),
        propertyId: data.propertyId || null,
        taskId: data.taskId || null,
        clientId: data.clientId || null,
      };
      return await apiRequest(`/api/orgs/${orgId}/events/${event?.id}`, "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", orgId, "events"] });
      toast({
        title: "Event updated",
        description: "Your event has been updated successfully.",
      });
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
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

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
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
