import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/ApiError';
import { getSettings } from '@/api/getSettings';
import { saveSettings } from '@/api/saveSettings';
import type { SettingsView } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { PageShell } from '@/shell/PageShell';
import { StatePanel } from '@/shell/StatePanel';

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const words = (s: string) => s.split(/\s+/).filter(Boolean);

const formSchema = z.object({
  docsUrl: z.string().trim(),
  jiteraProject: z.string().trim(),
  docsToken: z.string().trim(),
  linearApiKey: z.string().trim(),
  teams: z.string().transform((s) => words(s.toUpperCase())),
  engineers: z.string().transform((s) => words(s.toLowerCase())),
});

const toForm = (s: SettingsView['settings']): z.input<typeof formSchema> => ({
  docsUrl: s.docsUrl,
  jiteraProject: s.jiteraProject,
  docsToken: '',
  linearApiKey: '',
  teams: s.teams.join(' '),
  engineers: s.engineers.join('\n'),
});

const secretHint = (isSet: boolean) => (isSet ? 'Set, leave blank to keep' : 'Not set');

export function SettingsPage() {
  const [view, setView] = useState<SettingsView | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const { register, reset, handleSubmit, formState } = useForm({ resolver: zodResolver(formSchema) });

  const show = (v: SettingsView) => {
    setView(v);
    reset(toForm(v.settings));
  };

  useEffect(() => {
    getSettings().then(show, setFailed);
  }, []);

  const onSubmit = handleSubmit(async ({ docsToken, linearApiKey, ...rest }) => {
    setSaved(false);
    setProblems([]);
    try {
      // A blank secret is left out, so the stored one stays.
      show(await saveSettings({ ...rest, ...(docsToken ? { docsToken } : {}), ...(linearApiKey ? { linearApiKey } : {}) }));
      setSaved(true);
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      setProblems(err?.problems ?? [err?.message || 'Could not save. Reload the page and try again.']);
    }
  });

  if (failed) {
    return (
      <PageShell>
        <StatePanel error={failed} />
      </PageShell>
    );
  }
  if (!view) {
    return (
      <PageShell>
        <p className="text-muted-foreground">Loading...</p>
      </PageShell>
    );
  }
  const s = view.settings;
  return (
    <PageShell>
      <Card className="px-6">
        <div className="grid gap-2">
          <h1 className="text-lg leading-none font-semibold">jflow settings</h1>
          <p className="text-muted-foreground wrap-anywhere">
            {`Last saved by ${s.updatedBy ?? 'nobody'}, `}
            <span className="whitespace-nowrap">{s.updatedAt ? when.format(new Date(s.updatedAt)) : 'never'}</span>
          </p>
        </div>
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="docsUrl">Jitera MCP URL</Label>
            <Input id="docsUrl" spellCheck={false} {...register('docsUrl')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="jiteraProject">x-jitera-project</Label>
            <Input id="jiteraProject" spellCheck={false} {...register('jiteraProject')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="docsToken">Docs token</Label>
            <Input id="docsToken" type="password" autoComplete="new-password" placeholder={secretHint(s.docsTokenSet)} {...register('docsToken')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="linearApiKey">Linear API key</Label>
            <Input id="linearApiKey" type="password" autoComplete="new-password" placeholder={secretHint(s.linearApiKeySet)} {...register('linearApiKey')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="teams">Linear teams (space separated)</Label>
            <Input id="teams" spellCheck={false} {...register('teams')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="engineers">Engineers (one email per line)</Label>
            <Textarea id="engineers" spellCheck={false} {...register('engineers')} />
          </div>
          {problems.length > 0 && (
            <ul role="alert" className="grid list-disc gap-1 rounded-md border border-error-border bg-error-bg py-2 pr-3 pl-7 text-error-text">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={formState.isSubmitting}>
              Save
            </Button>
            {saved && (
              <p role="status" className="text-success-text-on-surface">
                Saved
              </p>
            )}
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
