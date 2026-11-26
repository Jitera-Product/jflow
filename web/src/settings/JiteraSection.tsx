import { type ReactNode, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { testJitera } from '@/api/testJitera';
import type { SetupStep } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { SettingsFormInput } from './settingsFormSchema';
import { SettingsSection } from './SettingsSection';

type Props = { tokenSet: boolean; footer: ReactNode };

export function JiteraSection({ tokenSet, footer }: Props) {
  const { register, getValues } = useFormContext<SettingsFormInput>();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SetupStep | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(await testJitera(getValues('docsUrl'), getValues('docsToken') ?? '').catch(() => ({ ok: false, message: 'Could not run the test. Reload the page and try again.' })));
    setTesting(false);
  };

  const field = (id: keyof SettingsFormInput, label: string, hint?: string) => (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} spellCheck={false} aria-describedby={hint ? `${id}-hint` : undefined} {...register(id)} />
      {hint && <p id={`${id}-hint`} className="text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <SettingsSection id="jitera" title="Jitera">
      {field('docsUrl', 'Jitera MCP URL')}
      <div className="grid gap-2">
        <Label htmlFor="docsToken">Jitera token</Label>
        <Input id="docsToken" type="password" autoComplete="new-password" placeholder={tokenSet ? 'Set, leave blank to keep' : 'Not set'} {...register('docsToken')} />
      </div>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" loading={testing} onClick={runTest}>
            Test
          </Button>
        </div>
        {result && (
          <p role="status" className={result.ok ? 'text-success-text-on-surface' : 'text-error-text'}>
            {result.ok ? 'jflow can read the Jitera documents.' : result.message}
          </p>
        )}
      </div>
      {field('tdrFolder', 'TDR folder')}
      {field('flowAgentUrl', 'Flow agent link', 'Open a chat with the Flow agent in Studio and paste its address.')}
      {footer}
    </SettingsSection>
  );
}
