import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Repeat } from "lucide-react";
import { RRule, Frequency } from "rrule";
import { CustomFieldsRenderer } from "@/components/CustomFieldsRenderer";

const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  priority: z.enum(["urgent", "high", "normal", "low"]).default("normal"),
  propertyId: z.number().optional(),
  contactId: z.number().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAddTaskModal({ isOpen, onClose }: QuickAddTaskModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const titleInputRef = useRef<HTMLInputElement>(null);

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
  
  // Custom fields state
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
    },
  });

  // Fetch properties for dropdown
  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
    enabled: isOpen,
  });

  // Fetch contacts/clients for dropdown
  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: isOpen,
  });
  
  // Fetch custom fields for tasks
  const { data: customFields = [] } = useQuery<any[]>({
    queryKey: ["/api/custom-fields"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/custom-fields?entityType=task");
      return response.json();
    },
    enabled: isOpen,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData & { recurrenceRule?: string | null; customFieldValues?: Record<string, any> }) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return response.json();
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Task Created",
        description: `Task "${newTask.title}" has been created successfully.`,
      });
      
      onClose();
      form.reset();
      resetRecurrenceState();
      setCustomFieldValues({});
      
      // Redirect to task detail page
      setLocation(`/task-profile/${newTask.id}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reset recurrence state
  const resetRecurrenceState = () => {
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
    setCustomFieldValues({});
  };

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      resetRecurrenceState();
    }
  }, [isOpen, form]);

  // Build RRULE string from recurrence settings
  const buildRRule = (): string | null => {
    if (!isRecurring) return null;

    const freqMap = {
      daily: Frequency.DAILY,
      weekly: Frequency.WEEKLY,
      monthly: Frequency.MONTHLY,
      yearly: Frequency.YEARLY,
    };

    const options: any = {
      freq: freqMap[recurrenceFreq],
      interval: recurrenceInterval,
    };

    // Frequency-specific options
    if (recurrenceFreq === 'weekly' && recurrenceByWeekday.length > 0) {
      options.byweekday = recurrenceByWeekday;
    }

    if (recurrenceFreq === 'monthly') {
      if (recurrenceBySetPos !== null && recurrenceByWeekday.length > 0) {
        options.bysetpos = recurrenceBySetPos;
        options.byweekday = recurrenceByWeekday;
      } else if (recurrenceByMonthday.length > 0) {
        options.bymonthday = recurrenceByMonthday;
      }
    }

    if (recurrenceFreq === 'yearly') {
      if (recurrenceByMonth.length > 0) {
        options.bymonth = recurrenceByMonth;
      }
      if (recurrenceByMonthday.length > 0) {
        options.bymonthday = recurrenceByMonthday;
      }
    }

    // End conditions
    if (recurrenceEndType === 'after') {
      options.count = recurrenceCount;
    } else if (recurrenceEndType === 'on' && recurrenceUntil) {
      options.until = new Date(recurrenceUntil);
    }

    const rule = new RRule(options);
    // Remove "RRULE:" prefix for storage
    return rule.toString().replace('RRULE:', '');
  };

  const onSubmit = (data: TaskFormData) => {
    // Validate required custom fields
    const requiredFields = customFields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => {
      const value = customFieldValues[f.fieldKey];
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return !value && value !== false && value !== 0;
    });
    
    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in required custom fields: ${missingFields.map(f => f.fieldName).join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    const recurrenceRule = buildRRule();
    createTaskMutation.mutate({
      ...data,
      recurrenceRule,
      customFieldValues: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Add Task</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      ref={titleInputRef}
                      placeholder="Enter task title..."
                      data-testid="input-task-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-property">
                        <SelectValue placeholder="Select property..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties?.map((property: any) => (
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
            
            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-client">
                        <SelectValue placeholder="Select client..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contacts?.map((contact: any) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.firstName} {contact.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Recurring Task
                </label>
                <p className="text-xs text-muted-foreground">
                  Task repeats on a schedule
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
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter task description..."
                      rows={3}
                      className="resize-none"
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Custom Fields */}
            {customFields.length > 0 && (
              <CustomFieldsRenderer
                fields={customFields}
                values={customFieldValues}
                onChange={setCustomFieldValues}
                mode="edit"
              />
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTaskMutation.isPending}
                data-testid="button-create-task"
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
