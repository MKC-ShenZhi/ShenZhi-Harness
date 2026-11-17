import { Fragment, type ReactNode } from 'react';

/**
 * Minimal Markdown for model replies: headings, lists, tables, quotes, fenced code, inline code, bold, links.
 * Builds React elements only (never innerHTML), so reply text cannot inject markup.
 */
export function Markdown({ text }: { text: string }) {
  return <div className="md">{blocks(text)}</div>;
}

type Align = 'left' | 'center' | 'right';
type Block =
  | { t: 'code'; lang: string; body: string }
  | { t: 'h'; level: number; text: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'quote'; lines: string[] }
  | { t: 'hr' }
  | { t: 'table'; header: string[]; align: Align[]; rows: string[][] }
  | { t: 'p'; lines: string[] };

/** Split a GFM row on pipes that are outside inline code. */
function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = '', code = false;
  for (const ch of s) {
    if (ch === '`') code = !code;
    if (ch === '|' && !code) { cells.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function isSeparator(line: string): boolean {
  const cells = splitRow(line);
  return cells.length > 1 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function alignment(cell: string): Align {
  const left = cell.startsWith(':'), right = cell.endsWith(':');
  return left && right ? 'center' : right ? 'right' : 'left';
}

function startsTable(lines: string[], i: number): boolean {
  return lines[i].includes('|') && i + 1 < lines.length && isSeparator(lines[i + 1]);
}

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out: Block[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*([\w+-]*)/);
    if (fence) {
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i].trimStart().startsWith(fence[1]); i++) body.push(lines[i]);
      out.push({ t: 'code', lang: fence[2], body: body.join('\n') }); i++; continue;
    }
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { out.push({ t: 'h', level: h[1].length, text: h[2] }); i++; continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push({ t: 'hr' }); i++; continue; }
    const list = (re: RegExp, t: 'ul' | 'ol') => {
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) { items.push(lines[i].replace(re, '')); i++; }
      out.push({ t, items });
    };
    if (/^\s*[-*+]\s+/.test(line)) { list(/^\s*[-*+]\s+/, 'ul'); continue; }
    if (/^\s*\d+[.)]\s+/.test(line)) { list(/^\s*\d+[.)]\s+/, 'ol'); continue; }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { quote.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push({ t: 'quote', lines: quote }); continue;
    }
    if (startsTable(lines, i)) {
      const header = splitRow(lines[i]);
      const align = splitRow(lines[i + 1]).map(alignment);
      const rows: string[][] = [];
      for (i += 2; i < lines.length && lines[i].trim() && lines[i].includes('|'); i++) {
        const cells = splitRow(lines[i]);
        rows.push([...cells, ...Array(Math.max(0, header.length - cells.length)).fill('')].slice(0, Math.max(header.length, cells.length)));
      }
      out.push({ t: 'table', header, align, rows }); continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*([-*+]|\d+[.)])\s+|\s*>|\s*(`{3,}|~{3,}))/.test(lines[i]) && !startsTable(lines, i)) { para.push(lines[i]); i++; }
    out.push({ t: 'p', lines: para });
  }
  return out;
}

function blocks(source: string): ReactNode[] {
  return parseBlocks(source).map((b, k) => {
    switch (b.t) {
      case 'code': return <pre key={k} className="code-block md-code" data-lang={b.lang || undefined}>{b.body}</pre>;
      case 'h': { const Tag = (`h${Math.min(b.level + 2, 6)}`) as 'h3'; return <Tag key={k}>{inline(b.text)}</Tag>; }
      case 'ul': return <ul key={k}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>;
      case 'ol': return <ol key={k}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ol>;
      case 'quote': return <blockquote key={k}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</blockquote>;
      case 'hr': return <hr key={k} />;
      case 'table': return (
        <div key={k} className="md-table">
          <table>
            <thead><tr>{b.header.map((cell, j) => <th key={j} style={{ textAlign: b.align[j] }}>{inline(cell)}</th>)}</tr></thead>
            <tbody>{b.rows.map((row, r) => <tr key={r}>{row.map((cell, j) => <td key={j} style={{ textAlign: b.align[j] }}>{inline(cell)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      default: return <p key={k}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
    }
  });
}

/** `code`, **bold**, [text](https://…). Only http(s) links are linked. */
export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<code key={k++}>{m[1]}</code>);
    else if (m[2] !== undefined) out.push(<strong key={k++}>{m[2]}</strong>);
    else out.push(<a key={k++} href={m[4]} target="_blank" rel="noreferrer" className="link-inline">{m[3]}</a>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
