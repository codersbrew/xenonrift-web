// Updates page: renders public/updates.json, written by Tools/publish-release-notes.py in the game repo.
// Everything is built with text nodes; notes text is never parsed as HTML.

const PLATFORM_LABELS = { ios: 'iPhone & iPad', tvos: 'Apple TV', macos: 'Mac' };
const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]\n]+)\]\((https:\/\/[^)\s]+)\)|<#\d{5,25}>/g;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// **bold**, `code`, [label](https://…) and Discord channel links (<#id>, shown as "Discord").
export function appendInline(parent, text) {
  let last = 0;
  for (const match of String(text).matchAll(INLINE)) {
    parent.append(text.slice(last, match.index));
    const [whole, bold, code, label, url] = match;
    if (bold) parent.append(el('strong', '', bold));
    else if (code) parent.append(el('code', '', code));
    else if (label) {
      const link = el('a', '', label);
      link.href = url;
      link.rel = 'noopener noreferrer';
      parent.append(link);
    } else parent.append('Discord');
    last = match.index + whole.length;
  }
  parent.append(String(text).slice(last));
  return parent;
}

const formatDate = iso => {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
};

function renderEntry(entry) {
  const article = el('article', 'update-entry');
  if (/^[a-z0-9-]+$/.test(entry.id ?? '')) article.id = entry.id;

  const header = el('header', 'update-entry-header');
  const meta = el('p', 'update-meta');
  const time = el('time', '', formatDate(entry.date));
  time.dateTime = entry.date ?? '';
  meta.append(time, ` · Version ${entry.version ?? '?'} · build ${entry.build ?? '?'}`);
  const title = el('h2');
  const anchor = el('a', 'update-anchor', entry.title ?? 'Update');
  if (article.id) anchor.href = `#${article.id}`;
  title.append(anchor);
  const platforms = el('ul', 'update-platforms');
  platforms.setAttribute('aria-label', 'Platforms');
  for (const p of entry.platforms ?? []) platforms.append(el('li', '', PLATFORM_LABELS[p] ?? p));
  header.append(meta, title, platforms);
  article.append(header);

  for (const section of entry.sections ?? []) {
    const block = el('section', 'update-section');
    if (section.heading) block.append(appendInline(el('h3'), section.heading));
    for (const part of section.blocks ?? []) {
      if (part.kind === 'ul') {
        const list = el('ul');
        for (const item of part.items ?? []) list.append(appendInline(el('li'), item));
        block.append(list);
      } else {
        block.append(appendInline(el('p'), part.items?.[0] ?? ''));
      }
    }
    article.append(block);
  }
  return article;
}

export async function loadUpdates(container = document.getElementById('updates')) {
  const status = document.getElementById('updates-status');
  try {
    // The page lives at /updates/; the data file is public/updates.json at the site root.
    const response = await fetch(new URL('../updates.json', location.href), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { updates = [] } = await response.json();
    status.remove();
    if (!updates.length) {
      container.append(el('p', 'updates-status', 'No playtest builds posted yet. Join our Discord to hear about the first one.'));
    } else {
      for (const entry of updates) container.append(renderEntry(entry));
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    }
  } catch {
    status.textContent = 'Updates could not be loaded. Release notes are also posted in our Discord.';
  } finally {
    container.setAttribute('aria-busy', 'false');
  }
}

document.getElementById('copyright-year').textContent = new Date().getFullYear();
loadUpdates();
