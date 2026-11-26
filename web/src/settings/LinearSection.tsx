import { type ReactNode, useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { ApiError } from '@/api/ApiError';
import { createLinearLabels } from '@/api/createLinearLabels';
import { getLinearLabels } from '@/api/getLinearLabels';
import { getLinearTeams } from '@/api/getLinearTeams';
import type { LinearTeam } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { SettingsFormInput } from './settingsFormSchema';
import { SettingsSection } from './SettingsSection';

type Props = { keySet: boolean; savedAt: string | null; footer: ReactNode };

const sayError = (e: unknown, fallback: string) => (e instanceof ApiError && e.message) || fallback;

export function LinearSection({ keySet, savedAt, footer }: Props) {
  const { register } = useFormContext<SettingsFormInput>();
  const [teams, setTeams] = useState<LinearTeam[] | null>(null);
  const [teamsFailed, setTeamsFailed] = useState<unknown>(null);
  const [missing, setMissing] = useState<string[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [labelsProblem, setLabelsProblem] = useState<string | null>(null);

  // Read again after each save: the key may have changed.
  useEffect(() => {
    if (!keySet) return;
    getLinearTeams().then((r) => {
      setTeams(r.teams);
      setTeamsFailed(null);
    }, setTeamsFailed);
    getLinearLabels().then(setMissingFrom, () => setMissing(null));
  }, [keySet, savedAt]);

  function setMissingFrom(r: { missing: string[] }) {
    setMissing(r.missing);
    setLabelsProblem(null);
  }

  const createLabels = async () => {
    setCreating(true);
    try {
      setMissingFrom(await createLinearLabels());
    } catch (e) {
      setLabelsProblem(sayError(e, 'Could not create the labels.'));
    } finally {
      setCreating(false);
    }
  };

  const noKey = !keySet || (teamsFailed instanceof ApiError && teamsFailed.error === 'no_key');

  return (
    <SettingsSection id="linear" title="Linear">
      <div className="grid gap-2">
        <Label htmlFor="linearApiKey">Linear API key</Label>
        <Input id="linearApiKey" type="password" autoComplete="new-password" placeholder={keySet ? 'Set, leave blank to keep' : 'Not set'} {...register('linearApiKey')} />
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm leading-none font-medium">Teams</legend>
        {noKey ? (
          <p className="text-muted-foreground">Save the Linear key first.</p>
        ) : teamsFailed ? (
          <p role="alert" className="text-error-text">{sayError(teamsFailed, 'Could not read the Linear teams.')}</p>
        ) : !teams ? (
          <p className="text-muted-foreground">Loading teams...</p>
        ) : (
          <Controller<SettingsFormInput, 'teams'>
            name="teams"
            render={({ field }) => {
              // A picked team the key cannot see stays, so a save does not drop it silently.
              const shown = [...teams, ...field.value.filter((k) => !teams.some((t) => t.key === k)).map((key) => ({ key, name: key }))];
              const toggle = (key: string, on: boolean) => field.onChange(on ? [...field.value, key] : field.value.filter((k) => k !== key));
              return (
                <div className="grid gap-2">
                  {shown.map((t) => (
                    <label key={t.key} className="flex items-center gap-2">
                      <input type="checkbox" className="size-4 accent-primary" checked={field.value.includes(t.key)} onChange={(e) => toggle(t.key, e.target.checked)} />
                      <span>{t.name}</span>
                      <span className="text-muted-foreground">{t.key}</span>
                    </label>
                  ))}
                </div>
              );
            }}
          />
        )}
      </fieldset>
      {!noKey && missing && (
        <div className="grid gap-2">
          {missing.length === 0 ? (
            <p className="text-muted-foreground">All flow labels exist.</p>
          ) : (
            <>
              <p className="wrap-anywhere">{`Missing project labels: ${missing.join(', ')}`}</p>
              <div>
                <Button type="button" variant="outline" loading={creating} onClick={createLabels}>
                  {`Create ${missing.length} ${missing.length === 1 ? 'label' : 'labels'}`}
                </Button>
              </div>
            </>
          )}
          {labelsProblem && (
            <p role="alert" className="text-error-text">
              {labelsProblem}
            </p>
          )}
        </div>
      )}
      {footer}
    </SettingsSection>
  );
}
