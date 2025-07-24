import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Clock, User, Building, Eye, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocation } from "wouter";

export default function Tasks() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "secondary";
      case "normal":
        return "outline";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const handleTaskClick = (taskId: string) => {
    localStorage.setItem('selectedTaskId', taskId);
    navigate(`/task-profile?id=${taskId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage and track all your tasks
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button>
              <CheckSquare className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks List</CardTitle>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : tasks?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tasks as any[]).map((task: any) => (
                  <TableRow 
                    key={task.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-slate-600 truncate max-w-xs">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.property ? (
                        <div className="text-sm">
                          <div className="font-medium">{task.property.name}</div>
                          <div className="text-slate-600 truncate max-w-xs">{task.property.address}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">No property</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.assignedUser ? (
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={task.assignedUser.profileImageUrl} alt={`${task.assignedUser.firstName} ${task.assignedUser.lastName}`} />
                            <AvatarFallback className="text-xs">
                              {task.assignedUser.firstName?.[0]}{task.assignedUser.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-sm">
                            <div className="font-medium">{task.assignedUser.firstName} {task.assignedUser.lastName}</div>
                            <div className="text-slate-600">{task.assignedUser.email}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(task.priority)} className="capitalize">
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(task.status)} className="capitalize">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <span className="text-sm">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">No due date</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(task.id);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Open edit modal - will implement later
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <CheckSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No tasks yet
              </h3>
              <p className="text-slate-600 mb-4">
                Create your first task to get started
              </p>
              <Button>
                <CheckSquare className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
