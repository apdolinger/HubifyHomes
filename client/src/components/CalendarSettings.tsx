import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CalendarSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onSettingsChange?: (settings: CalendarDisplaySettings) => void;
}

interface CalendarDisplaySettings {
  showWeekends: boolean;
  defaultView: string;
  weekStartsOn: number;
  hiddenCalendars: string[];
  filterEventType: 'all' | 'events' | 'tasks';
  filterPriority: 'all' | 'urgent' | 'high' | 'normal' | 'low';
}

const DEFAULT_SETTINGS: CalendarDisplaySettings = {
  showWeekends: true,
  defaultView: 'dayGridMonth',
  weekStartsOn: 0,
  hiddenCalendars: [],
  filterEventType: 'all',
  filterPriority: 'all',
};

const CALENDAR_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

export function CalendarSettings({ open, onOpenChange, orgId, onSettingsChange }: CalendarSettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CalendarDisplaySettings>(DEFAULT_SETTINGS);
  const [editingCalendar, setEditingCalendar] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newCalendarName, setNewCalendarName] = useState("");
  const [newCalendarColor, setNewCalendarColor] = useState(CALENDAR_COLORS[0]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`calendar-settings-${orgId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
        onSettingsChange?.(parsed);
      } catch (e) {
        console.error('Failed to parse calendar settings:', e);
      }
    }
  }, [orgId, onSettingsChange]);

  // Save settings to localStorage whenever they change
  const saveSettings = (newSettings: CalendarDisplaySettings) => {
    setSettings(newSettings);
    localStorage.setItem(`calendar-settings-${orgId}`, JSON.stringify(newSettings));
    onSettingsChange?.(newSettings);
  };

  // Fetch calendars
  const { data: calendars, isLoading } = useQuery<any[]>({
    queryKey: [`/api/orgs/${orgId}/calendars`],
    enabled: !!orgId,
  });

  // Create calendar mutation
  const createCalendar = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      return apiRequest("POST", `/api/orgs/${orgId}/calendars`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/calendars`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/events`] });
      setNewCalendarName("");
      setNewCalendarColor(CALENDAR_COLORS[0]);
      toast({ title: "Calendar created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create calendar", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update calendar mutation
  const updateCalendar = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; color: string } }) => {
      return apiRequest("PATCH", `/api/orgs/${orgId}/calendars/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/calendars`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/events`] });
      setEditingCalendar(null);
      toast({ title: "Calendar updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update calendar", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete calendar mutation
  const deleteCalendar = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/orgs/${orgId}/calendars/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/calendars`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${orgId}/events`] });
      toast({ title: "Calendar deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete calendar", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleCreateCalendar = () => {
    if (!newCalendarName.trim()) {
      toast({ 
        title: "Calendar name required", 
        variant: "destructive" 
      });
      return;
    }
    createCalendar.mutate({ name: newCalendarName, color: newCalendarColor });
  };

  const handleUpdateCalendar = (id: string) => {
    if (!editName.trim()) {
      toast({ 
        title: "Calendar name required", 
        variant: "destructive" 
      });
      return;
    }
    updateCalendar.mutate({ id, data: { name: editName, color: editColor } });
  };

  const toggleCalendarVisibility = (calendarId: string) => {
    const newHidden = settings.hiddenCalendars.includes(calendarId)
      ? settings.hiddenCalendars.filter(id => id !== calendarId)
      : [...settings.hiddenCalendars, calendarId];
    saveSettings({ ...settings, hiddenCalendars: newHidden });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calendar Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="calendars" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendars" data-testid="tab-calendars">Calendars</TabsTrigger>
            <TabsTrigger value="filters" data-testid="tab-filters">Filters</TabsTrigger>
            <TabsTrigger value="display" data-testid="tab-display">Display</TabsTrigger>
          </TabsList>

          {/* Calendar Management Tab */}
          <TabsContent value="calendars" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Create New Calendar</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Calendar name"
                  value={newCalendarName}
                  onChange={(e) => setNewCalendarName(e.target.value)}
                  data-testid="input-new-calendar-name"
                />
                <Select value={newCalendarColor} onValueChange={setNewCalendarColor}>
                  <SelectTrigger className="w-24" data-testid="select-new-calendar-color">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: newCalendarColor }} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {CALENDAR_COLORS.map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                          <span className="text-xs">{color}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleCreateCalendar}
                  disabled={createCalendar.isPending}
                  data-testid="button-create-calendar"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Your Calendars</h3>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading calendars...</p>
              ) : !calendars || calendars.length === 0 ? (
                <p className="text-sm text-muted-foreground">No calendars yet. Create one above.</p>
              ) : (
                <div className="space-y-2">
                  {calendars.map((calendar: any) => (
                    <div key={calendar.id} className="flex items-center gap-2 p-2 border rounded">
                      {editingCalendar === calendar.id ? (
                        <>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1"
                            data-testid={`input-edit-calendar-name-${calendar.id}`}
                          />
                          <Select value={editColor} onValueChange={setEditColor}>
                            <SelectTrigger className="w-24" data-testid={`select-edit-calendar-color-${calendar.id}`}>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: editColor }} />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {CALENDAR_COLORS.map((color) => (
                                <SelectItem key={color} value={color}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateCalendar(calendar.id)}
                            disabled={updateCalendar.isPending}
                            data-testid={`button-save-calendar-${calendar.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCalendar(null)}
                            data-testid={`button-cancel-edit-calendar-${calendar.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: calendar.color }} />
                          <span className="flex-1">{calendar.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCalendar(calendar.id);
                              setEditName(calendar.name);
                              setEditColor(calendar.color);
                            }}
                            data-testid={`button-edit-calendar-${calendar.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete calendar "${calendar.name}"? All events in this calendar will also be deleted.`)) {
                                deleteCalendar.mutate(calendar.id);
                              }
                            }}
                            disabled={deleteCalendar.isPending}
                            data-testid={`button-delete-calendar-${calendar.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Filter Settings Tab */}
          <TabsContent value="filters" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Calendar Visibility</h3>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading calendars...</p>
              ) : !calendars || calendars.length === 0 ? (
                <p className="text-sm text-muted-foreground">No calendars to filter.</p>
              ) : (
                <div className="space-y-2">
                  {calendars.map((calendar: any) => (
                    <div key={calendar.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`calendar-${calendar.id}`}
                        checked={!settings.hiddenCalendars.includes(calendar.id)}
                        onCheckedChange={() => toggleCalendarVisibility(calendar.id)}
                        data-testid={`checkbox-calendar-${calendar.id}`}
                      />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: calendar.color }} />
                      <Label htmlFor={`calendar-${calendar.id}`} className="flex-1 cursor-pointer">
                        {calendar.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select 
                  value={settings.filterEventType} 
                  onValueChange={(value: any) => saveSettings({ ...settings, filterEventType: value })}
                >
                  <SelectTrigger data-testid="select-filter-event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events & Tasks</SelectItem>
                    <SelectItem value="events">Events Only</SelectItem>
                    <SelectItem value="tasks">Tasks Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Task Priority</Label>
                <Select 
                  value={settings.filterPriority} 
                  onValueChange={(value: any) => saveSettings({ ...settings, filterPriority: value })}
                >
                  <SelectTrigger data-testid="select-filter-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent Only</SelectItem>
                    <SelectItem value="high">High Only</SelectItem>
                    <SelectItem value="normal">Normal Only</SelectItem>
                    <SelectItem value="low">Low Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Display Settings Tab */}
          <TabsContent value="display" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Weekends</Label>
                  <p className="text-xs text-muted-foreground">Display Saturday and Sunday</p>
                </div>
                <Switch
                  checked={settings.showWeekends}
                  onCheckedChange={(checked) => saveSettings({ ...settings, showWeekends: checked })}
                  data-testid="switch-show-weekends"
                />
              </div>

              <div className="space-y-2">
                <Label>Default View</Label>
                <Select 
                  value={settings.defaultView} 
                  onValueChange={(value) => saveSettings({ ...settings, defaultView: value })}
                >
                  <SelectTrigger data-testid="select-default-view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dayGridMonth">Month View</SelectItem>
                    <SelectItem value="timeGridWeek">Week View</SelectItem>
                    <SelectItem value="timeGridDay">Day View</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Week Starts On</Label>
                <Select 
                  value={settings.weekStartsOn.toString()} 
                  onValueChange={(value) => saveSettings({ ...settings, weekStartsOn: parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-week-starts-on">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
