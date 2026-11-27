import type { ProjectPost } from '@/api/types';
import { ago } from '@/lib/ago';
import { shortDate } from '@/lib/shortDate';
import { Markdown } from './Markdown';
import { PanelSection } from './PanelSection';
import { Pill, type PillTone } from './Pill';

const HEALTH: Record<string, [string, PillTone]> = {
  onTrack: ['On track', 'pass'],
  atRisk: ['At risk', 'waits'],
  offTrack: ['Off track', 'fail'],
};

export function PostsSection({ title, posts }: { title: string; posts: ProjectPost[] }) {
  if (!posts.length) return null;
  return (
    <PanelSection title={title}>
      <ul className="flex flex-col gap-4">
        {posts.map((p, i) => {
          const health = p.health ? HEALTH[p.health] : undefined;
          return (
            <li key={i} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="font-medium">{p.author}</span>
                <time dateTime={p.createdAt} title={shortDate(p.createdAt)} className="text-muted-foreground">{ago(p.createdAt)}</time>
                {health && <Pill tone={health[1]} className="ml-auto">{health[0]}</Pill>}
              </div>
              <Markdown>{p.body}</Markdown>
            </li>
          );
        })}
      </ul>
    </PanelSection>
  );
}
