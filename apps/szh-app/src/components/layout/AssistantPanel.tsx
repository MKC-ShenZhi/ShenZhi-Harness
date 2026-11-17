import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Boxes, FileText, MessageSquare, Play, Plus, Sparkles, X } from 'lucide-react';
import { useUI, type AssistantContext } from '@/app/ui-state';
import { useDataSource } from '@/lib/api/datasource';
import { ApiError } from '@/lib/api/contract';
import { useConversation, useCreateConversation, useHealth } from '@/lib/api/queries';
import { IconButton, SkeletonRows, useToast } from '@/components/ui';
import { Composer } from '@/components/assistant/Composer';
import { ThreadComposer, ThreadMessages } from '@/components/assistant/ConversationThread';

const suggestions: Record<string, string[]> = {
  solution: ['What problem does this Solution address?', 'What do the input parameters mean?', 'What is outside its scope?'],
  run: ['Explain the current run status', 'Why might this run have failed?', 'How do I run this again?'],
  artifact: ['Help me read this artifact', 'How can these results be reused?'],
  general: ['Which Solution should I use for my data?', 'Which recent runs need attention?'],
};

/** First message carries the page facts (Harness has no context references yet); the question comes first so it titles the conversation. */
function withContext(text: string, context: AssistantContext) {
  if (context.kind === 'general') return text;
  const kind = context.kind === 'solution' ? 'Solution' : context.kind === 'run' ? 'Run' : 'Artifact';
  return [
    text, '',
    `[Context: ${kind} "${context.label}"${context.id ? ` (${context.id})` : ''}]`,
    ...(context.facts ?? []).map((f) => `- ${f.length > 1200 ? f.slice(0, 1200) + '… (truncated)' : f}`),
  ].join('\n');
}

/**
 * Contextual assistant. Conversations stay in the panel and are remembered per page context.
 * It never fakes answers and never submits Runs.
 */
export function AssistantPanel() {
  const { setAssistantOpen, context, threads, setThread } = useUI();
  const { kind } = useDataSource();
  const health = useHealth();
  const toast = useToast();
  const create = useCreateConversation();
  const threadKey = `${kind}:${context.kind}:${context.id ?? context.label}`;
  const threadId = threads[threadKey];
  const conversation = useConversation(threadId);
  const Icon = context.kind === 'solution' ? Boxes : context.kind === 'run' ? Play : context.kind === 'artifact' ? FileText : MessageSquare;
  const modelReady = kind === 'mock' || health.data?.modelConfigured;

  // A remembered conversation that no longer exists (data reset, other data source) is forgotten.
  useEffect(() => {
    if (threadId && conversation.error instanceof ApiError && conversation.error.status === 404) setThread(threadKey, null);
  }, [threadId, threadKey, conversation.error, setThread]);

  const ask = async (text: string) => {
    try {
      const c = await create.mutateAsync(withContext(text, context));
      setThread(threadKey, c.id);
    } catch (error) {
      toast({ tone: 'danger', message: (error as Error).message });
      throw error;
    }
  };

  return (
    <aside className="assistant" aria-label="AI assistant">
      <div className="assistant-head">
        <Sparkles className="spark" /><h2>AI assistant</h2><span className="grow" />
        {threadId && <>
          <Link to={`/conversations/${threadId}`} className="icon-btn icon-btn-sm" title="Open in Chats" aria-label="Open in Chats"><ArrowUpRight /></Link>
          <IconButton size="sm" label="New chat" onClick={() => setThread(threadKey, null)}><Plus /></IconButton>
        </>}
        <IconButton size="sm" label="Close (Ctrl+J)" onClick={() => setAssistantOpen(false)}><X /></IconButton>
      </div>
      <div className="assistant-context"><Icon size={14} />Context: <strong className="truncate" style={{ color: 'var(--text-primary)' }}>{context.label}</strong></div>
      <div className="assistant-body">
        {threadId && conversation.data ? (
          <div className="assistant-thread"><ThreadMessages conversation={conversation.data} /></div>
        ) : threadId && conversation.isPending ? (
          <SkeletonRows rows={2} />
        ) : (
          <>
            <p className="small muted">The assistant can explain Solutions, runs, and artifacts, and help you plan a task. Questions include the current page record. Use the Solution form to start a real run. The assistant does not submit runs for you.</p>
            {!modelReady && !health.isPending && (
              <p className="small" style={{ color: 'var(--warning)' }}>Harness has no model configured, so questions will fail. Add it to the server .env and try again.</p>
            )}
            <div className="stack" style={{ gap: 6 }}>
              {(suggestions[context.kind] ?? suggestions.general).map((s) => (
                <button key={s} className="suggestion" disabled={create.isPending} onClick={() => void ask(s).catch(() => {})}><Sparkles />{s}</button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="assistant-foot">
        {threadId && conversation.data
          ? <ThreadComposer compact conversation={conversation.data} placeholder="Ask a follow-up…" />
          : <Composer compact placeholder={`Ask about ${context.label}…`} busy={create.isPending} onSubmit={ask} />}
      </div>
    </aside>
  );
}
