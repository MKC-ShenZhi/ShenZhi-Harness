import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check, Copy, FileCode2, GitBranch, Play } from 'lucide-react';
import type { Solution, SolutionVersion } from '@/types/domain';
import { usePageContext } from '@/app/ui-state';
import { useRun, useRuns, useSolution } from '@/lib/api/queries';
import { backendName, useDataSource } from '@/lib/api/datasource';
import { fieldsFromSchema } from '@/lib/schema';
import { dateTime, relativeTime } from '@/lib/format';
import {
  Badge, Button, Callout, DemoTag, EmptyState, Glyph, IconButton, KeyValue, QueryView, Section, Segmented, Select, Skeleton, SkeletonRows, Tabs,
} from '@/components/ui';
import { RunRow } from '@/components/runs/RunRow';
import { RunConfigurator } from './RunConfigurator';

type Tab = 'overview' | 'run' | 'runs' | 'dev';

export function WorkspacePage() {
  const { id = '' } = useParams();
  const solution = useSolution(id);
  return (
    <QueryView query={solution} loading={<WorkspaceSkeleton />}>
      {(s) => <Workspace solution={s} />}
    </QueryView>
  );
}

function Workspace({ solution }: { solution: Solution }) {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'overview';
  const versionParam = params.get('version');
  const version = solution.versions.find((v) => v.version === versionParam) ?? solution.versions[0];
  const runs = useRuns();
  const ownRuns = useMemo(() => (runs.data ?? []).filter((r) => r.solutionId === solution.id), [runs.data, solution.id]);
  usePageContext([{ label: 'Solutions', to: '/solutions' }, { label: solution.name }], {
    kind: 'solution', label: solution.name, id: `${solution.id}@${version.version}`,
    facts: [
      `Description: ${solution.description}`, `Domain: ${solution.domain}`, `Adapter: ${version.runtime.adapter}`,
      `Scope: ${version.validationScope ?? 'not declared'}`, `Input schema: ${JSON.stringify(version.inputSchema)}`,
    ],
  });
  const set = (patch: Record<string, string | null>) => setParams((p) => { for (const [k, v] of Object.entries(patch)) if (v) p.set(k, v); else p.delete(k); return p; });

  return (
    <div className="page page-wide workspace">
      <header className="ws-head">
        <Glyph seed={solution.id} label={solution.name} size="lg" />
        <div className="grow stack" style={{ gap: 4, minWidth: 0 }}>
          <div className="row" style={{ gap: 10 }}><h1 className="truncate">{solution.name}</h1>{solution.origin === 'mock' && <DemoTag />}</div>
          <p className="muted">{solution.description}</p>
          <div className="row" style={{ gap: 6, marginTop: 4 }}>
            <Badge outline>{solution.domain}</Badge>
            {solution.tags.map((t) => <Badge key={t} outline>{t}</Badge>)}
          </div>
        </div>
        <div className="row" style={{ gap: 8, alignSelf: 'flex-start' }}>
          <Select aria-label="Version" value={version.version} style={{ width: 148 }}
            onChange={(e) => set({ version: e.target.value === solution.latestVersion ? null : e.target.value })}
            options={solution.versions.map((v) => ({ value: v.version, label: `v${v.version}${v.version === solution.latestVersion ? ' (latest)' : ''}` }))} />
          {tab !== 'run' && <Button variant="primary" icon={<Play />} onClick={() => set({ tab: 'run' })}>Run</Button>}
        </div>
      </header>

      <Tabs<Tab> label="Solution views" value={tab} onChange={(t) => set({ tab: t === 'overview' ? null : t, from: null })}
        items={[{ value: 'overview', label: 'Overview' }, { value: 'run', label: 'Run' }, { value: 'runs', label: 'History', count: runs.data ? ownRuns.length : undefined }, { value: 'dev', label: 'Develop' }]} />

      <div className="ws-body" key={tab}>
        {tab === 'overview' && <Overview solution={solution} version={version} onRun={() => set({ tab: 'run' })} />}
        {tab === 'run' && <RunTab solution={solution} version={version} fromRunId={params.get('from') ?? undefined} />}
        {tab === 'runs' && <RunsTab query={runs} runs={ownRuns} onRun={() => set({ tab: 'run' })} />}
        {tab === 'dev' && <DevTab solution={solution} version={version} />}
      </div>
    </div>
  );
}

