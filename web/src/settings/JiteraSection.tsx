import { type ReactNode, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { SetupView } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { SettingsFormInput } from './settingsFormSchema';
import { SettingsSection } from './SettingsSection';

type Props = { tokenSet: boolean; test: () => Promise<SetupView>; footer: ReactNode };

export function JiteraSection({ tokenSet, test, footer }: Props) {
  const { register } = useFormContext<SettingsFormInput>();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SetupView['jitera'] | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult((await test()).jitera);
    setTesting(false);
  };

  const field = (id: keyof SettingsFormInput, label: string) => (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} spellCheck={false} {...register(id)} />
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
          <span className="text-muted-foreground">Uses the saved values.</span>
        </div>
        {result && (
          <p role="status" className={result.ok ? 'text-success-text-on-surface' : 'text-error-text'}>
            {result.ok ? 'jflow can read the Jitera documents.' : result.message}
          </p>
        )}
      </div>
      {field('tdrFolder', 'TDR folder')}
      {footer}
    </SettingsSection>
  );
}
