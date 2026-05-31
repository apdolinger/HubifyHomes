import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  Wifi,
  WifiOff,
  Terminal,
  Code2,
  Monitor,
  FileCode,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PostMessageEvent {
  id: number;
  timestamp: Date;
  type: string;
  data: unknown;
  origin: string;
}

function useClipboard(timeoutMs = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), timeoutMs);
  }, [timeoutMs]);
  return { copied, copy };
}

function CodeBlock({ code, language = "html" }: { code: string; language?: string }) {
  const { copied, copy } = useClipboard();
  return (
    <div className="relative group">
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => copy(code)}
        className="absolute top-2 right-2 h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
      </Button>
    </div>
  );
}

function IframePreview({
  src,
  title,
  onRefresh,
}: {
  src: string;
  title: string;
  onRefresh: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey((k) => k + 1);
    onRefresh();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{title}</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleRefresh} className="h-7 px-2 gap-1 text-xs">
          <RefreshCw className="w-3 h-3" />
          Reload
        </Button>
      </div>
      <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <iframe
          key={key}
          ref={iframeRef}
          src={src}
          title={title}
          className="w-full h-full"
          style={{ minHeight: "520px" }}
          allow="same-origin"
        />
      </div>
    </div>
  );
}

function PostMessagePanel({ events, onClear }: { events: PostMessageEvent[]; onClear: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-teal-600" />
            <CardTitle className="text-base">postMessage Monitor</CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-normal",
                events.length > 0
                  ? "border-green-300 text-green-700 bg-green-50"
                  : "border-slate-200 text-slate-500"
              )}
            >
              <Wifi className="w-3 h-3 mr-1" />
              Listening
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            disabled={events.length === 0}
            className="h-7 px-2 text-xs gap-1 text-slate-500 hover:text-red-600"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </Button>
        </div>
        <CardDescription className="text-xs">
          Captures <code className="font-mono bg-slate-100 px-1 rounded">hubify:form_submitted</code> (and
          any other <code className="font-mono bg-slate-100 px-1 rounded">hubify:*</code>) messages sent
          from the iframes below.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-48 overflow-y-auto px-4 pb-4 font-mono text-xs space-y-1"
        >
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <WifiOff className="w-5 h-5" />
              <span>No messages received yet. Submit a form to test.</span>
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="flex gap-2 items-start bg-slate-50 border border-slate-100 rounded p-2"
              >
                <span className="text-slate-400 shrink-0 tabular-nums">
                  {ev.timestamp.toLocaleTimeString()}
                </span>
                <span className="text-teal-700 font-semibold shrink-0">{ev.type}</span>
                <span className="text-slate-500 break-all">
                  {JSON.stringify(ev.data)}
                </span>
                <span className="text-slate-300 shrink-0 ml-auto">{ev.origin || "same-origin"}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const SNIPPET_SUBMIT = `<!-- Hubify — Submit / Inquiry Form embed -->
<iframe
  src="https://your-domain.hubifyhomesonline.com/submit?embed=true"
  title="Request a Property Management Quote"
  width="100%"
  height="600"
  style="border:none; border-radius:8px;"
  allow="same-origin"
></iframe>

<script>
  /* Optional: listen for submission confirmation */
  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "hubify:form_submitted") {
      console.log("Form submitted!", event.data);
      // e.g. fire your own analytics event or show a thank-you overlay
    }
  });
</script>`;

const SNIPPET_CONTACT = `<!-- Hubify — Contact Form embed -->
<iframe
  src="https://your-domain.hubifyhomesonline.com/contact?embed=true"
  title="Contact Us"
  width="100%"
  height="600"
  style="border:none; border-radius:8px;"
  allow="same-origin"
></iframe>

<script>
  /* Optional: listen for submission confirmation */
  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "hubify:form_submitted") {
      console.log("Form submitted!", event.data);
      // e.g. fire your own analytics event or show a thank-you overlay
    }
  });
</script>`;

