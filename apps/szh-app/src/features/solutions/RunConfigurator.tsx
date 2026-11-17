import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Play, ShieldCheck } from 'lucide-react';
import type { Solution, SolutionVersion } from '@/types/domain';
import { backendName, useDataSource } from '@/lib/api/datasource';
import { useCreateRun, useHealth } from '@/lib/api/queries';
import { ApiError } from '@/lib/api/contract';
import { defaultsFromSchema, validateAgainstSchema } from '@/lib/schema';
import { Button, Callout, Dialog, KeyValue, useToast } from '@/components/ui';
import { SolutionInputForm } from '@/components/solutions/SolutionInputForm';

type Preflight =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'passed'; signature: string }
  | { state: 'failed'; message: string };

/**
 * Configure → Validate (server) → Confirm → Create Run → open Run Console.
 * Shared by the Solution Workspace and the AI-planned task flow, so both paths create identical Runs.
 */
export function RunConfigurator({ solution, version, initialInput, sourceRunId, onCreated }: {
  solution: Solution; version: SolutionVersion; initialInput?: Record<string, unknown>; sourceRunId?: string; onCreated?: (runId: string) => void;
}) {
  const { source, kind } = useDataSource();
  const health = useHealth();
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateRun();
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...defaultsFromSchema(version.inputSchema), ...initialInput }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preflight, setPreflight] = useState<Preflight>({ state: 'idle' });
  const [confirming, setConfirming] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const signature = useMemo(() => JSON.stringify([version.version, values]), [version.version, values]);
  const offline = kind === 'harness' && health.isError;

  // Switching version resets the form to that version's schema defaults.
  useEffect(() => { setValues({ ...defaultsFromSchema(version.inputSchema), ...initialInput }); setErrors({}); setPreflight({ state: 'idle' }); }, [version.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (key: string, value: unknown) => {
    setValues((v) => { const next = { ...v }; if (value === undefined) delete next[key]; else next[key] = value; return next; });
    setErrors((e) => { const { [key]: _removed, ...rest } = e; return rest; });
    setPreflight((p) => (p.state === 'failed' ? { state: 'idle' } : p));
    requestId.current = crypto.randomUUID(); // new input ⇒ new idempotency key
  };

  const validate = async () => {
    const local = validateAgainstSchema(version.inputSchema, values);
    if (Object.keys(local).length) { setErrors(local); setPreflight({ state: 'failed', message: 'Fix the marked fields first.' }); return false; }
    setPreflight({ state: 'checking' });
    try {
      const result = await source.validateInput(solution.id, version.version, values);
      if (result.valid) { setPreflight({ state: 'passed', signature }); return true; }
      setErrors(result.fieldErrors); setPreflight({ state: 'failed', message: result.message });
    } catch (error) {
      setPreflight({ state: 'failed', message: (error as Error).message });
    }
    return false;
  };

  const passed = preflight.state === 'passed' && preflight.signature === signature;

  const submit = async () => {
    try {
      const run = await create.mutateAsync({ solutionId: solution.id, version: version.version, input: values, requestId: requestId.current, sourceRunId });
      setConfirming(false);
      toast({ tone: 'success', message: `Run #${run.id.slice(0, 8)} created` });
      onCreated?.(run.id);
      navigate(`/runs/${run.id}`);
    } catch (error) {
      setConfirming(false);
      const e = error as ApiError;
      setPreflight({ state: 'failed', message: e.code === 'runtime_unavailable' ? 'Harness has no executor for this Solution, so it cannot run yet. The inputs passed validation.' : e.message });
    }
  };

  return (
    <div className="configurator">
      <div className="configurator-form">
        <SolutionInputForm schema={version.inputSchema} values={values} errors={errors} onChange={change} disabled={create.isPending} />
      </div>
      <div className="configurator-bar">
        <div className="grow" aria-live="polite">
          {preflight.state === 'idle' && <span className="small muted">{backendName(kind)} validates these inputs against v{version.version} before you submit.</span>}
          {preflight.state === 'checking' && <span className="small muted">Validating…</span>}
          {preflight.state === 'passed' && (passed
            ? <span className="small row" style={{ color: 'var(--success)' }}><CheckCircle2 size={15} />Validation passed. Ready to run.</span>
            : <span className="small muted">Inputs changed. Validate again.</span>)}
          {preflight.state === 'failed' && <Callout tone="danger" title="Cannot run">{preflight.message}</Callout>}
        </div>
        <Button icon={<ShieldCheck />} loading={preflight.state === 'checking'} disabled={offline} onClick={validate}>Validate</Button>
        <Button variant="primary" icon={<Play />} disabled={offline || create.isPending}
          onClick={async () => { if (passed || (await validate())) setConfirming(true); }}>
          Run
        </Button>
      </div>

      <Dialog open={confirming} onClose={() => setConfirming(false)} title="Confirm run"
        description={kind === 'mock' ? 'This creates a demo run in the browser. It is not sent to Harness. You can watch or cancel it on the run page.' : 'This creates a run on Harness with the configuration below. You can watch or cancel it on the run page.'}
        footer={<><Button onClick={() => setConfirming(false)}>Back</Button><Button variant="primary" icon={<Play />} loading={create.isPending} onClick={submit}>Confirm run</Button></>}>
        <KeyValue items={[
          ['Solution', solution.name],
          ['Version', `v${version.version}`],
          ['Source', kind === 'mock' ? 'Demo data (computed in the browser)' : 'Harness'],
          ...(sourceRunId ? [['Based on', `#${sourceRunId.slice(0, 8)}`] as [string, string]] : []),
        ]} />
        <pre className="code-block" style={{ marginTop: 12, maxHeight: 200 }}>{JSON.stringify(values, null, 2)}</pre>
      </Dialog>
    </div>
  );
}
