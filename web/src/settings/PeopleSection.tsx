import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import type { SettingsFormInput } from './settingsFormSchema';
import { SettingsSection } from './SettingsSection';

export function PeopleSection({ footer }: { footer: ReactNode }) {
  const { register } = useFormContext<SettingsFormInput>();
  return (
    <SettingsSection id="people" title="People">
      <div className="grid gap-2">
        <Label htmlFor="publicUrl">jflow address (public URL)</Label>
        <Input id="publicUrl" spellCheck={false} placeholder="https://flow.example.com" {...register('publicUrl')} />
        <p className="text-muted-foreground">Chats and gate links use this address.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="engineers">Engineers (one email per line)</Label>
        <Textarea id="engineers" spellCheck={false} {...register('engineers')} />
        <p className="text-muted-foreground">Engineers can change these settings and approve gates as the engineer. The owner is the Linear project lead.</p>
      </div>
      {footer}
    </SettingsSection>
  );
}
