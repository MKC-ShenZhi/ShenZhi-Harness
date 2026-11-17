import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Ban, FileStack, Play, RotateCcw } from 'lucide-react';
import { usePageContext } from '@/app/ui-state';
import { useCancelRun, useRun, useRuns } from '@/lib/api/queries';
import { backendName, useDataSource } from '@/lib/api/datasource';
import { canCancel, isActive, runStatusMeta } from '@/lib/status';
import { dateTime, duration, shortId } from '@/lib/format';
import {
  Button, ButtonLink, Callout, DemoTag, Dialog, EmptyState, KeyValue, PageHeader, QueryView, RunStatusBadge, Section, Segmented, Skeleton, SkeletonRows, useToast,
} from '@/components/ui';
import { RunRow } from '@/components/runs/RunRow';
import { EventLog, RunLifecycle } from '@/components/runs/RunTimeline';
import { ArtifactRow } from '@/components/artifacts/Artifact';
import type { Run } from '@/types/domain';

type Filter = 'all' | 'active' | 'succeeded' | 'failed';

export function RunsPage() {
  usePageContext([{ label: 'Runs' }]);
  const runs = useRuns();
  const { kind } = useDataSource();
  const [params, setParams] = useSearchParams();
  const filter = (params.get('status') as Filter) || 'all';
  const match = (r: Run) => filter === 'all' || (filter === 'active' ? isActive(r.status) : filter === 'failed' ? ['failed', 'cancelled'].includes(r.status) : r.status === 'succeeded');
  const count = (f: Filter) => runs.data?.filter((r) => f === 'all' || (f === 'active' ? isActive(r.status) : f === 'failed' ? ['failed', 'cancelled'].includes(r.status) : r.status === 'succeeded')).length;

  return (
    <div className="page">
      <PageHeader title="Runs" description={`Each run pins a Solution version and its inputs. Status comes from ${backendName(kind)}.`} actions={<ButtonLink to="/solutions" variant="primary" icon={<Play />}>New run</ButtonLink>} />
      <div className="toolbar">
        <Segmented<Filter> label="Status" value={filter} onChange={(v) => setParams(v === 'all' ? {} : { status: v }, { replace: true })}
          items={(['all', 'active', 'succeeded', 'failed'] as Filter[]).map((f) => ({ value: f, label: <>{{ all: 'All', active: 'Active', succeeded: 'Succeeded', failed: 'Failed / cancelled' }[f]}{runs.data && <span className="faint"> {count(f)}</span>}</> }))} />
      </div>
      <QueryView query={runs} isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon={<Play />} title="No runs yet" description="Choose a Solution, configure the inputs, and run it." action={<ButtonLink to="/solutions" size="sm">Browse Solutions</ButtonLink>} />}>
        {(d) => { const shown = d.filter(match); return shown.length ? <div className="list">{shown.map((r) => <RunRow key={r.id} run={r} />)}</div> : <EmptyState compact title="No runs match this filter" />; }}
      </QueryView>
    </div>
  );
}

export function RunConsolePage() {
  const { id = '' } = useParams();
  const run = useRun(id);
  return <QueryView query={run} loading={<ConsoleSkeleton />}>{(r) => <RunConsole run={r} />}</QueryView>;
}