function Overview({ solution, version, onRun }: { solution: Solution; version: SolutionVersion; onRun: () => void }) {
  const fields = fieldsFromSchema(version.inputSchema);
  const outputs = Object.keys(version.delivery).filter((k) => version.delivery[k]);
  return (
    <div className="two-col">
      <div className="stack" style={{ gap: 32 }}>
        <Section title="Scope">
          {version.validationScope ? <p>{version.validationScope}</p> : <p className="muted">This version does not declare a validation scope. Read the Solution notes before you use it.</p>}
        </Section>
        <Section title="Inputs" count={fields.length}>
          {fields.length === 0 ? <p className="muted">No input parameters.</p> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Parameter</th><th>Type</th><th>Required</th><th>Notes</th></tr></thead>
                <tbody>{fields.map((f) => (
                  <tr key={f.key}>
                    <td><div style={{ fontWeight: 500 }}>{f.label}</div><code className="xs faint">{f.key}</code></td>
                    <td>{f.options ? `enum (${f.options.length})` : String(f.schema.type ?? '—')}</td>
                    <td>{f.required ? 'Yes' : f.advanced ? 'Advanced' : 'No'}</td>
                    <td style={{ whiteSpace: 'normal', color: 'var(--text-secondary)' }}>{f.description ?? '—'}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
        <Section title="Outputs">
          {outputs.length ? <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{outputs.map((o) => <Badge key={o} outline>{o}</Badge>)}</div> : <p className="muted">Files from a run are listed as artifacts. The exact set depends on the run.</p>}
        </Section>
      </div>
      <aside className="rail">
        <div className="rail-block">
          <h3>This version</h3>
          <KeyValue items={[['Version', `v${version.version}`], ['Status', version.status === 'published' ? 'Published' : 'Draft'], ['Published', dateTime(version.publishedAt)], ['Adapter', <code key="a">{version.runtime.adapter}</code>]]} />
          <Button variant="primary" icon={<Play />} onClick={onRun} style={{ width: '100%', marginTop: 16 }}>Configure and run</Button>
        </div>
        <div className="rail-block">
          <h3>Version history</h3>
          <div className="stack" style={{ gap: 8 }}>
            {solution.versions.map((v) => (
              <div key={v.version} className="row small"><GitBranch size={13} className="faint" /><span>v{v.version}</span><span className="grow" /><span className="xs faint">{relativeTime(v.publishedAt)}</span></div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function RunTab({ solution, version, fromRunId }: { solution: Solution; version: SolutionVersion; fromRunId?: string }) {
  const source = useRun(fromRunId ?? '');
  const { kind } = useDataSource();
  if (fromRunId && source.isPending) return <SkeletonRows rows={3} />;
  const initial = fromRunId && source.data?.solutionId === solution.id ? source.data.input : undefined;
  return (
    <div className="two-col">
      <div className="stack" style={{ gap: 16 }}>
        {initial && <Callout tone="info" title={`Loaded inputs from run #${fromRunId!.slice(0, 8)}`}>The next run records that source so you can trace it.</Callout>}
        <RunConfigurator key={version.version + (fromRunId ?? '')} solution={solution} version={version} initialInput={initial} sourceRunId={initial ? fromRunId : undefined} />
      </div>
      <aside className="rail">
        <div className="rail-block">
          <h3>How a run works</h3>
          <ol className="steps-list">
            <li>Fill in the inputs. Advanced fields stay collapsed.</li>
            <li>Choose Validate. {backendName(kind)} checks the inputs against this version.</li>
            <li>Confirm to create the run. The run page opens so you can follow it.</li>
            <li>After success, artifacts can be previewed and downloaded.</li>
          </ol>
        </div>
        {version.validationScope && <div className="rail-block"><h3>Scope</h3><p className="small muted">{version.validationScope}</p></div>}
      </aside>
    </div>
  );
}

function RunsTab({ query, runs, onRun }: { query: ReturnType<typeof useRuns>; runs: ReturnType<typeof useRuns>['data'] & {}; onRun: () => void }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'succeeded' | 'failed'>('all');
  const shown = runs.filter((r) => filter === 'all' || (filter === 'active' ? ['queued', 'running', 'cancel_requested'].includes(r.status) : filter === 'failed' ? ['failed', 'cancelled'].includes(r.status) : r.status === filter));
  return (
    <QueryView query={query} isEmpty={() => runs.length === 0}
      empty={<EmptyState icon={<Play />} title="This Solution has no runs" description="Configure the inputs to create the first run." action={<Button variant="primary" size="sm" icon={<Play />} onClick={onRun}>Configure a run</Button>} />}>
      {() => (
        <div className="stack" style={{ gap: 12 }}>
          <Segmented label="Status" value={filter} onChange={setFilter} items={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'succeeded', label: 'Succeeded' }, { value: 'failed', label: 'Failed / cancelled' }]} />
          {shown.length ? <div className="list">{shown.map((r) => <RunRow key={r.id} run={r} showSolution={false} />)}</div> : <EmptyState compact title="No runs match this filter" />}
        </div>
      )}
    </QueryView>
  );
}

function DevTab({ solution, version }: { solution: Solution; version: SolutionVersion }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500); };
  const schema = JSON.stringify(version.inputSchema, null, 2);
  return (
    <div className="two-col">
      <div className="stack" style={{ gap: 32 }}>
        <Section title="Specification">
          <KeyValue items={[
            ['Solution ID', <code key="i">{solution.id}</code>], ['Version', `v${version.version}`],
            ['Adapter', <code key="a">{version.runtime.adapter}</code>], ['Entrypoint', <code key="e">{version.runtime.entrypoint}</code>],
          ]} />
        </Section>
        <Section title="Input schema (JSON Schema)" action={<IconButton size="sm" label={copied === 'schema' ? 'Copied' : 'Copy'} onClick={() => copy('schema', schema)}>{copied === 'schema' ? <Check /> : <Copy />}</IconButton>}>
          <pre className="code-block" style={{ maxHeight: 360 }}>{schema}</pre>
        </Section>
        <Section title="Assets" count={version.assets.length}>
          {version.assets.length === 0 ? <p className="muted">This version has no code, model, or document assets.</p> : (
            <div className="list">{version.assets.map((a, i) => (
              <div key={i} className="list-row"><FileCode2 size={16} className="faint" />
                <div className="grow stack"><span className="title">{a.name ?? a.kind ?? 'Asset'}</span>{a.description && <span className="sub">{a.description}</span>}</div>
                {a.url ? <a className="link-btn" href={a.url} target="_blank" rel="noreferrer">Open</a> : <span className="meta">No download</span>}
              </div>))}
            </div>
          )}
        </Section>
      </div>
      <aside className="rail">
        <div className="rail-block">
          <h3>Publish a new version</h3>
          <p className="small muted">A maintainer publishes a new version from a manifest. Published versions cannot be overwritten, so runs stay traceable.</p>
          <div className="row" style={{ marginTop: 10 }}>
            <code className="xs grow truncate" style={{ padding: '6px 8px', background: 'var(--bg-subtle)', borderRadius: 6 }}>node scripts/import-solution.mjs &lt;manifest&gt;</code>
            <IconButton size="sm" label={copied === 'cli' ? 'Copied' : 'Copy command'} onClick={() => copy('cli', 'node scripts/import-solution.mjs <manifest.json>')}>{copied === 'cli' ? <Check /> : <Copy />}</IconButton>
          </div>
          <Button disabled style={{ width: '100%', marginTop: 12 }} title="Publishing from the interface is not available yet">Publish in the app (not available yet)</Button>
        </div>
      </aside>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="page page-wide">
      <div className="row" style={{ gap: 16, marginBottom: 24 }}><Skeleton width={48} height={48} /><div className="grow stack" style={{ gap: 8 }}><Skeleton width={240} height={22} /><Skeleton width="50%" /></div></div>
      <Skeleton height={38} style={{ marginBottom: 24 }} />
      <SkeletonRows rows={4} />
    </div>
  );
}
