import { Button } from '@/components/ui/Button';

type Props = { busy: boolean; disabled: boolean; saved: boolean; problems: string[]; onClick: () => void };

export function SaveRow({ busy, disabled, saved, problems, onClick }: Props) {
  return (
    <div className="grid gap-3">
      {problems.length > 0 && (
        <ul role="alert" className="grid list-disc gap-1 rounded-md border border-error-border bg-error-bg py-2 pr-3 pl-7 text-error-text">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={busy} disabled={disabled} onClick={onClick}>
          Save
        </Button>
        {saved && (
          <p role="status" className="text-success-text-on-surface">
            Saved
          </p>
        )}
      </div>
    </div>
  );
}
