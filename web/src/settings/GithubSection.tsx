import { type ReactNode, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { testGithub } from '@/api/testGithub';
import type { SetupStep } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { SettingsFormInput } from './settingsFormSchema';
import { SettingsSection } from './SettingsSection';

export function GithubSection({ tokenSet, footer }: { tokenSet: boolean; footer: ReactNode }) {
  const { register, getValues } = useFormContext<SettingsFormInput>();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SetupStep | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(await testGithub(getValues('githubToken') ?? '').catch(() => ({ ok: false, message: 'Could not run the test. Reload the page and try again.' })));
    setTesting(false);
  };

  return (
    <SettingsSection id="github" title="GitHub">
      <div className="grid gap-2">
        <Label htmlFor="githubToken">GitHub token</Label>
        <Input
          id="githubToken"
          type="password"
          autoComplete="new-password"
          aria-describedby="githubToken-hint"
          placeholder={tokenSet ? 'Set, leave blank to keep' : 'Not set'}
          {...register('githubToken')}
        />
        <p id="githubToken-hint" className="text-muted-foreground">
          Fine-grained, read-only Pull requests and Checks on the product repos. Optional: without it the board shows the Build table only, with no PR reviews, checks or pilots.
        </p>
      </div>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" loading={testing} onClick={runTest}>
            Test
          </Button>
        </div>
        {result && (
          <p role="status" className={result.ok ? 'text-success-text-on-surface' : 'text-error-text'}>
            {result.ok ? 'jflow can read GitHub with this token.' : result.message}
          </p>
        )}
      </div>
      {footer}
    </SettingsSection>
  );
}
