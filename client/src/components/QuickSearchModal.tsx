import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Building, User, CheckSquare } from "lucide-react";
import { useLocation } from "wouter";

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickSearchModal({ isOpen, onClose }: QuickSearchModalProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search"],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(query)}`).then(res => res.json()),
    enabled: isOpen && query.length > 2,
    staleTime: 30000,
  });

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear query when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  const handleResultClick = (type: string, id: number) => {
    onClose();
    switch (type) {
      case "property":
        setLocation(`/properties?id=${id}`);
        break;
      case "task":
        setLocation(`/tasks?id=${id}`);
        break;
      case "contact":
        setLocation(`/people?id=${id}`);
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick Search</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search properties, people, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full"
          />
          
          {query.length > 2 && (
            <div className="max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : searchResults ? (
                <div className="space-y-2">
                  {/* Properties */}
                  {searchResults.properties?.map((property: any) => (
                    <div
                      key={`property-${property.id}`}
                      className="search-result-item search-result-property"
                      onClick={() => handleResultClick("property", property.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Building className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {property.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Property • {[
                              property.address1,
                              property.address2,
                              property.city,
                              property.state,
                              property.zip
                            ].filter(Boolean).join(", ")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Contacts */}
                  {searchResults.contacts?.map((contact: any) => (
                    <div
                      key={`contact-${contact.id}`}
                      className="search-result-item search-result-contact"
                      onClick={() => handleResultClick("contact", contact.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <User className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {contact.firstName} {contact.lastName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {contact.type} • {contact.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Tasks */}
                  {searchResults.tasks?.map((task: any) => (
                    <div
                      key={`task-${task.id}`}
                      className="search-result-item search-result-task"
                      onClick={() => handleResultClick("task", task.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {task.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {task.priority} Task • {task.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* No results */}
                  {(!searchResults.properties?.length && 
                    !searchResults.contacts?.length && 
                    !searchResults.tasks?.length) && (
                    <div className="text-center py-4 text-slate-500">
                      No results found for "{query}"
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <kbd className="kbd">ESC</kbd>
          <span className="text-xs text-slate-500 ml-2">to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
