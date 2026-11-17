import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Boxes, Check, MessageSquare, Sparkles } from 'lucide-react';
import type { Solution } from '@/types/domain';
import { usePageContext } from '@/app/ui-state';
import { backendName, useDataSource } from '@/lib/api/datasource';
import { useCreateConversation, useSolutions } from '@/lib/api/queries';
import { Button, ButtonLink, Callout, DemoTag, EmptyState, Glyph, QueryView, SkeletonRows, useToast } from '@/components/ui';
import { RunConfigurator } from '@/features/solutions/RunConfigurator';

/** Keyword relevance. Deliberately simple and labelled as such until model-based planning exists in Harness. */
export function rankSolutions(query: string, solutions: Solution[]) {
  const q = query.toLowerCase();
  const grams = new Set<string>();
  for (const w of q.match(/[a-z0-9]+/g) ?? []) if (w.length > 1) grams.add(w);
  const han = q.replace(/[^\p{Script=Han}]/gu, '');
  for (let i = 0; i < han.length - 1; i++) grams.add(han.slice(i, i + 2));
  return solutions
    .map((s) => {
      const hay = [s.name, s.description, s.domain, ...s.tags].join(' ').toLowerCase();
      const score = [...grams].reduce((n, g) => n + (hay.includes(g) ? 1 : 0), 0);
      return { solution: s, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Path B: natural-language request → proposed plan → user confirms → Harness run.
 * The plan is the Solution's standard pipeline; nothing executes without explicit confirmation.
 */
export function PlanPage() {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  usePageContext([{ label: 'Home', to: '/' }, { label: 'Plan' }]);
  const solutions = useSolutions();
  const { kind } = useDataSource();
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateConversation();
  const [picked, setPicked] = useState<string | null>(null);
  const ranked = useMemo(() => rankSolutions(query, solutions.data ?? []), [query, solutions.data]);
  const matches = ranked.filter((r) => r.score > 0);
  const chosen = (solutions.data ?? []).find((s) => s.id === (picked ?? matches[0]?.solution.id));

  const discuss = async () => {
    try { const c = await create.mutateAsync(query); navigate(`/conversations/${c.id}`); }
    catch (e) { toast({ tone: 'danger', message: (e as Error).message }); }
  };

  return (
    <div className="page plan">
      <div className="plan-request">
        <span className="xs faint">Your task</span>
        <p>{query || '(empty)'}</p>
      </div>

      <QueryView query={solutions} loading={<SkeletonRows rows={3} />}>
        {() => (
          <div className="plan-body">
            <section className="plan-step">
              <div className="plan-step-head"><span className="step-num">1</span><h2>Choose a Solution</h2>
                <span className="xs faint row" style={{ gap: 4, marginLeft: 'auto' }}><Sparkles size={12} />Ranked by keywords · model planning is not connected</span>
              </div>
              {ranked.length === 0 ? (
                <EmptyState compact icon={<Boxes />} title="No Solutions available" description="This Harness has no published Solutions yet. You can discuss the question with the assistant first." />
              ) : (
                <div className="plan-options">
                  {(matches.length ? matches : ranked).slice(0, 4).map(({ solution: s, score }) => (
                    <button key={s.id} type="button" className="plan-option" aria-pressed={chosen?.id === s.id} onClick={() => setPicked(s.id)}>
                      <Glyph seed={s.id} label={s.name} size="sm" />
                      <span className="grow stack" style={{ textAlign: 'left' }}>
                        <span className="row" style={{ fontWeight: 500 }}>{s.name}{s.origin === 'mock' && <DemoTag />}</span>
                        <span className="xs muted truncate">{s.description}</span>
                      </span>
                      {score > 0 && <span className="xs faint">match {score}</span>}
                      {chosen?.id === s.id && <Check size={16} color="var(--accent)" />}
                    </button>
                  ))}
                  {matches.length === 0 && <span className="xs faint">No close match. Showing every available Solution.</span>}
                </div>
              )}
            </section>

            {chosen && (
              <section className="plan-step">
                <div className="plan-step-head"><span className="step-num">2</span><h2>Confirm inputs and run</h2>
                  <ButtonLink to={`/solutions/${chosen.id}`} size="sm" variant="ghost" className="push-right">Solution details</ButtonLink>
                </div>
                <Callout tone="info">Plan: validate against <strong>{chosen.name} v{chosen.latestVersion}</strong> → you confirm → {backendName(kind)} creates the run → follow status and artifacts on the run page.</Callout>
                <RunConfigurator key={chosen.id} solution={chosen} version={chosen.versions[0]} />
              </section>
            )}

            <div className="plan-alt">
              <span className="small muted">Not ready to run?</span>
              <Button size="sm" variant="ghost" icon={<MessageSquare />} loading={create.isPending} onClick={discuss}>Discuss this with AI</Button>
            </div>
          </div>
        )}
      </QueryView>
    </div>
  );
}
