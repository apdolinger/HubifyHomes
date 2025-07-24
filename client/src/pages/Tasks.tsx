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
            <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
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

      {/* Tasks List */}
      <div className="space-y-4">
        {tasksLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tasks?.length > 0 ? (
          tasks.map((task: any) => (
            <Card 
              key={task.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleTaskClick(task.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-slate-900">
                        {task.title}
                      </h3>
                      <Badge variant={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge variant={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {task.description && (
                      <p className="text-slate-600 mb-3">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-slate-500">
                      {task.propertyId && (
                        <div className="flex items-center">
                          <Building className="w-4 h-4 mr-1" />
                          Property ID: {task.propertyId}
                        </div>
                      )}
                      
                      {task.assignedToId && (
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          Assigned
                        </div>
                      )}
                      
                      {task.dueDate && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                      
                      <div>
                        Created: {new Date(task.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    {task.status === 'pending' && (
                      <Button size="sm" variant="outline">
                        Assign
                      </Button>
                    )}
                    
                    {task.status !== 'completed' && (
                      <Button size="sm">
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
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
        )}
      </div>
    </main>
  );
}
