import type { RunStatus } from '@/types/domain';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** Single status vocabulary for the whole app. */
export const runStatusMeta: Record<RunStatus, { label: string; tone: Tone; active: boolean }> = {
  created: { label: 'Created', tone: 'neutral', active: true },
  validating: { label: 'Validating', tone: 'info', active: true },
  queued: { label: 'Queued', tone: 'neutral', active: true },
  running: { label: 'Running', tone: 'info', active: true },
  waiting_for_input: { label: 'Waiting', tone: 'warning', active: true },
  cancel_requested: { label: 'Cancelling', tone: 'warning', active: true },
  succeeded: { label: 'Succeeded', tone: 'success', active: false },
  failed: { label: 'Failed', tone: 'danger', active: false },
  cancelled: { label: 'Cancelled', tone: 'neutral', active: false },
};

export const isActive = (s: RunStatus) => runStatusMeta[s]?.active ?? false;
export const canCancel = (s: RunStatus) => s === 'queued' || s === 'running';
