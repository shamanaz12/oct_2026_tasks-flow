export const PRIORITY = { Low: 'bg-green-100 text-green-700', Medium: 'bg-amber-100 text-amber-700', High: 'bg-red-100 text-red-700' };
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');
export const isOverdue = (d) => d && new Date(d) < new Date(new Date().toDateString());
export const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : '#');
export const ago = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};
// Whitelist-based HTML sanitizer for the rich-text description.
export function sanitize(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const ok = ['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'A'];
  const walk = (n) => [...n.childNodes].forEach((c) => {
    if (c.nodeType === 3) return;
    if (c.nodeType !== 1) return c.remove();
    if (!ok.includes(c.tagName)) return c.replaceWith(doc.createTextNode(c.textContent));
    [...c.attributes].forEach((a) => { if (!(c.tagName === 'A' && a.name === 'href' && /^https?:\/\//i.test(a.value))) c.removeAttribute(a.name); });
    if (c.tagName === 'A') { c.setAttribute('target', '_blank'); c.setAttribute('rel', 'noopener noreferrer'); }
    walk(c);
  });
  walk(doc.body);
  return doc.body.innerHTML;
}