function RunConsole({ run }: { run: Run }) {
  usePageContext([{ label: 'Runs', to: '/runs' }, { label: `${run.solutionName} #${shortId(run.id)}` }], {
    kind: 'run', label: `${run.solutionName} #${shortId(run.id)}`, id: run.id,
    facts: [
      `Solution: ${run.solutionId}@${run.version}`, `Status: ${runStatusMeta[run.status]?.label ?? run.status} (${run.status})`,
      `Created: ${run.createdAt}`, ...(run.finishedAt ? [`Finished: ${run.finishedAt}`] : []), ...(run.error ? [`Error: ${run.error}`] : []),
      `Input: ${JSON.stringify(run.input)}`, `Artifacts: ${run.artifacts.map((a) => a.name).join(', ') || 'none'}`,
    ],
  });
  const cancel = useCancelRun(run.id);
  const toast = useToast();
  const navigate = useNavigate();
  const { kind } = useDataSource();
  const backend = backendName(kind);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const live = isActive(run.status);
  // Harness does not persist cancel_requested yet: keep showing it locally until a terminal status arrives.
  const status = cancel.isSuccess && (run.status === 'queued' || run.status === 'running') ? 'cancel_requested' : run.status;
  const log = run.artifacts.find((a) => a.name === 'execution.log');
  const results = run.artifacts.filter((a) => a !== log);

  const doCancel = async () => {
    try { await cancel.mutateAsync(); toast({ tone: 'info', message: `Cancel requested. Waiting for ${backend} to confirm.` }); }
    catch (e) { toast({ tone: 'danger', message: (e as Error).message }); }
    setConfirmCancel(false);
  };

  return (
    <div className="page page-wide console">
      <header className="console-head">
        <div className="grow stack" style={{ gap: 6, minWidth: 0 }}>
          <div className="row" style={{ gap: 10 }}>
            <h1 className="truncate">{run.solutionName}</h1><RunStatusBadge status={status} />{run.origin === 'mock' && <DemoTag />}
          </div>
          <div className="row small muted" style={{ gap: 6, flexWrap: 'wrap' }}>
            <span className="mono">#{shortId(run.id)}</span>·
            <Link to={`/solutions/${run.solutionId}?version=${run.version}`} className="link-inline">v{run.version}</Link>·
            <span>Created {dateTime(run.createdAt)}</span>
            {run.startedAt && <>·<span>Duration {duration(run.startedAt, run.finishedAt)}</span></>}
          </div>
        </div>
        <div className="console-actions">
          {canCancel(status) && <Button variant="danger" icon={<Ban />} onClick={() => setConfirmCancel(true)}>Cancel run</Button>}
          {!live && <Button icon={<RotateCcw />} onClick={() => navigate(`/solutions/${run.solutionId}?tab=run&version=${run.version}&from=${run.id}`)}>Run again from this</Button>}
          {run.status === 'succeeded' && results[0] && <ButtonLink variant="primary" to={`/artifacts/${run.id}/${results[0].id}`} icon={<FileStack />}>View artifacts</ButtonLink>}
        </div>
      </header>

      <RunLifecycle run={run} />

      {run.status === 'failed' && (
        <Callout tone="danger" title="Run failed" action={<Button size="sm" icon={<RotateCcw />} onClick={() => navigate(`/solutions/${run.solutionId}?tab=run&version=${run.version}&from=${run.id}`)}>Edit inputs and retry</Button>}>
          {run.error ?? `${backend} did not return an error detail.`}{log && <> See the execution log below.</>}
        </Callout>
      )}
      {status === 'queued' && <Callout tone="neutral">Queued. {backend} runs jobs in order. This page updates when execution starts.</Callout>}
      {status === 'cancel_requested' && <Callout tone="warning" title="Cancel requested">The request was accepted. The final status is whatever {backend} reports. If the run finished before it stopped, it stays succeeded.</Callout>}

      <div className="two-col">
        <div className="stack" style={{ gap: 28 }}>
          <EventLog title={run.origin === 'harness' ? 'Status' : 'Events'} events={run.events} live={live} emptyText="No records yet" />
          {run.origin === 'harness' && <p className="xs faint" style={{ marginTop: -16 }}>Built from the timestamps Harness stored. Harness does not stream progress. The execution log is available after a successful run.</p>}
          {log && <Section title="Execution log"><ArtifactRow artifact={log} to={`/artifacts/${run.id}/${log.id}`} /></Section>}
          <Section title="Artifacts" count={results.length}>
            {results.length ? <div className="list">{results.map((a) => <ArtifactRow key={a.id} artifact={a} to={`/artifacts/${run.id}/${a.id}`} />)}</div>
              : <EmptyState compact icon={<FileStack />} title={live ? 'Artifacts appear when the run finishes' : 'No artifact files'} />}
          </Section>
        </div>
        <aside className="rail">
          <div className="rail-block">
            <h3>Run</h3>
            <KeyValue items={[
              ['Run ID', <span key="i" className="mono xs">{run.id}</span>],
              ['Solution', <Link key="s" to={`/solutions/${run.solutionId}`} className="link-inline">{run.solutionName}</Link>],
              ['Version', `v${run.version}`],
              ['Started', dateTime(run.startedAt)], ['Finished', dateTime(run.finishedAt)],
              ...(run.sourceRunId ? [['Source run', <Link key="src" to={`/runs/${run.sourceRunId}`} className="link-inline">#{shortId(run.sourceRunId)}</Link>] as [string, React.ReactNode]] : []),
            ]} />
          </div>
          <div className="rail-block">
            <h3>Inputs</h3>
            <pre className="code-block" style={{ maxHeight: 280 }}>{JSON.stringify(run.input, null, 2)}</pre>
          </div>
          {results.length > 0 && <Link to={`/artifacts/${run.id}/${results[0].id}`} className="link-btn">Open artifact viewer<ArrowRight /></Link>}
        </aside>
      </div>

      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this run?"
        description="Partial work is not kept as artifacts. You can run the same inputs again afterward."
        footer={<><Button onClick={() => setConfirmCancel(false)}>Keep running</Button><Button variant="danger" loading={cancel.isPending} onClick={doCancel}>Cancel run</Button></>} />
    </div>
  );
}

function ConsoleSkeleton() {
  return <div className="page page-wide"><Skeleton width={280} height={26} /><Skeleton width={360} style={{ margin: '12px 0 28px' }} /><Skeleton height={64} style={{ marginBottom: 24 }} /><SkeletonRows rows={4} /></div>;
}
