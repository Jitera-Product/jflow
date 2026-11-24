import { esc } from './esc.js';
import { page } from './page.js';
import type { GateView } from './types.js';

export function gatePage(v: GateView): string {
  const approved = v.approvals.map((a) => `${a.role}: ${a.email}`).join(', ') || 'nobody yet';
  const line = (text: string | null, cls: string) => (text ? `<p class="${cls}">${esc(text)}</p>` : '');
  const buttons = v.csrf
    ? `<form method="post"><input type="hidden" name="csrf" value="${esc(v.csrf)}"><input type="hidden" name="to" value="${esc(v.toLabel)}">
<button name="decision" value="approve">Approve</button><button name="decision" value="changes">Request changes</button></form>`
    : '';
  return page(`${v.project} ${v.feature}`, `<h1>${esc(v.project)} ${esc(v.feature)}</h1>
<dl><dt>Move</dt><dd>${esc(v.from)} -&gt; ${esc(v.to)}</dd>
<dt>Needs</dt><dd>${esc(v.roles.join(', '))}</dd>
<dt>Approved by</dt><dd>${esc(approved)}</dd>
<dt>You are</dt><dd>${esc(v.email)}</dd></dl>
${line(v.error, 'reason error')}${line(v.reason, 'reason')}${buttons}`);
}
