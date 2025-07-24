import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Clock, User, Building } from "lucide-react";
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

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasksLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tasks?.length > 0 ? (
          tasks.map((task: any) => (
            <Card 
              key={task.id} 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              onClick={() => handleTaskClick(task.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-slate-900 mb-2">
                      {task.title}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                      <Badge variant={getStatusColor(task.status)} className="text-xs">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {task.description && (
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                    {task.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  {task.property && (
                    <div className="flex items-center text-sm text-slate-600">
                      <Building className="w-4 h-4 mr-2 text-slate-400" />
                      <span className="truncate">{task.property.name}</span>
                    </div>
                  )}
                  
                  {task.assignedUser && (
                    <div className="flex items-center text-sm text-slate-600">
                      <User className="w-4 h-4 mr-2 text-slate-400" />
                      <span className="truncate">
                        {task.assignedUser.firstName} {task.assignedUser.lastName}
                      </span>
                    </div>
                  )}
                  
                  {task.dueDate && (
                    <div className="flex items-center text-sm text-slate-600">
                      <Clock className="w-4 h-4 mr-2 text-slate-400" />
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-slate-500">
                    <CheckSquare className="w-4 h-4 mr-2 text-slate-400" />
                    <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-12">
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
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
