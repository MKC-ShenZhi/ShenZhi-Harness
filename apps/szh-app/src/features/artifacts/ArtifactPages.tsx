import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Copy, Download, FileStack, MessageSquare, RotateCcw } from 'lucide-react';
import { usePageContext, useUI } from '@/app/ui-state';
import { useDataSource } from '@/lib/api/datasource';
import { useRun, useRuns } from '@/lib/api/queries';
import { dateTime, fileSize, relativeTime, shortId } from '@/lib/format';
import {
  Button, ButtonLink, DemoTag, EmptyState, IconButton, KeyValue, PageHeader, QueryView, SearchInput, Section, Skeleton, SkeletonRows,
} from '@/components/ui';
import { ArtifactPreview, ArtifactRow, artifactIcon, kindLabel } from '@/components/artifacts/Artifact';
import type { Artifact, Run } from '@/types/domain';

/** Artifacts are always shown with their source Run — there is no orphan file. */
export function ArtifactsPage() {
  usePageContext([{ label: 'Artifacts' }]);
  const runs = useRuns();
  const [q, setQ] = useState('');
  const groups = useMemo(() => (runs.data ?? [])
    .filter((r) => r.artifacts.length)
    .map((r) => ({ run: r, items: r.artifacts.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase())) }))
    .filter((g) => g.items.length), [runs.data, q]);

  return (
    <div className="page">
      <PageHeader title="Artifacts" description="Files, data, and reports from runs, grouped by the run that produced them." />
      <div className="toolbar"><div style={{ width: 300 }}><SearchInput value={q} onChange={setQ} placeholder="Search by file name" /></div></div>
      <QueryView query={runs} isEmpty={(d) => !d.some((r) => r.artifacts.length)}
        empty={<EmptyState icon={<FileStack />} title="No artifacts yet" description="Files from successful runs show up here." action={<ButtonLink to="/solutions" size="sm">Run a Solution</ButtonLink>} />}>
        {() => groups.length === 0 ? <EmptyState compact title="No matching files" /> : (
          <div className="stack" style={{ gap: 28 }}>
            {groups.map(({ run, items }) => (
              <Section key={run.id} title={<Link to={`/runs/${run.id}`} className="row link-inline" style={{ gap: 6 }}>{run.solutionName}<span className="mono xs faint">#{shortId(run.id)}</span>{run.origin === 'mock' && <DemoTag />}</Link>}
                action={<span className="xs faint">{relativeTime(run.finishedAt ?? run.createdAt)}</span>}>
                <div className="list">{items.map((a) => <ArtifactRow key={a.id} artifact={a} to={`/artifacts/${run.id}/${a.id}`} />)}</div>
              </Section>
            ))}
          </div>
        )}
      </QueryView>
    </div>
  );
}

export function ArtifactViewerPage() {
  const { runId = '', artifactId = '' } = useParams();
  const run = useRun(runId);
  return (
    <QueryView query={run} loading={<div className="page page-wide"><Skeleton width={320} height={26} /><div style={{ height: 24 }} /><SkeletonRows rows={5} /></div>}>
      {(r) => {
        const artifact = r.artifacts.find((a) => a.id === artifactId);
        return artifact ? <Viewer run={r} artifact={artifact} /> : (
          <div className="page"><EmptyState title="Artifact not found" description="It may belong to another run, or it has been removed." action={<ButtonLink to={`/runs/${r.id}`} size="sm">Back to run</ButtonLink>} /></div>
        );
      }}
    </QueryView>
  );
}

function Viewer({ run, artifact }: { run: Run; artifact: Artifact }) {
  usePageContext([{ label: 'Artifacts', to: '/artifacts' }, { label: `${run.solutionName} #${shortId(run.id)}`, to: `/runs/${run.id}` }, { label: artifact.name }],
    {
      kind: 'artifact', label: artifact.name, id: `${run.id}/${artifact.name}`,
      facts: [
        `Type: ${kindLabel[artifact.kind]}, size: ${artifact.size} bytes${artifact.sha256 ? `, SHA-256: ${artifact.sha256}` : ''}`,
        `Source run: ${run.solutionId}@${run.version} (${run.status})`, `Run input: ${JSON.stringify(run.input)}`,
      ],
    });
  const { source } = useDataSource();
  const { setAssistantOpen } = useUI();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const Icon = artifactIcon(artifact);

  return (
    <div className="page page-wide viewer">
      <PageHeader
        leading={<span className="viewer-icon"><Icon size={20} /></span>}
        title={<span className="row" style={{ gap: 10 }}>{artifact.name}{run.origin === 'mock' && <DemoTag />}</span>}
        description={<>From <Link to={`/runs/${run.id}`} className="link-inline">{run.solutionName} · run #{shortId(run.id)}</Link> · {kindLabel[artifact.kind]} · {fileSize(artifact.size)}</>}
        actions={<>
          <Button icon={<MessageSquare />} onClick={() => setAssistantOpen(true)}>Ask AI</Button>
          <a href={source.artifactUrl(artifact)} download={artifact.name} className="btn btn-primary"><Download />Download</a>
        </>} />

      <div className="viewer-grid">
        <nav className="viewer-files" aria-label="Files from this run">
          <div className="xs faint" style={{ padding: '0 12px 6px' }}>This run · {run.artifacts.length} files</div>
          {run.artifacts.map((a) => <ArtifactRow key={a.id} artifact={a} to={`/artifacts/${run.id}/${a.id}`} selected={a.id === artifact.id} />)}
        </nav>
        <section className="viewer-main" aria-label="Preview"><ArtifactPreview key={artifact.id} artifact={artifact} /></section>
        <aside className="rail">
          <div className="rail-block">
            <h3>Source</h3>
            <KeyValue items={[
              ['Solution', <Link key="s" to={`/solutions/${run.solutionId}?version=${run.version}`} className="link-inline">{run.solutionName} v{run.version}</Link>],
              ['Run', <Link key="r" to={`/runs/${run.id}`} className="link-inline mono">#{shortId(run.id)}</Link>],
              ['Finished', dateTime(run.finishedAt)],
              ['Size', fileSize(artifact.size)],
              ...(artifact.sha256 ? [['SHA-256', <span key="h" className="row" style={{ gap: 4 }}><span className="mono xs truncate">{artifact.sha256.slice(0, 16)}…</span>
                <IconButton size="sm" label={copied ? 'Copied' : 'Copy checksum'} onClick={async () => { await navigator.clipboard.writeText(artifact.sha256!); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check /> : <Copy />}</IconButton></span>] as [string, React.ReactNode]] : []),
            ]} />
          </div>
          <div className="rail-block">
            <h3>Run inputs</h3>
            <pre className="code-block" style={{ maxHeight: 220 }}>{JSON.stringify(run.input, null, 2)}</pre>
          </div>
          <div className="rail-block">
            <h3>Reuse</h3>
            <Button icon={<RotateCcw />} style={{ width: '100%' }} onClick={() => navigate(`/solutions/${run.solutionId}?tab=run&version=${run.version}&from=${run.id}`)}>Run again with these inputs</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
