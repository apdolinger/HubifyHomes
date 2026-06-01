import { useEffect } from 'react';
import { useLocation, useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, Loader2, CheckCircle2, XCircle, MinusCircle, Circle, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';

interface ChecklistItem {
  id: string;
  text: string;
  result: 'pass' | 'fail' | 'na' | null;
  resultNote: string | null;
  photoUrl: string | null;
  photoUrls: string[] | null;
  category: string | null;
  notes: string | null;
}

interface InspectionTask {
  id: number;
  title: string;
  description: string | null;
  status: string;
  completedAt: string | null;
  dueDate: string | null;
  propertyId: number | null;
  property?: { name: string; address1?: string; city?: string; state?: string } | null;
}

interface InspectionReport {
  task: InspectionTask;
  checklistItems: ChecklistItem[];
  summary: {
    passCount: number;
    failCount: number;
    naCount: number;
    pendingCount: number;
  };
}

function ResultIcon({ result }: { result: ChecklistItem['result'] }) {
  if (result === 'pass') return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
  if (result === 'fail') return <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
  if (result === 'na') return <MinusCircle className="h-4 w-4 text-gray-400 shrink-0" />;
  return <Circle className="h-4 w-4 text-gray-300 shrink-0" />;
}

function ResultBadge({ result }: { result: ChecklistItem['result'] }) {
  if (result === 'pass')
    return <Badge className="text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700">Pass</Badge>;
  if (result === 'fail')
    return <Badge className="text-xs bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700">Fail</Badge>;
  if (result === 'na')
    return <Badge variant="outline" className="text-xs text-gray-500">N/A</Badge>;
  return <Badge variant="outline" className="text-xs text-gray-400">Pending</Badge>;
}

export default function PortalInspectionReport() {
  const { id } = useParams<{ id: string }>();
  const { user, token, isLoading: authLoading } = usePortalAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) setLocation('/portal/login');
  }, [user, authLoading, setLocation]);

  const { data, isLoading, isError } = useQuery<InspectionReport>({
    queryKey: ['/api/portal/inspections', user?.id, id],
    queryFn: async () => {
      const res = await fetch(`/api/portal/inspections/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load report');
      return res.json();
    },
    enabled: !!token && !!user?.id && !!id,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  const { task, checklistItems = [], summary } = data ?? {};
  const totalScored = (summary?.passCount ?? 0) + (summary?.failCount ?? 0);
  const scorePercent = totalScored > 0 ? Math.round(((summary?.passCount ?? 0) / totalScored) * 100) : null;

  const categories = Array.from(
    new Set(checklistItems.map((i) => i.category || 'General'))
  );

  const pdfUrl = `/api/portal/inspections/${id}/pdf`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/portal">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Portal
              </Button>
            </Link>
            <h1 className="text-lg font-semibold hidden sm:block">Inspection Report</h1>
          </div>
          {!isLoading && !isError && data && (
            <a href={pdfUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </a>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {isLoading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </>
        ) : isError || !data ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>This inspection report could not be found.</p>
              <Link href="/portal">
                <Button variant="link" className="mt-2">Back to Portal</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Report header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-xl">{task!.title}</CardTitle>
                    {task!.property && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task!.property.name}
                        {task!.property.address1 && ` • ${task!.property.address1}`}
                        {task!.property.city && `, ${task!.property.city}`}
                        {task!.property.state && `, ${task!.property.state}`}
                      </p>
                    )}
                    {task!.description && (
                      <p className="text-sm mt-2 text-muted-foreground leading-relaxed">{task!.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700 dark:text-green-400 shrink-0">
                    Completed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {task!.completedAt && (
                    <span>Completed: {format(new Date(task!.completedAt), 'MMMM d, yyyy')}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {checklistItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3">
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">{summary!.passCount}</p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">Pass</p>
                    </div>
                    <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
                      <p className="text-2xl font-bold text-red-700 dark:text-red-400">{summary!.failCount}</p>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">Fail</p>
                    </div>
                    <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3">
                      <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{summary!.naCount}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">N/A</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                      <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                        {scorePercent !== null ? `${scorePercent}%` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Score</p>
                    </div>
                  </div>
                  {scorePercent !== null && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-green-500 transition-all"
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Checklist by category */}
            {checklistItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No checklist items recorded for this inspection.
                </CardContent>
              </Card>
            ) : (
              categories.map((cat) => {
                const items = checklistItems.filter((i) => (i.category || 'General') === cat);
                return (
                  <Card key={cat}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{cat}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="divide-y">
                        {items.map((item) => {
                          const photos = [
                            ...(item.photoUrls ?? []),
                            ...(item.photoUrl && !item.photoUrls?.includes(item.photoUrl) ? [item.photoUrl] : []),
                          ].filter(Boolean);
                          return (
                            <li key={item.id} className="px-6 py-4 space-y-2">
                              <div className="flex items-start gap-3">
                                <ResultIcon result={item.result} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">{item.text}</span>
                                    <ResultBadge result={item.result} />
                                  </div>
                                  {item.resultNote && (
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.resultNote}</p>
                                  )}
                                  {item.notes && item.notes !== item.resultNote && (
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed italic">{item.notes}</p>
                                  )}
                                </div>
                              </div>
                              {photos.length > 0 && (
                                <div className="flex flex-wrap gap-2 pl-7">
                                  {photos.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer">
                                      <img
                                        src={url}
                                        alt={`Photo ${i + 1}`}
                                        className="h-20 w-20 object-cover rounded-md border hover:opacity-90 transition-opacity"
                                      />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })
            )}

            {/* Fail items summary (if any fails) */}
            {(summary?.failCount ?? 0) > 0 && (
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-red-700 dark:text-red-400 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Items Requiring Attention ({summary!.failCount})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {checklistItems.filter((i) => i.result === 'fail').map((item) => (
                      <li key={item.id} className="px-6 py-3">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">{item.text}</p>
                        {item.category && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                        )}
                        {item.resultNote && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.resultNote}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* PDF download footer */}
            <div className="flex justify-center pb-4">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Full Report PDF
                </Button>
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
