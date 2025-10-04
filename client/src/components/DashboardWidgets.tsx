import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SupportModal from "@/components/SupportModal";
import { 
  Calendar, 
  HelpCircle, 
  UserX, 
  Clock,
  ExternalLink,
  BookOpen,
  Lightbulb,
  Users,
  Eye,
  ArrowRight
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

interface CalendarWidgetProps {
  className?: string;
}

export function CalendarWidget({ className }: CalendarWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <div>
              <p className="font-medium text-blue-900">Property Inspection</p>
              <p className="text-sm text-blue-700">123 Oak Street</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-blue-900">Today</p>
              <p className="text-xs text-blue-700">2:00 PM</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <div>
              <p className="font-medium text-yellow-900">Maintenance Visit</p>
              <p className="text-sm text-yellow-700">456 Pine Avenue</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-yellow-900">Tomorrow</p>
              <p className="text-xs text-yellow-700">10:00 AM</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
            <div>
              <p className="font-medium text-green-900">Team Meeting</p>
              <p className="text-sm text-green-700">Weekly sync</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-900">Friday</p>
              <p className="text-xs text-green-700">9:00 AM</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = '/calendar'}
            data-testid="button-view-full-calendar"
          >
            <Calendar className="w-4 h-4 mr-2" />
            View Full Calendar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface SupportWidgetProps {
  className?: string;
  externalModalOpen?: boolean;
  onExternalModalChange?: (open: boolean) => void;
}

export function SupportWidget({ className, externalModalOpen, onExternalModalChange }: SupportWidgetProps) {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const isModalOpen = externalModalOpen !== undefined ? externalModalOpen : internalModalOpen;
  const setModalOpen = onExternalModalChange || setInternalModalOpen;

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HelpCircle className="w-5 h-5 mr-2" />
            Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => window.open('https://help.hubifyhomes.app', '_blank')}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Help Documentation
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => window.open('https://help.hubifyhomes.app/videos', '_blank')}
              >
                <Users className="w-4 h-4 mr-2" />
                Training Videos
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => window.open('https://help.hubifyhomes.app/tips', '_blank')}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Tips & Tricks
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3">
              <h4 className="font-medium text-slate-900 mb-1">Quick Tip</h4>
              <p className="text-sm text-slate-600">
                Press "?" to open support, or "T" to quickly add a new task from anywhere.
              </p>
            </div>
            
            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => setModalOpen(true)}
              data-testid="button-contact-support"
            >
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

interface DuplicatesWidgetProps {
  className?: string;
}

export function DuplicatesWidget({ className }: DuplicatesWidgetProps) {
  const [, setLocation] = useLocation();

  const handleReviewContact = (contactName: string) => {
    // Navigate to duplicates management page to review the specific contact duplicate
    setLocation("/duplicates");
  };

  const handleReviewProperty = (propertyAddress: string) => {
    // Navigate to duplicates management page to review the specific property duplicate
    setLocation("/duplicates");
  };

  const handleViewAllDuplicates = () => {
    // Navigate to the dedicated duplicates management page
    setLocation("/duplicates");
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <UserX className="w-5 h-5 mr-2" />
            Duplicates
          </div>
          <Badge variant="secondary">3 found</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
            <div>
              <p className="font-medium text-orange-900">John Smith</p>
              <p className="text-sm text-orange-700">Possible duplicate contact</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleReviewContact("John Smith")}
              className="hover:bg-orange-100"
            >
              <Eye className="w-3 h-3 mr-1" />
              Review
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <div>
              <p className="font-medium text-red-900">456 Oak Street</p>
              <p className="text-sm text-red-700">Similar property address</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleReviewProperty("456 Oak Street")}
              className="hover:bg-red-100"
            >
              <Eye className="w-3 h-3 mr-1" />
              Review
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <div>
              <p className="font-medium text-yellow-900">Sarah Johnson</p>
              <p className="text-sm text-yellow-700">Phone number match</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleReviewContact("Sarah Johnson")}
              className="hover:bg-yellow-100"
            >
              <Eye className="w-3 h-3 mr-1" />
              Review
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full hover:bg-slate-50" 
            onClick={handleViewAllDuplicates}
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            View All Duplicates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}