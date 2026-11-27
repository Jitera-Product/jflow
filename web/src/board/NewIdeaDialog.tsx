import { Lock, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api/ApiError';
import { createIdea } from '@/api/createIdea';
import { getIdeaOwners } from '@/api/getIdeaOwners';
import type { CreatedIdea, IdeaOwners } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/cn';

const LINK = 'text-primary underline underline-offset-4';
const FIELD = 'rounded-3xl px-4';
const SELECT = 'border-input dark:bg-input/30 h-9 w-full rounded-3xl border bg-transparent px-4 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

type Props = { teams: string[]; requester: string; onClose: () => void; onCreated?: () => void };

export function NewIdeaDialog({ teams, requester, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [audience, setAudience] = useState('');
  const [team, setTeam] = useState(teams[0] ?? '');
  const [owners, setOwners] = useState<IdeaOwners['owners']>([]);
  const [ownerId, setOwnerId] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedIdea | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  useEffect(() => {
    if (created) close.current?.focus();
  }, [created]);

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
    setBusy(true);
    setProblems([]);
    try {
      const idea = await createIdea({ title, problem, audience, team, ownerId });
      setCreated(idea);
      if (idea.chatUrl) window.open(idea.chatUrl, '_blank', 'noopener,noreferrer');
      onCreated?.();
    } catch (err) {
      const a = err instanceof ApiError ? err : null;
      setProblems([a?.message || 'Could not create the idea. Try again.', ...(a?.problems ?? [])]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="new-idea-title"
      className="bg-card text-card-foreground m-auto w-[calc(100%-2rem)] max-w-[480px] rounded-3xl border p-6 text-sm shadow-lg backdrop:bg-black/45"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="new-idea-title" className="text-lg leading-none font-semibold">New idea</h2>
            <p className="text-muted-foreground text-xs">Describe the problem. The Flow agent helps you turn it into a feature.</p>
          </div>
          {!created && (
            <Button type="button" variant="ghost" size="icon" className="ml-auto" aria-label="Close" onClick={onClose}>
              <X />
            </Button>
          )}
        </div>
        {created ? (
          <>
            <p className="rounded-md border border-success-border bg-success-bg px-3 py-2 text-success-text">Created in Linear</p>
            <div className="flex flex-wrap gap-4">
              {created.chatUrl && <a href={created.chatUrl} target="_blank" rel="noopener noreferrer" className={LINK}>Open the chat</a>}
              <a href={created.url} target="_blank" rel="noopener noreferrer" className={LINK}>Open in Linear</a>
              <a href="/" className={LINK}>See it on the board</a>
            </div>
            <p>Start it in the Jitera chat with the Flow agent, using the project ID from Linear.</p>
            <div className="flex justify-end">
              <Button ref={close} onClick={onClose}>Close</Button>
            </div>
          </>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="idea-title">Title</Label>
              <Input id="idea-title" className={FIELD} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="idea-problem">What problem does it solve?</Label>
              <Textarea id="idea-problem" className={cn(FIELD, 'resize-none')} rows={4} value={problem} onChange={(e) => setProblem(e.target.value)} maxLength={5000} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="idea-audience">Who is it for?</Label>
                <Input id="idea-audience" className={FIELD} value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={2000} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="idea-owner">Owner</Label>
                <select id="idea-owner" className={SELECT} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                  <option value="">Pick later</option>
                  {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="idea-requester">Requester</Label>
                <Input id="idea-requester" className={FIELD} value={`${requester} (me)`} readOnly />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="idea-team">Team</Label>
                <select id="idea-team" className={SELECT} value={team} onChange={(e) => setTeam(e.target.value)}>
                  {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <p className="bg-secondary text-secondary-foreground flex items-start gap-2.5 rounded-lg p-3 text-[13px]">
              <Lock aria-hidden="true" className="text-muted-foreground mt-px size-4 flex-none" />
              This creates a Linear project and opens a chat with the Flow agent. The team sees the idea on the board.
            </p>
            {problems.length > 0 && (
              <ul role="alert" className="rounded-md border border-error-border bg-error-bg px-3 py-2 text-error-text">
                {problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={busy}>Create and start chat</Button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
