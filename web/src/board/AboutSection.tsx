import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Markdown } from './Markdown';
import { PanelSection } from './PanelSection';

const isLong = (s: string) => s.split('\n').length > 12 || s.length > 900;

export function AboutSection({ summary, content }: { summary: string; content: string }) {
  const [open, setOpen] = useState(false);
  if (!summary && !content) return null;
  const fold = isLong(content) && !open;
  return (
    <PanelSection title="About">
      {summary && <p className="text-muted-foreground text-[13px]">{summary}</p>}
      {content && (
        <div
          data-testid="about-body"
          className={cn(fold && 'max-h-60 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]')}
        >
          <Markdown>{content}</Markdown>
        </div>
      )}
      {isLong(content) && (
        <button type="button" className="text-muted-foreground hover:text-foreground self-start text-[13px] font-medium" onClick={() => setOpen(!open)}>
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </PanelSection>
  );
}
