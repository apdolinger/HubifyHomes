import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  ExternalLink,
  BookOpen,
  Search,
  HelpCircle,
  Lightbulb,
  X,
  Send,
  Link,
  Upload,
  FileText,
  Image,
  Paperclip
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SupportArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  keywords: string[];
}

// Suggested-articles feature is intentionally disabled until a real
// help-content backend exists. The empty array short-circuits the
// suggestion useEffect so no fake "help.hubifyhomes.app" links are
// ever rendered.
const supportArticles: SupportArticle[] = [];

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [urgency, setUrgency] = useState<'low'|'medium'|'high'|'critical'>('medium');
  const [hyperlinks, setHyperlinks] = useState<string[]>(['']);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [suggestedArticles, setSuggestedArticles] = useState<SupportArticle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // File upload handlers
  const handleFileUpload = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Allow common file types: images, documents, text files
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 10MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        return false;
      }
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Unsupported File Type",
          description: `${file.name} is not a supported file type.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
      toast({
        title: "Files Added",
        description: `${validFiles.length} file(s) attached successfully.`,
      });
    }
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const addHyperlink = () => {
    setHyperlinks(prev => [...prev, '']);
  };

  const updateHyperlink = (index: number, value: string) => {
    setHyperlinks(prev => prev.map((link, i) => i === index ? value : link));
  };

  const removeHyperlink = (index: number) => {
    if (hyperlinks.length > 1) {
      setHyperlinks(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Function to calculate relevance score for articles
  const calculateRelevance = (article: SupportArticle, searchText: string): number => {
    if (!searchText.trim()) return 0;
    
    const searchWords = searchText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    let score = 0;
    
    searchWords.forEach(word => {
      // Check title (higher weight)
      if (article.title.toLowerCase().includes(word)) {
        score += 5;
      }
      
      // Check description
      if (article.description.toLowerCase().includes(word)) {
        score += 3;
      }
      
      // Check keywords (highest weight)
      article.keywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())) {
          score += 7;
        }
      });
    });
    
    return score;
  };

  // Update suggested articles when subject or message changes
  useEffect(() => {
    const searchText = `${subject} ${message}`.trim();
    
    if (searchText.length < 3) {
      setSuggestedArticles([]);
      return;
    }

    const articlesWithScores = supportArticles
      .map(article => ({
        ...article,
        relevanceScore: calculateRelevance(article, searchText)
      }))
      .filter(article => article.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);

    setSuggestedArticles(articlesWithScores);
  }, [subject, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim() || !email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload attachments to object storage
      const attachmentUrls: string[] = [];
      
      for (const file of attachments) {
        const formData = new FormData();
        formData.append('files', file);
        formData.append('directory', '.private/support-attachments');
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload attachment');
        }
        
        const uploadData = await uploadResponse.json();
        if (uploadData.urls && uploadData.urls.length > 0) {
          attachmentUrls.push(uploadData.urls[0]);
        }
      }
      
      // Filter out empty hyperlinks
      const validHyperlinks = hyperlinks.filter(link => link.trim().length > 0);
      
      // Submit support request
      const response = await fetch('/api/support-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          email: email.trim(),
          urgency,
          hyperlinks: validHyperlinks,
          attachmentUrls,
          status: 'new',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit support request');
      }
      
      toast({
        title: "Support Request Submitted",
        description: "We've received your request and will respond within 24 hours.",
      });
      
      // Reset form
      setSubject('');
      setMessage('');
      setEmail('');
      setUrgency('medium');
      setHyperlinks(['']);
      setAttachments([]);
      setSuggestedArticles([]);
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit support request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenArticle = (_url: string) => {
    // No-op until a real help-content destination exists.
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Contact Support
          </DialogTitle>
          <DialogDescription>
            Tell us how we can help you. The Hubify support team will reply by email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Brief description of your issue..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Please describe your issue in detail. Include any steps you've already tried..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
            />
          </div>

          {/* Urgency Level */}
          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency Level *</Label>
            <Select value={urgency} onValueChange={(value: 'low'|'medium'|'high'|'critical') => setUrgency(value)}>
              <SelectTrigger id="urgency" data-testid="select-urgency">
                <SelectValue placeholder="Select urgency level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low" data-testid="urgency-low">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">Low</Badge>
                    <span className="text-sm text-slate-600">- General questions, non-urgent</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium" data-testid="urgency-medium">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">Medium</Badge>
                    <span className="text-sm text-slate-600">- Needs attention soon</span>
                  </div>
                </SelectItem>
                <SelectItem value="high" data-testid="urgency-high">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">High</Badge>
                    <span className="text-sm text-slate-600">- Urgent, affecting work</span>
                  </div>
                </SelectItem>
                <SelectItem value="critical" data-testid="urgency-critical">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-red-100 text-red-700">Critical</Badge>
                    <span className="text-sm text-slate-600">- Emergency, system down</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Help us prioritize your request by selecting the urgency level</p>
          </div>

          {/* Hyperlinks Section */}
          <div className="space-y-3">
            <Label className="flex items-center">
              <Link className="w-4 h-4 mr-2" />
              Helpful Links (Optional)
            </Label>
            <p className="text-sm text-slate-600">
              Share any relevant links that might help us understand your issue
            </p>
            <div className="space-y-2">
              {hyperlinks.map((link, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder="https://example.com or internal page reference"
                    value={link}
                    onChange={(e) => updateHyperlink(index, e.target.value)}
                    className="flex-1"
                  />
                  {hyperlinks.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeHyperlink(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHyperlink}
                className="text-blue-600 hover:text-blue-800"
              >
                <Link className="w-4 h-4 mr-2" />
                Add Another Link
              </Button>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-3">
            <Label className="flex items-center">
              <Paperclip className="w-4 h-4 mr-2" />
              Attachments (Optional)
            </Label>
            <p className="text-sm text-slate-600">
              Upload screenshots, documents, or other files to help explain your issue
            </p>
            
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 mb-1">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-slate-500">
                Supports: Images (JPG, PNG, GIF), Documents (PDF, DOC), Text files
              </p>
              <p className="text-xs text-slate-500">
                Max 10MB per file
              </p>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button type="button" variant="outline" size="sm" className="mt-3" asChild>
                  <span className="cursor-pointer">
                    Choose Files
                  </span>
                </Button>
              </label>
            </div>

            {/* Attached Files List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-700">Attached Files:</h4>
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <div className="flex items-center space-x-2">
                        {file.type.startsWith('image/') ? (
                          <Image className="w-4 h-4 text-green-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="text-sm text-slate-700">{file.name}</span>
                        <span className="text-xs text-slate-500">
                          ({(file.size / 1024 / 1024).toFixed(1)}MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Suggested Articles — intentionally hidden until a real help-content backend exists. */}
          {false && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Help articles will appear here once the help center is available.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}