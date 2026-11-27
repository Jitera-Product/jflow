import type { QaCheck } from '@/api/types';
import { MaybeLink } from './MaybeLink';
import { Pill } from './Pill';

const isUrl = (s: string) => /^https?:\/\/\S+$/.test(s);

export function QaSection({ checks, pilot }: { checks: QaCheck[]; pilot: string | null }) {
  const failed = checks.filter((c) => !c.passed).length;
  const passed = checks.length - failed;
  return (
    <section className="flex flex-col gap-3.5 border-b px-7 py-6 last:border-b-0">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{pilot ? `QA on pilot ${pilot}` : 'QA'}</h3>
        {passed > 0 && <Pill tone="pass" className="ml-auto">{`${passed} passed`}</Pill>}
        {failed > 0 && <Pill tone="fail" className={passed ? '' : 'ml-auto'}>{`${failed} failed`}</Pill>}
      </div>
      <ul className="flex flex-col gap-1 text-[13px]">
        {checks.map((c, i) => (
          <li key={i} className="flex min-h-8 items-start gap-2.5 py-1">
            <Pill tone={c.passed ? 'pass' : 'fail'}>{c.passed ? 'Pass' : 'Fail'}</Pill>
            <span className="min-w-0 pt-0.5 wrap-anywhere">
              {c.check}
              {c.evidence && (
                <>
                  {' '}
                  <MaybeLink href={isUrl(c.evidence) ? c.evidence : null} className="text-muted-foreground">{c.evidence}</MaybeLink>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
