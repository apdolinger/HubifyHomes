import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTaskModal } from "@/contexts/TaskModalContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Clock, User, Building, Eye, Edit, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocation } from "wouter";

type SortField = 'title' | 'priority' | 'status' | 'dueDate' | 'createdAt' | 'assignedUser' | 'property';
type SortDirection = 'asc' | 'desc';

export default function Tasks() {
  const { isAuthenticated, isLoading } = useAuth();
  const { openTaskModal } = useTaskModal();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  
  // Parse URL search parameters and update filters when location changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlStatusFilter = urlParams.get('status');
    const urlPriorityFilter = urlParams.get('priority');
    
    if (urlStatusFilter) {
      setStatusFilter(urlStatusFilter);
    } else {
      setStatusFilter("all"); // Reset to default when no parameter
    }
    
    if (urlPriorityFilter) {
      setPriorityFilter(urlPriorityFilter);
    } else {
      setPriorityFilter("all"); // Reset to default when no parameter
    }
  }, [location]);
  
  // Sort state
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  // Sort and filter tasks
  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    
    let filtered = [...tasks] as any[];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.property?.name?.toLowerCase().includes(query) ||
        task.assignedUser?.firstName?.toLowerCase().includes(query) ||
        task.assignedUser?.lastName?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      if (statusFilter === "overdue") {
        // Special handling for overdue tasks - tasks with due dates in the past that aren't completed
        const now = new Date();
        filtered = filtered.filter(task => 
          task.dueDate && 
          new Date(task.dueDate) < now && 
          task.status !== "completed"
        );
      } else {
        filtered = filtered.filter(task => task.status === statusFilter);
      }
    }
    
    // Apply priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    
    // Apply assigned filter
    if (assignedFilter !== "all") {
      if (assignedFilter === "unassigned") {
        filtered = filtered.filter(task => !task.assignedUser);
      } else {
        filtered = filtered.filter(task => task.assignedUser?.id === assignedFilter);
      }
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'status':
          const statusOrder = { pending: 1, in_progress: 2, completed: 3, cancelled: 0 };
          aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
          bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
          break;
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'assignedUser':
          aValue = a.assignedUser ? `${a.assignedUser.firstName} ${a.assignedUser.lastName}`.toLowerCase() : '';
          bValue = b.assignedUser ? `${b.assignedUser.firstName} ${b.assignedUser.lastName}`.toLowerCase() : '';
          break;
        case 'property':
          aValue = a.property?.name?.toLowerCase() || '';
          bValue = b.property?.name?.toLowerCase() || '';
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    
    return filtered;
  }, [tasks, searchQuery, statusFilter, priorityFilter, assignedFilter, sortField, sortDirection]);

  // Get unique users for assigned filter
  const uniqueUsers = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    const users = new Map();
    (tasks as any[]).forEach(task => {
      if (task.assignedUser) {
        users.set(task.assignedUser.id, task.assignedUser);
      }
    });
    return Array.from(users.values());
  }, [tasks]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-slate-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-slate-600" />
      : <ArrowDown className="w-4 h-4 ml-1 text-slate-600" />;
  };

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
    navigate(`/task-profile/${taskId}`);
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
              Manage and track all your tasks ({filteredAndSortedTasks.length} {filteredAndSortedTasks.length === 1 ? 'task' : 'tasks'})
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button onClick={openTaskModal}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search tasks, properties, or people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Assigned Filter */}
            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {uniqueUsers.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Clear Filters */}
          {(searchQuery || statusFilter !== "all" || priorityFilter !== "all" || assignedFilter !== "all") && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <Filter className="w-4 h-4" />
                <span>Filters applied</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setAssignedFilter("all");
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
          ) : filteredAndSortedTasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => handleSort('title')}>
                    <div className="flex items-center">
                      Task Title
                      {getSortIcon('title')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => handleSort('property')}>
                    <div className="flex items-center">
                      Property
                      {getSortIcon('property')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => handleSort('assignedUser')}>
                    <div className="flex items-center">
                      Assigned To
                      {getSortIcon('assignedUser')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => handleSort('priority')}>
                    <div className="flex items-center">
                      Priority
                      {getSortIcon('priority')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => handleSort('dueDate')}>
                    <div className="flex items-center">
                      Due Date
                      {getSortIcon('dueDate')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center">
                      Created
                      {getSortIcon('createdAt')}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTasks.map((task: any) => (
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
                          <div className="text-slate-600 truncate max-w-xs">
                            {[
                              task.property.address1,
                              task.property.address2,
                              task.property.city,
                              task.property.state,
                              task.property.zip
                            ].filter(Boolean).join(", ")}
                          </div>
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
              {Array.isArray(tasks) && tasks.length > 0 ? (
                // No results after filtering
                <>
                  <Filter className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No tasks match your filters
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Try adjusting your search or filter criteria
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setPriorityFilter("all");
                      setAssignedFilter("all");
                    }}
                  >
                    Clear all filters
                  </Button>
                </>
              ) : (
                // No tasks at all
                <>
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
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
