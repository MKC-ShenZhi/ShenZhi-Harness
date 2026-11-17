import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Boxes, LayoutGrid, List, SearchX } from 'lucide-react';
import { usePageContext } from '@/app/ui-state';
import { useSolutions } from '@/lib/api/queries';
import { Button, ButtonLink, EmptyState, PageHeader, QueryView, SearchInput, Segmented, Select, Skeleton } from '@/components/ui';
import { SolutionCard, SolutionRow } from '@/components/solutions/SolutionCard';

export function ExplorerPage() {
  usePageContext([{ label: 'Solutions' }]);
  const solutions = useSolutions();
  // Filters live in the URL so back/forward and refresh keep the view.
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const domain = params.get('domain') ?? '';
  const view = (params.get('view') as 'grid' | 'list') ?? 'grid';
  const set = (key: string, value: string) => setParams((p) => { if (value) p.set(key, value); else p.delete(key); return p; }, { replace: true });

  const domains = useMemo(() => [...new Set((solutions.data ?? []).map((s) => s.domain))].sort(), [solutions.data]);
  const filtered = useMemo(() => (solutions.data ?? []).filter((s) =>
    (!domain || s.domain === domain) &&
    (!q || [s.name, s.description, s.domain, s.id, ...s.tags].join(' ').toLowerCase().includes(q.toLowerCase()))), [solutions.data, q, domain]);

  return (
    <div className="page page-wide explorer">
      <PageHeader title="Solutions" description="Versioned capabilities. Each version has a fixed input schema, and every run stays traceable."
        actions={<Button disabled title="New versions are registered by a maintainer command. This client cannot publish.">Publish Solution</Button>} />

      <div className="toolbar explorer-toolbar">
        <div className="explorer-search"><SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Search name, domain, tags, or description" /></div>
        <Select aria-label="Domain" style={{ width: 160 }} value={domain} onChange={(e) => set('domain', e.target.value)} placeholder="All domains"
          options={domains.map((d) => ({ value: d, label: d }))} />
        <span className="grow" />
        <span className="small faint">{solutions.data ? `${filtered.length} Solution${filtered.length === 1 ? '' : 's'}` : ''}</span>
        <Segmented label="View" value={view} onChange={(v) => set('view', v === 'grid' ? '' : v)}
          items={[{ value: 'grid', label: <LayoutGrid size={14} />, title: 'Cards' }, { value: 'list', label: <List size={14} />, title: 'List' }]} />
      </div>

      <QueryView query={solutions}
        loading={<div className="sol-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="sol-card"><Skeleton width={36} height={36} /><Skeleton width="60%" /><Skeleton height={36} /></div>)}</div>}
        isEmpty={(d) => d.length === 0}
        empty={<div className="empty-panel"><EmptyState icon={<Boxes />} title="No published Solutions"
          description="This Harness registry is empty. Solutions appear here after a maintainer publishes them. You can also switch to demo data in Settings."
          action={<ButtonLink to="/settings" size="sm">Open settings</ButtonLink>} /></div>}>
        {() => filtered.length === 0
          ? <div className="empty-panel"><EmptyState icon={<SearchX />} title="No matching Solutions" description="Try another keyword, or clear the filters." action={<Button size="sm" onClick={() => setParams({}, { replace: true })}>Clear filters</Button>} /></div>
          : view === 'grid'
            ? <div className="sol-grid">{filtered.map((s) => <SolutionCard key={s.id} solution={s} />)}</div>
            : <div className="list list-panel">{filtered.map((s) => <SolutionRow key={s.id} solution={s} />)}</div>}
      </QueryView>
    </div>
  );
}
