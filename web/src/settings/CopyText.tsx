import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

export function CopyText({ label, text }: { label: string; text: string }) {
  const pre = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const selectByHand = () => {
    if (pre.current) window.getSelection()?.selectAllChildren(pre.current);
  };
  const copy = () => {
    // No clipboard outside a secure context: select the text so it can be copied by hand.
    if (!navigator.clipboard) return selectByHand();
    navigator.clipboard.writeText(text).then(() => setCopied(true), selectByHand);
  };

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{label}</span>
        <Button type="button" variant="outline" size="xs" aria-label={`Copy ${label}`} onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre ref={pre} className="max-h-48 overflow-auto rounded-md bg-secondary px-3 py-2 font-mono text-xs whitespace-pre-wrap wrap-anywhere">
        {text}
      </pre>
    </div>
  );
}