export default function AdminEmbedPreview() {
  const [, navigate] = useLocation();
  const [events, setEvents] = useState<PostMessageEvent[]>([]);
  const eventIdRef = useRef(0);
  const { toast } = useToast();

  const clearEvents = () => setEvents([]);

  const handleIframeRefresh = () => {
    toast({ title: "Iframe reloaded", description: "The preview has been refreshed.", duration: 2000 });
  };

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      if (!ev.data || typeof ev.data !== "object") return;
      const { type } = ev.data as Record<string, unknown>;
      if (typeof type !== "string" || !type.startsWith("hubify:")) return;
      setEvents((prev) => [
        ...prev,
        {
          id: ++eventIdRef.current,
          timestamp: new Date(),
          type: type as string,
          data: ev.data,
          origin: ev.origin,
        },
      ]);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin")}
          className="gap-1 text-slate-600 hover:text-slate-900 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Admin Panel
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileCode className="w-6 h-6 text-teal-600" />
            Embed Preview
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Preview how your forms look inside an iframe, grab the embed snippet, and verify the{" "}
            <code className="font-mono bg-slate-100 px-1 rounded text-xs">postMessage</code> event fires
            correctly.
          </p>
        </div>
        <Badge variant="outline" className="text-xs border-teal-200 text-teal-700 bg-teal-50 hidden sm:flex">
          Admin only
        </Badge>
      </div>

      {/* postMessage monitor */}
      <PostMessagePanel events={events} onClear={clearEvents} />

      {/* Tabs: submit / contact */}
      <Tabs defaultValue="submit" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-72">
          <TabsTrigger value="submit" className="gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            /submit
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            /contact
          </TabsTrigger>
        </TabsList>

        {/* ── Submit form tab ── */}
        <TabsContent value="submit" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Live preview */}
            <div className="flex flex-col">
              <IframePreview
                src="/submit?embed=true"
                title="Submit / Inquiry Form"
                onRefresh={handleIframeRefresh}
              />
            </div>

            {/* Embed snippet */}
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  Embed Snippet — Submit Form
                </h2>
                <p className="text-xs text-slate-500 mb-3">
                  Paste this into any page on your website where you want the inquiry form to appear.
                  Replace <code className="font-mono bg-slate-100 px-1 rounded">your-domain</code> with your
                  actual domain.
                </p>
                <CodeBlock code={SNIPPET_SUBMIT} />
              </div>

              <Card className="bg-teal-50 border-teal-100">
                <CardContent className="p-4 text-xs text-teal-800 space-y-1.5">
                  <p className="font-semibold">How to test</p>
                  <ol className="list-decimal list-inside space-y-1 text-teal-700">
                    <li>Fill out and submit the form in the preview on the left.</li>
                    <li>
                      Watch the <strong>postMessage Monitor</strong> panel above — a{" "}
                      <code className="font-mono bg-teal-100 px-1 rounded">hubify:form_submitted</code>{" "}
                      event should appear.
                    </li>
                    <li>Copy the snippet and embed it on your website to confirm it works end-to-end.</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Contact form tab ── */}
        <TabsContent value="contact" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Live preview */}
            <div className="flex flex-col">
              <IframePreview
                src="/contact?embed=true"
                title="Contact Form"
                onRefresh={handleIframeRefresh}
              />
            </div>

            {/* Embed snippet */}
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  Embed Snippet — Contact Form
                </h2>
                <p className="text-xs text-slate-500 mb-3">
                  Paste this into any page on your website where you want the general contact form to appear.
                  Replace <code className="font-mono bg-slate-100 px-1 rounded">your-domain</code> with your
                  actual domain.
                </p>
                <CodeBlock code={SNIPPET_CONTACT} />
              </div>

              <Card className="bg-teal-50 border-teal-100">
                <CardContent className="p-4 text-xs text-teal-800 space-y-1.5">
                  <p className="font-semibold">How to test</p>
                  <ol className="list-decimal list-inside space-y-1 text-teal-700">
                    <li>Fill out and submit the form in the preview on the left.</li>
                    <li>
                      Watch the <strong>postMessage Monitor</strong> panel above — a{" "}
                      <code className="font-mono bg-teal-100 px-1 rounded">hubify:form_submitted</code>{" "}
                      event should appear.
                    </li>
                    <li>Copy the snippet and embed it on your website to confirm it works end-to-end.</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
