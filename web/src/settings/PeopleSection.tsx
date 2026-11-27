import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import type { SettingsFormInput } from './settingsFormSchema';
import { SettingsSection } from './SettingsSection';

export function PeopleSection({ footer }: { footer: ReactNode }) {
  const { register } = useFormContext<SettingsFormInput>();
  return (
    <SettingsSection id="people" title="People">
      <div className="grid gap-2">
        <Label htmlFor="engineers">Engineers (one email per line)</Label>
        <Textarea id="engineers" spellCheck={false} {...register('engineers')} />
        <p className="text-muted-foreground">Engineers can change these settings. Gates do not use this list: the owner is the Linear project lead, and anyone who can open the gate page approves as the engineer.</p>
      </div>
      {footer}
    </SettingsSection>
  );
}
