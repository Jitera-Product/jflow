import { type FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/api/ApiError';
import { createChat } from '@/api/createChat';
import { getChats } from '@/api/getChats';
import { getSettings } from '@/api/getSettings';
import { revokeChat } from '@/api/revokeChat';
import type { ChatToken, CreatedChat } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { when } from '@/lib/when';
import { ChatBlocks } from './ChatBlocks';
import { CopyText } from './CopyText';
import { SettingsSection } from './SettingsSection';

const sayError = (e: unknown, fallback: string) => {
  if (!(e instanceof ApiError)) return fallback;
  if (e.error === 'no_public_url') return 'Save the settings once first, so jflow knows its address.';
  return e.problems?.[0] || e.message || fallback;
};

export function ChatsSection({ publicUrl }: { publicUrl: string }) {
  const [chats, setChats] = useState<ChatToken[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // 'create' or the id being revoked
  const [problem, setProblem] = useState<string | null>(null);
  // The token lives only here, until Done. It is never stored or read again.
  const [created, setCreated] = useState<(CreatedChat & { publicUrl: string }) | null>(null);

  const load = () => getChats().then((r) => setChats(r.chats), (e) => setProblem(sayError(e, 'Could not load the chat tokens.')));
  useEffect(() => {
    load();
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('create');
    setProblem(null);
    try {
      const chat = await createChat(name.trim());
      // The address may have been set since this page loaded, so read it again.
      const address = await getSettings().then((v) => v.settings.publicUrl, () => publicUrl);
      setCreated({ ...chat, publicUrl: address });
      setAsking(false);
      setName('');
    } catch (err) {
      setProblem(sayError(err, 'Could not create the token. Reload the page and try again.'));
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (id: string) => {
    setBusy(id);
    setProblem(null);
    try {
      await revokeChat(id);
      await load();
    } catch (err) {
      setProblem(sayError(err, 'Could not revoke the token. Reload the page and try again.'));
    } finally {
      setBusy(null);
    }
  };

  const done = () => {
    setCreated(null);
    load();
  };

  return (
    <SettingsSection id="chats" title="Chats">
      <p className="text-muted-foreground">A token connects one chat client to jflow. It names the client, not a person.</p>
      {chats && chats.length > 0 && (
        <ul className="grid gap-3">
          {chats.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3">
              <div className="grid min-w-0 gap-0.5">
                <span className="font-medium wrap-anywhere">{c.name}</span>
                <span className="text-muted-foreground wrap-anywhere">{`Created by ${c.createdBy}, ${when.format(new Date(c.createdAt))}`}</span>
                <span className="text-muted-foreground">{`Last used ${c.lastUsedAt ? when.format(new Date(c.lastUsedAt)) : 'never'}`}</span>
              </div>
              <Button type="button" variant="outline" size="sm" loading={busy === c.id} onClick={() => revoke(c.id)}>
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
      {chats && chats.length === 0 && !created && <p>No chat tokens yet.</p>}
      {created ? (
        <div className="grid gap-4">
          <p className="rounded-md bg-secondary px-3 py-2">{`Token for ${created.chat.name}. Copy it now: jflow shows it only once.`}</p>
          {created.publicUrl ? (
            <ChatBlocks publicUrl={created.publicUrl} token={created.token} />
          ) : (
            <>
              <p role="alert" className="text-error-text">Save the settings once first, so jflow knows its address.</p>
              <CopyText label="Token" text={created.token} />
            </>
          )}
          <div>
            <Button type="button" onClick={done}>
              Done
            </Button>
          </div>
        </div>
      ) : asking ? (
        <form onSubmit={create} noValidate className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="chatName">Chat name</Label>
            <Input id="chatName" spellCheck={false} maxLength={64} placeholder="Jitera, Claude Code" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy === 'create'} disabled={!name.trim()}>
              Create
            </Button>
            <Button type="button" variant="outline" onClick={() => {
                setAsking(false);
                setProblem(null);
              }}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button type="button" variant="outline" onClick={() => setAsking(true)}>
            New token
          </Button>
        </div>
      )}
      {problem && (
        <p role="alert" className="rounded-md border border-error-border bg-error-bg px-3 py-2 text-error-text">
          {problem}
        </p>
      )}
    </SettingsSection>
  );
}
