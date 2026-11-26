import { zodResolver } from '@hookform/resolvers/zod';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ApiError } from '@/api/ApiError';
import { getSettings } from '@/api/getSettings';
import { getSetup } from '@/api/getSetup';
import { saveSettings } from '@/api/saveSettings';
import type { SettingsView, SetupView } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { when } from '@/lib/when';
import { PageShell } from '@/shell/PageShell';
import { StatePanel } from '@/shell/StatePanel';
import { ChatsSection } from './ChatsSection';
import { Checklist } from './Checklist';
import { JiteraSection } from './JiteraSection';
import { LinearSection } from './LinearSection';
import { PeopleSection } from './PeopleSection';
import { SaveRow } from './SaveRow';
import { type SettingsFormInput, settingsFormSchema } from './settingsFormSchema';

type Section = 'linear' | 'jitera' | 'people';

const toForm = (s: SettingsView['settings']): SettingsFormInput => ({
  docsUrl: s.docsUrl,
  docsToken: '',
  linearApiKey: '',
  teams: s.teams,
  tdrFolder: s.tdrFolder,
  publicUrl: s.publicUrl,
  engineers: s.engineers.join('\n'),
});

const unchecked = (message: string): SetupView => ({ linear: { ok: false, message }, jitera: { ok: false, message }, chats: { ok: false } });

export function SettingsPage() {
  const [view, setView] = useState<SettingsView | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  const [setup, setSetup] = useState<SetupView | null>(null);
  const [status, setStatus] = useState<{ at: Section; saved: boolean; problems: string[] } | null>(null);
  // A ref, not state: the submit handler in use is the one from before the click.
  const pressed = useRef<Section>('linear');
  const form = useForm({ resolver: zodResolver(settingsFormSchema) });

  const show = (v: SettingsView) => {
    setView(v);
    form.reset(toForm(v.settings));
  };

  const check = () =>
    getSetup()
      .catch(() => unchecked('Could not check. Reload the page to try again.'))
      .then((s) => {
        setSetup(s);
        return s;
      });

  useEffect(() => {
    getSettings().then(show, setFailed);
    check();
  }, []);

  const onSubmit = form.handleSubmit(async ({ docsToken, linearApiKey, publicUrl, ...rest }) => {
    const at = pressed.current;
    setStatus({ at, saved: false, problems: [] });
    try {
      // A blank secret or address is left out, so the stored one stays.
      show(await saveSettings({ ...rest, ...(publicUrl ? { publicUrl } : {}), ...(docsToken ? { docsToken } : {}), ...(linearApiKey ? { linearApiKey } : {}) }));
      setStatus({ at, saved: true, problems: [] });
      check();
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      setStatus({ at, saved: false, problems: err?.problems ?? [err?.message || 'Could not save. Reload the page and try again.'] });
    }
  });

  // Enter in a field would submit through the first Save (Linear) and show the result there, out of view.
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return;
    // Enter that confirms an IME conversion (Japanese input) is not a save. Safari reports it only as keyCode 229.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    if (e.repeat) return; // a held Enter saves once
    const section = e.target.closest('[role="region"]')?.id;
    if (section) pressed.current = section as Section;
    onSubmit();
  };

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
  const busy = form.formState.isSubmitting;
  const footer = (section: Section) => {
    const here = status?.at === section;
    return (
      <SaveRow
        busy={busy && here}
        disabled={busy}
        saved={here && status.saved}
        problems={here ? status.problems : []}
        onClick={() => (pressed.current = section)}
      />
    );
  };

  return (
    <PageShell>
      <div className="grid gap-6">
        <Card className="px-6">
          <div className="grid gap-2">
            <h1 className="text-lg leading-none font-semibold">jflow settings</h1>
            <p className="text-muted-foreground wrap-anywhere">
              {`Last saved by ${s.updatedBy ?? 'nobody'}, `}
              <span className="whitespace-nowrap">{s.updatedAt ? when.format(new Date(s.updatedAt)) : 'never'}</span>
            </p>
          </div>
          <Checklist setup={setup} />
        </Card>
        <FormProvider {...form}>
          <form onSubmit={onSubmit} onKeyDown={onKeyDown} noValidate className="grid gap-6">
            <LinearSection keySet={s.linearApiKeySet} savedAt={s.updatedAt} footer={footer('linear')} />
            <JiteraSection tokenSet={s.docsTokenSet} footer={footer('jitera')} />
            <PeopleSection footer={footer('people')} />
          </form>
        </FormProvider>
        <ChatsSection publicUrl={s.publicUrl} />
      </div>
    </PageShell>
  );
}
