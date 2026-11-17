import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Boxes, FileStack, Play } from 'lucide-react';
import { usePageContext } from '@/app/ui-state';
import { useRuns, useSolutions } from '@/lib/api/queries';
import { isActive } from '@/lib/status';
import { ButtonLink, EmptyState, QueryView, Section, SkeletonRows } from '@/components/ui';
import { Composer } from '@/components/assistant/Composer';
import { RunRow } from '@/components/runs/RunRow';
import { SolutionRow } from '@/components/solutions/SolutionCard';
import { ArtifactRow } from '@/components/artifacts/Artifact';

function greeting() {
  const h = new Date().getHours();
  return h < 6 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function HomePage() {
  usePageContext([{ label: 'Home' }]);
  const navigate = useNavigate();
  const location = useLocation();
  const runs = useRuns();
  const solutions = useSolutions();
  const focusKey = (location.state as { focusComposer?: number } | null)?.focusComposer ?? 1;
  const active = runs.data?.filter((r) => isActive(r.status)) ?? [];
  const recentArtifacts = (runs.data ?? [])
    .filter((r) => r.status === 'succeeded')
    .flatMap((r) => r.artifacts.filter((a) => a.name !== 'execution.log').map((a) => ({ a, run: r })))
    .slice(0, 6);

  return (
    <div className="page home">
      <section className="home-hero">
        <h1>{greeting()}. What are you working on?</h1>
        <p className="muted">Describe a task. SZH lists Solutions that match your keywords. You confirm the inputs, then submit the run.</p>
        <Composer placeholder="For example: fit a curve to experimental data and report the residuals" autoFocusKey={focusKey}
          onSubmit={(text) => navigate(`/plan?q=${encodeURIComponent(text)}`)}
          footer={<span className="xs faint">Enter to find a Solution · Shift+Enter for a new line</span>} />
        <div className="home-shortcuts">
          <ButtonLink to="/solutions" size="sm" variant="ghost" icon={<Boxes />}>Browse Solutions</ButtonLink>
          <ButtonLink to="/runs" size="sm" variant="ghost" icon={<Play />}>View runs{active.length ? ` (${active.length} active)` : ''}</ButtonLink>
          <ButtonLink to="/artifacts" size="sm" variant="ghost" icon={<FileStack />}>View artifacts</ButtonLink>
        </div>
      </section>

      <div className="home-grid">
        <Section className="card" title="Solutions" count={solutions.data?.length}
          action={<ButtonLink to="/solutions" size="sm" variant="ghost">All<ArrowRight /></ButtonLink>}>
          <QueryView query={solutions} loading={<SkeletonRows rows={3} />} isEmpty={(d) => d.length === 0} compact
            empty={<EmptyState compact icon={<Boxes />} title="No published Solutions" description="This Harness has not published any Solution versions yet. You can switch to demo data in Settings to try the flow." />}>
            {(d) => <div className="list">{d.slice(0, 5).map((s) => <SolutionRow key={s.id} solution={s} />)}</div>}
          </QueryView>
        </Section>

        <Section className="card" title="Recent runs" count={runs.data?.length}
          action={<ButtonLink to="/runs" size="sm" variant="ghost">All<ArrowRight /></ButtonLink>}>
          <QueryView query={runs} loading={<SkeletonRows rows={3} />} isEmpty={(d) => d.length === 0} compact
            empty={<EmptyState compact icon={<Play />} title="No runs yet" description="Pick a Solution, fill in the inputs, and run it." action={<ButtonLink to="/solutions" size="sm">Browse Solutions</ButtonLink>} />}>
            {(d) => <div className="list">{d.slice(0, 5).map((r) => <RunRow key={r.id} run={r} />)}</div>}
          </QueryView>
        </Section>

        <Section className="card home-span" title="Recent artifacts"
          action={<ButtonLink to="/artifacts" size="sm" variant="ghost">All<ArrowRight /></ButtonLink>}>
          <QueryView query={runs} loading={<SkeletonRows rows={2} />} isEmpty={() => recentArtifacts.length === 0} compact
            empty={<EmptyState compact icon={<FileStack />} title="No artifacts yet" description="Files from successful runs show up here." />}>
            {() => <div className="list list-cols">{recentArtifacts.map(({ a }) => <ArtifactRow key={a.id} artifact={a} to={`/artifacts/${a.runId}/${a.id}`} />)}</div>}
          </QueryView>
        </Section>
      </div>
    </div>
  );
}
