import { RotateCw } from 'lucide-react';
import { usePageContext } from '@/app/ui-state';
import { useDataSource } from '@/lib/api/datasource';
import { harnessBaseUrl } from '@/lib/api/harness';
import { useHealth } from '@/lib/api/queries';
import { dateTime } from '@/lib/format';
import { Badge, Button, KeyValue, PageHeader, Section, Segmented } from '@/components/ui';

export function SettingsPage() {
  usePageContext([{ label: 'Settings' }]);
  const { kind, setKind } = useDataSource();
  const health = useHealth();
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <PageHeader title="Settings" description="Connection, data source, and client information." />
      <div className="stack" style={{ gap: 36 }}>
        <Section title="Data source">
          <div className="setting-row">
            <div className="grow stack"><span style={{ fontWeight: 500 }}>Current source</span><span className="small muted">Demo data is only for trying the interface. Every demo record is marked Demo. Switching reloads the page data.</span></div>
            <Segmented label="Data source" value={kind} onChange={setKind} items={[{ value: 'harness', label: 'Harness' }, { value: 'mock', label: 'Demo data' }]} />
          </div>
        </Section>
        <Section title="Harness connection" action={<Button size="sm" variant="ghost" icon={<RotateCw />} loading={health.isFetching} onClick={() => health.refetch()}>Check again</Button>}>
          <KeyValue items={[
            ['Address', <code key="u">{harnessBaseUrl() || `${location.origin} (same-origin /api)`}</code>],
            ['Status', kind === 'mock' ? <Badge key="s">Not in use</Badge> : health.isError ? <Badge key="s" tone="danger">Offline</Badge> : health.isPending ? <Badge key="s">Checking</Badge> : <Badge key="s" tone="success">Connected</Badge>],
            ['Model', health.data ? (health.data.modelConfigured ? health.data.model ?? 'Configured' : 'Not configured') : '—'],
            ['Last check', dateTime(health.data?.checkedAt)],
          ]} />
          {health.isError && kind === 'harness' && <p className="small muted">From the project root, run <code>npm start</code> (port 4782), or set <code>SZH_HARNESS_URL</code> and restart the client.</p>}
        </Section>
        <Section title="Client">
          <KeyValue items={[
            ['Version', 'SZH Desktop 0.2.0'],
            ['Runtime', window.szhDesktop ? `Electron · ${window.szhDesktop.platform}` : 'Browser'],
            ['Legacy clients', 'Still available: Start-SZH.cmd and SZH_Desktop\\SZH.exe'],
          ]} />
        </Section>
        <Section title="Shortcuts">
          <KeyValue items={[['Ctrl + K', 'Search and jump'], ['Ctrl + B', 'Toggle sidebar'], ['Ctrl + J', 'Toggle AI assistant'], ['Enter / Shift + Enter', 'Send / new line']]} />
        </Section>
      </div>
    </div>
  );
}
