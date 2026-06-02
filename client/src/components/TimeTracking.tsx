import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Clock, Square, Play, Building2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const WORK_TYPES = [
  "Inspection",
  "Home Watch Visit",
  "Maintenance",
  "Vendor Coordination",
  "Travel",
  "Administrative",
  "Cleaning",
  "Welcome Home Service",
  "Departure Service",
  "Other",
];

interface TimeEntry {
  id: number;
  userId: string;
  orgId: string;
  clockIn: string;
  clockOut: string | null;
  propertyId: number | null;
  taskId: number | null;
  notes: string | null;
  billableRateCents: number | null;
  workType: string | null;
  mileage: number | null;
  status: string;
}

interface Property {
  id: number;
  name: string;
}

interface Task {
  id: number;
  title: string;
}

export function TimeTrackingDropdownItems() {
  const { toast } = useToast();
  const [showClockInDialog, setShowClockInDialog] = useState(false);
  const [timeType, setTimeType] = useState<"client" | "organizational">("client");
  const [propertyId, setPropertyId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [workType, setWorkType] = useState<string>("Home Watch Visit");
  const [mileage, setMileage] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: activeEntry, isLoading } = useQuery<TimeEntry | null>({
    queryKey: ["/api/time-entries/active"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const clockInMutation = useMutation({
    mutationFn: async (data: {
      propertyId?: number;
      taskId?: number;
      notes?: string;
      workType?: string;
      mileage?: number;
      isBillable?: boolean;
    }) => {
      return await apiRequest("POST", "/api/time-entries/clock-in", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({
        title: "Clocked In",
        description:
          timeType === "organizational"
            ? "Tracking organizational time (non-billable)."
            : "Your time is now being tracked.",
      });
      setShowClockInDialog(false);
      setTimeType("client");
      setPropertyId("");
      setTaskId("");
      setWorkType("Home Watch Visit");
      setMileage("");
      setNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clock in",
        variant: "destructive",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/time-entries/${id}/clock-out`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({
        title: "Clocked Out",
        description: "Your time has been recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clock out",
        variant: "destructive",
      });
    },
  });

  const handleClockIn = () => {
    const payload: Parameters<typeof clockInMutation.mutate>[0] = {
      notes: notes || undefined,
      workType: workType || undefined,
      mileage: mileage ? parseInt(mileage) : undefined,
      isBillable: timeType === "client",
    };
    if (timeType === "client") {
      payload.propertyId = propertyId && propertyId !== "none" ? parseInt(propertyId) : undefined;
      payload.taskId = taskId && taskId !== "none" ? parseInt(taskId) : undefined;
    }
    clockInMutation.mutate(payload);
  };

  const handleClockOut = () => {
    if (activeEntry) {
      clockOutMutation.mutate(activeEntry.id);
    }
  };

  const formatDuration = (clockIn: string) => {
    const start = new Date(clockIn);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      {activeEntry ? (
        <>
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              handleClockOut();
            }}
            className="flex items-center justify-between"
            data-testid="button-clock-out"
          >
            <div className="flex items-center">
              <Square className="w-4 h-4 mr-2 text-red-500" />
              <div className="flex flex-col">
                <span className="font-medium">Clock Out</span>
                <span className="text-xs text-slate-500">{formatDuration(activeEntry.clockIn)}</span>
              </div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      ) : (
        <>
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              setShowClockInDialog(true);
            }}
            data-testid="button-clock-in"
          >
            <Play className="w-4 h-4 mr-2 text-green-500" />
            Clock In
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}

      <Dialog open={showClockInDialog} onOpenChange={setShowClockInDialog}>
        <DialogContent data-testid="dialog-clock-in">
          <DialogHeader>
            <DialogTitle>Clock In</DialogTitle>
            <DialogDescription>
              {timeType === "organizational"
                ? "Track non-billable organizational time (admin, training, meetings, etc.)"
                : "Track time for client work and billable services."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Time Type</Label>
              <RadioGroup
                value={timeType}
                onValueChange={(value: "client" | "organizational") => {
                  setTimeType(value);
                  if (value === "organizational") {
                    setPropertyId("");
                    setTaskId("");
                  }
                }}
                data-testid="radio-time-type"
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="client" id="client" data-testid="radio-client" />
                  <Label htmlFor="client" className="flex items-center cursor-pointer flex-1">
                    <Users className="w-4 h-4 mr-2 text-teal-500" />
                    <div>
                      <div className="font-medium">Client Work</div>
                      <div className="text-xs text-slate-500">Billable time for properties and tasks</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="organizational" id="organizational" data-testid="radio-organizational" />
                  <Label htmlFor="organizational" className="flex items-center cursor-pointer flex-1">
                    <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                    <div>
                      <div className="font-medium">Organizational Time</div>
                      <div className="text-xs text-slate-500">Non-billable (admin, training, meetings)</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="work-type">Work Type</Label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger id="work-type" data-testid="select-work-type">
                  <SelectValue placeholder="Select work type" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_TYPES.map((wt) => (
                    <SelectItem key={wt} value={wt}>
                      {wt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {timeType === "client" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="property">Property (Optional)</Label>
                  <Select value={propertyId} onValueChange={setPropertyId}>
                    <SelectTrigger id="property" data-testid="select-property">
                      <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task">Task (Optional)</Label>
                  <Select value={taskId} onValueChange={setTaskId}>
                    <SelectTrigger id="task" data-testid="select-task">
                      <SelectValue placeholder="Select a task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id.toString()}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage (Optional)</Label>
                  <Input
                    id="mileage"
                    type="number"
                    min="0"
                    placeholder="Miles driven"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    data-testid="input-mileage"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder={
                  timeType === "organizational"
                    ? "e.g., Team meeting, training, administrative work..."
                    : "Add any notes about this time entry..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClockInDialog(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleClockIn}
              disabled={clockInMutation.isPending}
              data-testid="button-submit-clock-in"
            >
              {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
