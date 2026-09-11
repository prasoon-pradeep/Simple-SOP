import type { ReactNode } from 'react';

const REPO_URL = 'https://github.com/prasoon-pradeep/Simple-SOP';

function resolveHref(href: string): string {
  if (/^https?:\/\//.test(href)) return href;
  if (href.startsWith('mailto:')) return href;
  return `${REPO_URL}/blob/master/${href}`;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${i}`}>{match[1]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(
        <code key={`${keyPrefix}-c-${i}`} className="font-mono bg-secondary px-1 py-0.5 rounded text-[10px]">
          {match[4]}
        </code>
      );
    } else {
      nodes.push(
        <a
          key={`${keyPrefix}-a-${i}`}
          href={resolveHref(match[3])}
          target="_blank"
          rel="noreferrer"
          className="text-brand hover:underline"
        >
          {match[2]}
        </a>
      );
    }
    lastIndex = re.lastIndex;
    i++;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/**
 * Renders the small markdown subset used by TERMS.md / PRIVACY.md
 * (# / ## headings, **bold**, [text](url) links, "- " lists, paragraphs).
 * Not a general-purpose markdown parser.
 */
export function renderSimpleMarkdown(md: string): ReactNode {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraphLines.length) {
      const text = paragraphLines.join(' ');
      blocks.push(
        <p key={`p-${key}`} className="mb-3">
          {renderInline(text, `p-${key++}`)}
        </p>
      );
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (listItems.length) {
      blocks.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 mb-3 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInline(item, `li-${key}-${idx}`)}</li>
          ))}
        </ul>
      );
      key++;
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    const h1 = line.match(/^#\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    const li = line.match(/^[-*]\s+(.*)/);

    if (h3) {
      flushParagraph();
      flushList();
      blocks.push(
        <h5 key={`h3-${key}`} className="text-xs font-semibold text-text-primary mt-3 mb-1 first:mt-0">
          {renderInline(h3[1], `h3-${key++}`)}
        </h5>
      );
    } else if (h2) {
      flushParagraph();
      flushList();
      blocks.push(
        <h4 key={`h2-${key}`} className="text-xs font-semibold text-text-primary mt-4 mb-1.5 first:mt-0">
          {renderInline(h2[1], `h2-${key++}`)}
        </h4>
      );
    } else if (h1) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3 key={`h1-${key}`} className="text-sm font-semibold text-text-primary mt-4 mb-2 first:mt-0">
          {renderInline(h1[1], `h1-${key++}`)}
        </h3>
      );
    } else if (li) {
      flushParagraph();
      listItems.push(li[1]);
    } else {
      flushList();
      paragraphLines.push(line);
    }
  }
  flushParagraph();
  flushList();

  return blocks;
}
