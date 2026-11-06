import { useState } from 'react';

export function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => void navigator.clipboard.writeText(text).then(() => setCopied(true), () => setCopied(false));
  return (
    <div className="wb-cmd">
      <code>{text}</code>
      <button type="button" className="wb-btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}
