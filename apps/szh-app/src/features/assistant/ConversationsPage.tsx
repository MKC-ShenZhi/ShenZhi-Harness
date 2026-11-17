import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { usePageContext, useUI } from '@/app/ui-state';
import { useConversation, useConversations, useCreateConversation, useDeleteConversation, useHealth } from '@/lib/api/queries';
import { relativeTime } from '@/lib/format';
import { Button, Callout, Dialog, EmptyState, ErrorState, QueryView, SkeletonRows, useToast } from '@/components/ui';
import { Composer } from '@/components/assistant/Composer';
import { ThreadComposer, ThreadMessages } from '@/components/assistant/ConversationThread';

/** AI conversations backed by the Harness task service (solution_id = "general"). */
export function ConversationsPage() {
  const { id } = useParams();
  const list = useConversations();
  const conversation = useConversation(id);
  usePageContext([{ label: 'Chats', to: '/conversations' }, ...(conversation.data ? [{ label: conversation.data.title }] : [])]);
  const navigate = useNavigate();
  const toast = useToast();
  const { threads, setThread } = useUI();
  const remove = useDeleteConversation();
  const [pending, setPending] = useState<{ id: string; title: string } | null>(null);

  const confirmDelete = async () => {
    if (!pending) return;
    try {
      await remove.mutateAsync(pending.id);
      for (const [key, value] of Object.entries(threads)) if (value === pending.id) setThread(key, null);
      if (id === pending.id) navigate('/conversations');
      toast({ tone: 'info', message: 'Chat deleted.' });
      setPending(null);
    } catch (e) { toast({ tone: 'danger', message: (e as Error).message }); }
  };

  return (
    <div className="chat-layout">
      <aside className="chat-list">
        <div className="row" style={{ padding: '16px 12px 8px' }}>
          <h2 className="grow" style={{ fontSize: 'var(--text-md)' }}>Chats</h2>
          <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => navigate('/conversations')}>New chat</Button>
        </div>
        <QueryView query={list} compact loading={<SkeletonRows rows={4} />} isEmpty={(d) => d.length === 0} empty={<p className="xs faint" style={{ padding: '4px 12px' }}>No chats yet</p>}>
          {(d) => <div className="stack" style={{ padding: '0 6px', gap: 1 }}>{d.map((c) => (
            <div key={c.id} className={clsx('nav-item chat-item', c.id === id && 'active')}>
              <Link to={`/conversations/${c.id}`} className="truncate grow">{c.title}</Link>
              <span className="xs faint">{relativeTime(c.updatedAt)}</span>
              <button type="button" className="chat-delete" aria-label={`Delete ${c.title}`} title="Delete chat" onClick={() => setPending({ id: c.id, title: c.title })}><Trash2 size={14} /></button>
            </div>))}</div>}
        </QueryView>
      </aside>
      <section className="chat-main">{id ? <Thread id={id} /> : <NewConversation />}</section>
      <Dialog open={pending !== null} onClose={() => { if (!remove.isPending) setPending(null); }} title="Delete this chat?"
        description={pending ? `“${pending.title}” will be removed from this machine. This cannot be undone.` : undefined}
        footer={<><Button onClick={() => setPending(null)} disabled={remove.isPending}>Keep</Button><Button variant="danger" loading={remove.isPending} onClick={confirmDelete}>Delete</Button></>} />
    </div>
  );
}

function NewConversation() {
  const health = useHealth();
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateConversation();
  return (
    <div className="chat-empty">
      <EmptyState icon={<MessageSquare />} title="Discuss a research question" description="Chats are for understanding a question and explaining results. For computation, run a Solution so the run and artifacts stay traceable." />
      {health.data && !health.data.modelConfigured && <Callout tone="warning">Harness has no model configured. Sending a message will not complete.</Callout>}
      <Composer placeholder="Ask a question…" busy={create.isPending} autoFocusKey={1} onSubmit={async (t) => {
        try { const c = await create.mutateAsync(t); navigate(`/conversations/${c.id}`); }
        catch (e) { toast({ tone: 'danger', message: (e as Error).message }); throw e; }
      }} />
    </div>
  );
}

function Thread({ id }: { id: string }) {
  const conversation = useConversation(id);
  if (conversation.isPending) return <div style={{ padding: 32 }}><SkeletonRows rows={3} /></div>;
  if (conversation.isError) return <ErrorState error={conversation.error} onRetry={() => conversation.refetch()} />;
  return (
    <>
      <div className="thread"><ThreadMessages conversation={conversation.data} /></div>
      <div className="thread-composer"><ThreadComposer conversation={conversation.data} /></div>
    </>
  );
}
