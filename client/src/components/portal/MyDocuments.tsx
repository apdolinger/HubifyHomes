import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { format } from 'date-fns';

interface PortalDocument {
  id: number;
  communityId: number;
  propertyId: number | null;
  documentType: string;
  classification: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export default function MyDocuments() {
  const { token, user } = usePortalAuth();
  const { data, isLoading } = useQuery<PortalDocument[]>({
    queryKey: ['/api/portal/documents', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/portal/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load documents');
      return res.json();
    },
    enabled: !!token && !!user?.id,
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (!data || data.length === 0) {
    return (
      <Card data-testid="empty-documents">
        <CardContent className="py-10 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No documents have been shared with you yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {data.map((doc) => (
          <div key={doc.id} className="p-4 flex items-center justify-between gap-4" data-testid={`document-${doc.id}`}>
            <div className="flex items-start gap-3 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium truncate">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {doc.documentType.replace(/_/g, ' ')} • Uploaded {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-3 w-3 mr-1" /> Download
              </a>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
