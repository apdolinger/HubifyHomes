import React, { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  ExternalLink,
  BookOpen,
  Search,
  HelpCircle,
  Lightbulb,
  X,
  Send
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

// Sample support articles database
const supportArticles: SupportArticle[] = [
  {
    id: '1',
    title: 'Getting Started with Property Management',
    description: 'Learn the basics of adding and managing properties in Hubify',
    category: 'Getting Started',
    url: '/help/getting-started-properties',
    keywords: ['property', 'add', 'create', 'manage', 'basic', 'setup', 'new']
  },
  {
    id: '2',
    title: 'How to Create and Assign Tasks',
    description: 'Step-by-step guide to creating tasks and assigning them to team members',
    category: 'Task Management',
    url: '/help/create-assign-tasks',
    keywords: ['task', 'create', 'assign', 'team', 'member', 'workflow', 'to-do']
  },
  {
    id: '3',
    title: 'Managing Team Members and Permissions',
    description: 'Add team members, set roles, and configure permissions',
    category: 'Team Management',
    url: '/help/team-permissions',
    keywords: ['team', 'member', 'user', 'permission', 'role', 'access', 'admin']
  },
  {
    id: '4',
    title: 'Setting Up Contact Information',
    description: 'How to add and manage property contacts, tenants, and vendors',
    category: 'Contacts',
    url: '/help/contact-management',
    keywords: ['contact', 'tenant', 'vendor', 'owner', 'phone', 'email', 'people']
  },
  {
    id: '5',
    title: 'Dashboard Customization Guide',
    description: 'Personalize your dashboard with widgets and layout options',
    category: 'Dashboard',
    url: '/help/dashboard-customization',
    keywords: ['dashboard', 'customize', 'widget', 'layout', 'personalize', 'arrange']
  },
  {
    id: '6',
    title: 'Using Quick Search and Keyboard Shortcuts',
    description: 'Master time-saving shortcuts and search functionality',
    category: 'Productivity',
    url: '/help/shortcuts-search',
    keywords: ['search', 'shortcut', 'keyboard', 'quick', 'fast', 'productivity', 'hotkey']
  },
  {
    id: '7',
    title: 'Billing and Subscription Management',
    description: 'Manage your account billing, plans, and payment methods',
    category: 'Account',
    url: '/help/billing-subscription',
    keywords: ['billing', 'payment', 'subscription', 'plan', 'invoice', 'account', 'upgrade']
  },
  {
    id: '8',
    title: 'Troubleshooting Login Issues',
    description: 'Common solutions for login and authentication problems',
    category: 'Account',
    url: '/help/login-troubleshooting',
    keywords: ['login', 'password', 'authentication', 'access', 'signin', 'locked', 'error']
  },
  {
    id: '9',
    title: 'Setting Up Property Inspections',
    description: 'Create recurring inspection schedules and checklists',
    category: 'Property Management',
    url: '/help/property-inspections',
    keywords: ['inspection', 'schedule', 'checklist', 'recurring', 'maintenance', 'visit']
  },
  {
    id: '10',
    title: 'Generating Reports and Analytics',
    description: 'Create custom reports and view performance analytics',
    category: 'Reports',
    url: '/help/reports-analytics',
    keywords: ['report', 'analytics', 'data', 'export', 'performance', 'statistics', 'chart']
  }
];

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [suggestedArticles, setSuggestedArticles] = useState<SupportArticle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
      // Simulate API call to submit support request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Support Request Submitted",
        description: "We've received your request and will respond within 24 hours.",
      });
      
      // Reset form
      setSubject('');
      setMessage('');
      setEmail('');
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

  const handleOpenArticle = (url: string) => {
    // In a real app, this would navigate to the help article
    window.open(`https://help.hubifyhomes.app${url}`, '_blank');
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
            Tell us how we can help you. As you type, we'll suggest relevant help articles that might solve your issue immediately.
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

          {/* Suggested Articles */}
          {suggestedArticles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
                <h4 className="font-medium text-sm">Suggested Help Articles</h4>
              </div>
              <div className="space-y-2">
                {suggestedArticles.map((article) => (
                  <Card key={article.id} className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <h5 className="font-medium text-blue-900">{article.title}</h5>
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                              {article.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-blue-700">{article.description}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                          onClick={() => handleOpenArticle(article.url)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-xs text-slate-600">
                💡 These articles might help solve your issue without waiting for a response.
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

        {/* Additional Help Section */}
        <div className="border-t pt-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 mb-1">Need Immediate Help?</h4>
                <p className="text-sm text-slate-600 mb-3">
                  For urgent issues, you can also reach us directly:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    📞 (555) 123-4567
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    💬 Live Chat
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    📚 Full Help Center
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}