import { useEffect, useState } from 'react';
import { getAgentPrompt } from '@/api/getAgentPrompt';
import { CopyText } from './CopyText';

const block = 'grid gap-3 rounded-md border p-4';

export function ChatBlocks({ token }: { token: string }) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    getAgentPrompt().then(setPrompt, () => setFailed(true));
  }, []);
  const url = `${window.location.origin}/mcp`;

  return (
    <div className="grid gap-4">
      <div role="group" aria-label="Jitera" className={block}>
        <h3 className="font-semibold">Jitera</h3>
        <p>Make an agent with this prompt. In its Connectors, add a custom connector with the fields below.</p>
        {prompt !== null ? (
          <CopyText label="Agent prompt" text={prompt} />
        ) : (
          <p className="text-muted-foreground">{failed ? 'Could not load the agent prompt. It is also at /api/agent-prompt.' : 'Loading the agent prompt...'}</p>
        )}
        <CopyText label="MCP Server URL" text={url} />
        <p>Client ID: leave it empty, so Jitera sends the secret as a bearer token.</p>
        <CopyText label="Client Secret" text={token} />
      </div>
      <div role="group" aria-label="Claude Code" className={block}>
        <h3 className="font-semibold">Claude Code</h3>
        <CopyText label="Run in Claude Code" text={'/plugin marketplace add Jitera-Product/jflow\n/plugin install flow@jflow'} />
        <CopyText label="Run in a terminal" text={`claude mcp add --transport http jflow ${url} --header "Authorization: Bearer ${token}"`} />
      </div>
      <div role="group" aria-label="Other MCP chat" className={block}>
        <h3 className="font-semibold">Other MCP chat</h3>
        <CopyText label="URL" text={url} />
        <CopyText label="Header" text={`Authorization: Bearer ${token}`} />
      </div>
    </div>
  );
}
