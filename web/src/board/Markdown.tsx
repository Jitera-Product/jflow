import ReactMarkdown, { type Components } from 'react-markdown';

const COMPONENTS: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  img: ({ node: _node, src, alt }) => (typeof src === 'string' && src.startsWith('https://') ? <img src={src} alt={alt ?? ''} /> : null),
};

// raw HTML in the text is skipped, never rendered
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown components={COMPONENTS} skipHtml>{children}</ReactMarkdown>
    </div>
  );
}
