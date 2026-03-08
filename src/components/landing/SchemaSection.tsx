import { useNavigate } from 'react-router-dom';
import { Terminal, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function SchemaSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-6 border-t border-border/20">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          Dead-simple event schema
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-md mx-auto">
          Just POST JSON with a source, type, and title. That's it.
        </p>

        <div className="rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-muted/20">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono">POST /ingest</span>
          </div>
          <pre className="px-5 py-4 text-sm font-mono text-foreground/85 overflow-x-auto leading-relaxed">
{`{
  "source": "my-agent",
  "eventType": "success",
  "title": "Task completed",
  "body": "Processed 142 records in 3.2s",
  "severity": 2,
  "tags": ["pipeline", "data"]
}`}
          </pre>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {['success', 'error', 'message', 'warning', 'deploy', 'incident'].map((t) => (
            <Badge key={t} variant="secondary" className="font-mono text-[11px]">{t}</Badge>
          ))}
        </div>

        <p className="text-center mt-4">
          <button
            onClick={() => navigate('/docs#schema')}
            className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
          >
            Full schema reference <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </p>
      </div>
    </section>
  );
}
