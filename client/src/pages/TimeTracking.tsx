import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Clock, Edit, Trash2, Filter, Download } from "lucide-react";
import { format } from "date-fns";

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
  createdAt: string;
  updatedAt: string;
}

interface Property {
  id: number;
  name: string;
}

interface Task {
  id: number;
  title: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function TimeTracking() {
  const { toast } = useToast();
  const [userFilter, setUserFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editBillableRate, setEditBillableRate] = useState("");

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (userFilter && userFilter !== "all") params.append("userId", userFilter);
    if (propertyFilter && propertyFilter !== "all") params.append("propertyId", propertyFilter);
    if (taskFilter && taskFilter !== "all") params.append("taskId", taskFilter);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return params.toString() ? `?${params.toString()}` : "";
  };

  const { data: entries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", userFilter, propertyFilter, taskFilter, startDate, endDate],
    queryFn: async () => {
      const queryString = buildQueryString();
      const response = await fetch(`/api/time-entries${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch time entries");
      return response.json();
    },
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<TimeEntry> }) => {
      return await apiRequest("PATCH", `/api/time-entries/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({
        title: "Updated",
        description: "Time entry has been updated.",
      });
      setShowEditDialog(false);
      setEditingEntry(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update time entry",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/time-entries/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({
        title: "Deleted",
        description: "Time entry has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete time entry",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditNotes(entry.notes || "");
    setEditBillableRate(entry.billableRateCents ? (entry.billableRateCents / 100).toString() : "");
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;

    const updates: Partial<TimeEntry> = {
      notes: editNotes || null,
      billableRateCents: editBillableRate ? Math.round(parseFloat(editBillableRate) * 100) : null,
    };

    updateMutation.mutate({ id: editingEntry.id, updates });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this time entry?")) {
      deleteMutation.mutate(id);
    }
  };

  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const calculateTotalHours = () => {
    return entries.reduce((total, entry) => {
      const start = new Date(entry.clockIn);
      const end = entry.clockOut ? new Date(entry.clockOut) : new Date();
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  };

  const calculateTotalBillable = () => {
    return entries.reduce((total, entry) => {
      if (!entry.billableRateCents || !entry.clockOut) return total;
      const start = new Date(entry.clockIn);
      const end = new Date(entry.clockOut);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const amount = (entry.billableRateCents / 100) * hours;
      return total + amount;
    }, 0);
  };

  const getPropertyName = (propertyId: number | null) => {
    if (!propertyId) return "-";
    const property = properties.find(p => p.id === propertyId);
    return property?.name || "-";
  };

  const getTaskName = (taskId: number | null) => {
    if (!taskId) return "-";
    const task = tasks.find(t => t.id === taskId);
    return task?.title || "-";
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) return `${user.firstName} ${user.lastName}`;
    return userId;
  };

  const exportToCSV = () => {
    const headers = ["User", "Property", "Task", "Clock In", "Clock Out", "Duration", "Billable Rate", "Notes"];
    const rows = entries.map(entry => [
      getUserName(entry.userId),
      getPropertyName(entry.propertyId),
      getTaskName(entry.taskId),
      format(new Date(entry.clockIn), "yyyy-MM-dd HH:mm:ss"),
      entry.clockOut ? format(new Date(entry.clockOut), "yyyy-MM-dd HH:mm:ss") : "Active",
      calculateDuration(entry.clockIn, entry.clockOut),
      entry.billableRateCents ? `$${(entry.billableRateCents / 100).toFixed(2)}` : "-",
      entry.notes || "-",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-entries-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Time Tracking</h1>
          <p className="text-slate-600 mt-1">View and manage time entries</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-entries">{entries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-hours">{calculateTotalHours().toFixed(2)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Billable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-billable">${calculateTotalBillable().toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
          <CardDescription>Filter time entries by user, property, task, or date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-filter">User</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger id="user-filter" data-testid="select-user-filter">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="property-filter">Property</Label>
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger id="property-filter" data-testid="select-property-filter">
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-filter">Task</Label>
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger id="task-filter" data-testid="select-task-filter">
                  <SelectValue placeholder="All tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tasks</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `Showing ${entries.length} entries`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-500">
                    No time entries found
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                    <TableCell>{getUserName(entry.userId)}</TableCell>
                    <TableCell>{getPropertyName(entry.propertyId)}</TableCell>
                    <TableCell>{getTaskName(entry.taskId)}</TableCell>
                    <TableCell>{format(new Date(entry.clockIn), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell>
                      {entry.clockOut ? (
                        format(new Date(entry.clockOut), "MMM d, yyyy h:mm a")
                      ) : (
                        <span className="text-green-600 font-medium">Active</span>
                      )}
                    </TableCell>
                    <TableCell>{calculateDuration(entry.clockIn, entry.clockOut)}</TableCell>
                    <TableCell>
                      {entry.billableRateCents ? `$${(entry.billableRateCents / 100).toFixed(2)}/hr` : "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{entry.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(entry)}
                          data-testid={`button-edit-${entry.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry.id)}
                          data-testid={`button-delete-${entry.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent data-testid="dialog-edit">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>Update the notes or billable rate for this time entry</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add any notes..."
                data-testid="input-edit-notes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rate">Billable Rate ($/hour)</Label>
              <Input
                id="edit-rate"
                type="number"
                step="0.01"
                value={editBillableRate}
                onChange={(e) => setEditBillableRate(e.target.value)}
                placeholder="0.00"
                data-testid="input-edit-rate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
