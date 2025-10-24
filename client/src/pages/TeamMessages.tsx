import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageSquare,
  Edit2,
  Trash2,
  Check,
  X,
  Reply,
  Mail,
  ArrowLeft
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";

// Helper function to render message content with highlighted @mentions
function renderMessageWithMentions(content: string) {
  const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>{content.substring(lastIndex, match.index)}</span>
      );
    }

    // Add the highlighted mention
    parts.push(
      <span 
        key={`mention-${key++}`}
        className="bg-blue-100 text-blue-800 px-1 rounded"
      >
        @{match[1]}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${key++}`}>{content.substring(lastIndex)}</span>
    );
  }

  return <>{parts}</>;
}

export default function TeamMessages() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [emailNotification, setEmailNotification] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Check authentication
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

  // Fetch all team messages
  const { data: teamMessages = [], isLoading: teamMessagesLoading } = useQuery<any[]>({
    queryKey: ["/api/team-messages"],
    enabled: isAuthenticated,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (teamMessages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [teamMessages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, emailNotification }: { content: string; emailNotification: boolean }) => {
      return await apiRequest("POST", "/api/team-messages", { content, emailNotification });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-messages"] });
      setNewMessage("");
      setEmailNotification(false);
      toast({
        title: "Message sent",
        description: "Your message has been sent to the team.",
      });
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
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      return await apiRequest("PUT", `/api/team-messages/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-messages"] });
      setEditingMessageId(null);
      setEditingContent("");
      toast({
        title: "Message updated",
        description: "Your message has been updated.",
      });
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
        description: "Failed to update message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/team-messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-messages"] });
      toast({
        title: "Message deleted",
        description: "The message has been deleted.",
      });
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
        description: "Failed to delete message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reaction mutation
  const reactionMutation = useMutation({
    mutationFn: async ({ messageId, reaction }: { messageId: number; reaction: string }) => {
      return await apiRequest("POST", `/api/team-messages/${messageId}/reactions`, { reaction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-messages"] });
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
        description: "Failed to add reaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ messageId, content, emailNotification }: { messageId: number; content: string; emailNotification: boolean }) => {
      return await apiRequest("POST", `/api/team-messages/${messageId}/reply`, { content, emailNotification });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/team-messages"] });
      setReplyingToId(null);
      setReplyContent("");
      setEmailNotification(false);
      toast({
        title: "Reply sent",
        description: "Your reply has been sent.",
      });
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
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate({ content: newMessage.trim(), emailNotification });
  };

  const handleEditMessage = (message: any) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleSaveEdit = () => {
    if (!editingContent.trim() || !editingMessageId) return;
    editMessageMutation.mutate({ id: editingMessageId, content: editingContent.trim() });
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleDeleteMessage = (messageId: number) => {
    if (confirm("Are you sure you want to delete this message?")) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const handleReaction = (messageId: number, reaction: string) => {
    reactionMutation.mutate({ messageId, reaction });
  };

  const handleStartReply = (messageId: number) => {
    setReplyingToId(messageId);
    setReplyContent("");
  };

  const handleSendReply = () => {
    if (!replyContent.trim() || !replyingToId) return;
    replyMutation.mutate({ 
      messageId: replyingToId, 
      content: replyContent.trim(),
      emailNotification 
    });
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyContent("");
    setEmailNotification(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const days = Math.floor(diffInHours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-screen flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/")}
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 flex items-center">
                <MessageSquare className="w-8 h-8 mr-3 text-primary" />
                Team Messages
              </h1>
              <p className="text-slate-600 mt-1">Communicate with your team</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container with Scrolling */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="text-lg font-medium flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Scrollable Messages Area */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4"
            style={{ maxHeight: 'calc(100vh - 400px)' }}
          >
            {teamMessagesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded animate-pulse"></div>
                ))}
              </div>
            ) : teamMessages && Array.isArray(teamMessages) && teamMessages.length > 0 ? (
              teamMessages.map((message: any) => (
                <div key={message.id} className="flex space-x-3 group">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={message.author?.profileImageUrl} />
                    <AvatarFallback>
                      {message.author?.firstName?.[0]}{message.author?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    {editingMessageId === message.id ? (
                      <div className="space-y-2 bg-slate-50 p-3 rounded-lg">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="text-sm resize-none min-h-0"
                          rows={4}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit();
                            }
                            if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                          data-testid={`textarea-edit-message-${message.id}`}
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={editMessageMutation.isPending || !editingContent.trim()}
                            data-testid={`button-save-edit-${message.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            data-testid={`button-cancel-edit-${message.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-medium text-sm text-slate-900">
                              {message.author?.firstName} {message.author?.lastName}
                            </p>
                            <div className="flex items-center space-x-1">
                              {/* Reaction buttons */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleReaction(message.id, "👍")}
                                  className="h-7 w-7 p-0 text-sm hover:bg-slate-200"
                                  title="Like"
                                  data-testid={`button-reaction-thumbs-${message.id}`}
                                >
                                  👍
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleReaction(message.id, "❤️")}
                                  className="h-7 w-7 p-0 text-sm hover:bg-slate-200"
                                  title="Love"
                                  data-testid={`button-reaction-heart-${message.id}`}
                                >
                                  ❤️
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleReaction(message.id, "😄")}
                                  className="h-7 w-7 p-0 text-sm hover:bg-slate-200"
                                  title="Laugh"
                                  data-testid={`button-reaction-laugh-${message.id}`}
                                >
                                  😄
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartReply(message.id)}
                                  className="h-7 w-7 p-0 hover:bg-slate-200"
                                  title="Reply"
                                  data-testid={`button-reply-${message.id}`}
                                >
                                  <Reply className="w-4 h-4" />
                                </Button>
                              </div>
                              {/* Edit/Delete buttons for message author */}
                              {user && message.authorId === user.id && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditMessage(message)}
                                    className="h-7 w-7 p-0 hover:bg-slate-200"
                                    data-testid={`button-edit-${message.id}`}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    data-testid={`button-delete-${message.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-slate-900 whitespace-pre-wrap" data-testid={`message-content-${message.id}`}>
                            {renderMessageWithMentions(message.content)}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-slate-500">
                            <span>{formatTimeAgo(message.createdAt)}</span>
                            {message.isEdited && <span className="ml-2">(edited)</span>}
                            {message.emailNotification && <Mail className="w-3 h-3 inline ml-2" />}
                          </div>
                        </div>

                        {/* Display reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(
                              message.reactions.reduce((acc: any, reaction: any) => {
                                const key = reaction.reaction;
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(reaction);
                                return acc;
                              }, {})
                            ).map(([emoji, reactions]: [string, any]) => {
                              const userReacted = (reactions as any[]).some((r: any) => r.userId === user?.id);
                              return (
                                <Button
                                  key={emoji}
                                  size="sm"
                                  variant={userReacted ? "default" : "outline"}
                                  onClick={() => handleReaction(message.id, emoji)}
                                  className={`h-7 text-sm px-2 ${userReacted ? 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200' : ''}`}
                                  data-testid={`reaction-${emoji}-${message.id}`}
                                >
                                  {emoji} {(reactions as any[]).length}
                                </Button>
                              );
                            })}
                          </div>
                        )}

                        {/* Display replies */}
                        {message.replies && message.replies.length > 0 && (
                          <div className="mt-3 ml-4 pl-4 border-l-2 border-slate-200 space-y-3">
                            {message.replies.map((reply: any) => (
                              <div key={reply.id} className="text-sm">
                                <div className="flex items-start space-x-2">
                                  <Avatar className="h-6 w-6 flex-shrink-0">
                                    <AvatarImage src={reply.author?.profileImageUrl} />
                                    <AvatarFallback className="text-xs">
                                      {reply.author?.firstName?.[0]}{reply.author?.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 bg-slate-100 p-2 rounded">
                                    <p className="font-medium text-xs text-slate-900">
                                      {reply.author?.firstName} {reply.author?.lastName}
                                    </p>
                                    <p className="text-sm text-slate-900 mt-1" data-testid={`reply-content-${reply.id}`}>
                                      {reply.content}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      {formatTimeAgo(reply.createdAt)}
                                      {reply.isEdited && " (edited)"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply input */}
                        {replyingToId === message.id && (
                          <div className="mt-3 ml-4 space-y-2 bg-slate-50 p-3 rounded-lg">
                            <Textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Write a reply..."
                              className="text-sm resize-none min-h-0"
                              rows={3}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendReply();
                                }
                                if (e.key === "Escape") {
                                  handleCancelReply();
                                }
                              }}
                              data-testid={`textarea-reply-${message.id}`}
                            />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`reply-email-${message.id}`}
                                  checked={emailNotification}
                                  onCheckedChange={(checked) => setEmailNotification(!!checked)}
                                  data-testid={`checkbox-email-reply-${message.id}`}
                                />
                                <label htmlFor={`reply-email-${message.id}`} className="text-sm text-slate-600">
                                  Email team members
                                </label>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={handleSendReply}
                                  disabled={replyMutation.isPending || !replyContent.trim()}
                                  data-testid={`button-send-reply-${message.id}`}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Send
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelReply}
                                  data-testid={`button-cancel-reply-${message.id}`}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-lg">No messages yet</p>
                <p className="text-slate-400 text-sm mt-1">Start the conversation!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* New Message Input - Fixed at bottom */}
          <div className="flex-shrink-0 border-t bg-white p-6">
            <div className="space-y-3">
              <Textarea
                placeholder="Send a message to your team..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full resize-none"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                data-testid="textarea-new-message"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="message-email"
                    checked={emailNotification}
                    onCheckedChange={(checked) => setEmailNotification(!!checked)}
                    data-testid="checkbox-email-notification"
                  />
                  <label htmlFor="message-email" className="text-sm text-slate-600">
                    Email team members
                  </label>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || !newMessage.trim()}
                  data-testid="button-send-message"
                >
                  {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
