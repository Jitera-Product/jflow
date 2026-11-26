import { type FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/api/ApiError';
import { createIdea } from '@/api/createIdea';
import { getIdeaOwners } from '@/api/getIdeaOwners';
import type { CreatedIdea, IdeaOwners } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

const SELECT = 'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

type Props = { teams: string[]; onClose: () => void; onCreated?: () => void };

export function NewIdeaDialog({ teams, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [audience, setAudience] = useState('');
  const [team, setTeam] = useState(teams[0] ?? '');
  const [owners, setOwners] = useState<IdeaOwners['owners']>([]);
  const [ownerId, setOwnerId] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedIdea | null>(null);

  useEffect(() => {
    let live = true;
    setOwners([]);
    setOwnerId('');
    setProblems([]);
    getIdeaOwners(team).then(
      (o) => {
        if (!live) return;
        setOwners(o.owners);
        setOwnerId(o.defaultOwnerId ?? '');
      },
      () => live && setProblems(['Could not load the team members. Close and try again.']),
    );
    return () => {
      live = false;
    };
  }, [team]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setProblems(['Give the idea a title.']);
    if (!ownerId) return setProblems(['Pick an owner.']);
    setBusy(true);
    setProblems([]);
    try {
      setCreated(await createIdea({ title, problem, audience, team, ownerId }));
      onCreated?.();
    } catch (err) {
      const a = err instanceof ApiError ? err : null;
      setProblems([a?.message || 'Could not create the idea. Try again.', ...(a?.problems ?? [])]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh]" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="new-idea-title" className="bg-card text-card-foreground flex w-full max-w-md flex-col gap-5 rounded-xl border p-6 text-sm shadow-lg">
        <h2 id="new-idea-title" className="text-lg leading-none font-semibold">New idea</h2>
        {created ? (
          <>
            <p className="rounded-md border border-success-border bg-success-bg px-3 py-2 text-success-text">Created in Linear</p>
            <a href={created.url} target="_blank" rel="noopener" className="text-primary underline underline-offset-4">Open in Linear</a>
            <p>Start it in the Jitera chat with the Flow agent, using the project ID from Linear.</p>
            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="idea-title">Title</Label>
              <Input id="idea-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="idea-problem">The problem</Label>
              <Textarea id="idea-problem" value={problem} onChange={(e) => setProblem(e.target.value)} maxLength={5000} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="idea-audience">Who it is for</Label>
              <Textarea id="idea-audience" value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={2000} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="idea-team">Team</Label>
                <select id="idea-team" className={SELECT} value={team} onChange={(e) => setTeam(e.target.value)}>
                  {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="idea-owner">Owner</Label>
                <select id="idea-owner" className={SELECT} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required>
                  <option value="">Pick an owner</option>
                  {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>
            {problems.length > 0 && (
              <ul role="alert" className="rounded-md border border-error-border bg-error-bg px-3 py-2 text-error-text">
                {problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={busy}>Create</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
