import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Boxes, FileStack, Home, MessageSquare, Play, Search, Settings, type LucideIcon } from 'lucide-react';
import { useUI } from '@/app/ui-state';
import { useRuns, useSolutions } from '@/lib/api/queries';
import { runStatusMeta } from '@/lib/status';
import { shortId } from '@/lib/format';

type Item = { id: string; group: string; label: string; meta?: string; icon: LucideIcon; to: string };

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useUI();
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const solutions = useSolutions();
  const runs = useRuns();

  const items = useMemo<Item[]>(() => {
    const nav: Item[] = [
      { id: 'n-home', group: 'Go to', label: 'Home', icon: Home, to: '/' },
      { id: 'n-sol', group: 'Go to', label: 'Solutions', icon: Boxes, to: '/solutions' },
      { id: 'n-run', group: 'Go to', label: 'Runs', icon: Play, to: '/runs' },
      { id: 'n-art', group: 'Go to', label: 'Artifacts', icon: FileStack, to: '/artifacts' },
      { id: 'n-chat', group: 'Go to', label: 'Chats', icon: MessageSquare, to: '/conversations' },
      { id: 'n-set', group: 'Go to', label: 'Settings', icon: Settings, to: '/settings' },
    ];
    const sol: Item[] = (solutions.data ?? []).map((s) => ({ id: 's-' + s.id, group: 'Solutions', label: s.name, meta: `${s.domain} · v${s.latestVersion}`, icon: Boxes, to: `/solutions/${s.id}` }));
    const run: Item[] = (runs.data ?? []).slice(0, 20).map((r) => ({ id: 'r-' + r.id, group: 'Runs', label: `${r.solutionName} #${shortId(r.id)}`, meta: runStatusMeta[r.status]?.label, icon: Play, to: `/runs/${r.id}` }));
    const all = [...nav, ...sol, ...run];
    const query = q.trim().toLowerCase();
    return query ? all.filter((i) => (i.label + ' ' + (i.meta ?? '')).toLowerCase().includes(query)) : all;
  }, [q, solutions.data, runs.data]);

  useEffect(() => { setIndex(0); }, [q, paletteOpen]);
  useEffect(() => { if (!paletteOpen) setQ(''); }, [paletteOpen]);
  if (!paletteOpen) return null;

  const go = (item?: Item) => { if (!item) return; setPaletteOpen(false); navigate(item.to); };
  let lastGroup = '';

  return createPortal(
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setPaletteOpen(false); }}>
      <div className="palette" role="dialog" aria-label="Search and commands">
        <div className="palette-input">
          <Search />
          <input autoFocus value={q} placeholder="Search solutions, runs, or pages…" aria-label="Search" onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPaletteOpen(false);
              if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(items.length - 1, i + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
              if (e.key === 'Enter') go(items[index]);
            }} />
        </div>
        <div className="palette-list" role="listbox">
          {items.length === 0 && <div className="state state-compact"><p>No matches</p></div>}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? <div className="palette-group">{(lastGroup = item.group)}</div> : null;
            return (
              <div key={item.id}>
                {header}
                <button className="palette-item" role="option" aria-selected={i === index} onMouseEnter={() => setIndex(i)} onClick={() => go(item)}>
                  <item.icon /><span className="truncate">{item.label}</span>{item.meta && <span className="meta">{item.meta}</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
