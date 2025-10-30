import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText, AlertCircle, Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface NoteSearchResult {
  id: number;
  type: string;
  title: string;
  content: string;
  category: string;
  createdBy: string;
  createdAt: string;
  relatedEntity: string;
  relatedEntityId: number;
  relatedEntityType: string;
  isImportant: boolean;
}

export default function AdminNoteSearch() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input with proper cleanup
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Fetch notes based on search query
  const { data: notes = [], isLoading } = useQuery<NoteSearchResult[]>({
    queryKey: ["/api/admin/notes/search", debouncedQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) {
        params.append("q", debouncedQuery);
      }
      const response = await fetch(`/api/admin/notes/search?${params}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }
      return response.json();
    },
    enabled: user?.role === "admin" && debouncedQuery.length > 0,
  });

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      vehicle_note: { label: "Vehicle Note", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      room_note: { label: "Room Note", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      property_note: { label: "Property Note", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
      contact_note: { label: "Contact Note", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
      task_note: { label: "Task Note", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" },
      time_tracking_note: { label: "Time Entry", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200" },
      vehicle_maintenance_note: { label: "Maintenance", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    };
    return typeMap[type] || { label: type, color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" };
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Note Search
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Search across all notes in your organization
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search notes by content, title, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-note-search"
            />
          </div>
          
          {debouncedQuery && (
            <p className="text-sm text-slate-500 mt-2">
              {isLoading ? "Searching..." : `Found ${notes.length} note${notes.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </CardContent>
      </Card>

      {debouncedQuery && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Search Results
              </span>
              <Badge variant="secondary">{notes.length} results</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-slate-500 mt-4">Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-1 font-medium">No notes found</p>
                <p className="text-sm text-slate-500">Try a different search term</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">Content</TableHead>
                      <TableHead className="hidden lg:table-cell">Related To</TableHead>
                      <TableHead className="hidden lg:table-cell">Category</TableHead>
                      <TableHead className="hidden xl:table-cell">Created By</TableHead>
                      <TableHead className="hidden xl:table-cell">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notes.map((note, index) => {
                      const typeInfo = getTypeLabel(note.type);
                      return (
                        <TableRow key={`${note.type}-${note.id}-${index}`} data-testid={`note-result-${index}`}>
                          <TableCell>
                            <Badge className={typeInfo.color} variant="secondary">
                              {typeInfo.label}
                            </Badge>
                            {note.isImportant && (
                              <Badge className="ml-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                Important
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {truncateText(note.title, 50)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-slate-600 dark:text-slate-400">
                            {truncateText(note.content, 80)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1 text-sm">
                              <FileText className="w-4 h-4 text-slate-400" />
                              {truncateText(note.relatedEntity, 40)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline">{note.category}</Badge>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {note.createdBy && (
                              <div className="flex items-center gap-1 text-sm">
                                <User className="w-4 h-4 text-slate-400" />
                                {note.createdBy}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-sm text-slate-500">
                            {note.createdAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {format(new Date(note.createdAt), "MMM d, yyyy")}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!debouncedQuery && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              Start searching
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Enter a search term above to find notes across your organization
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
