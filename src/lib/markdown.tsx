/**
 * Minimal, dependency-free, XSS-safe Markdown renderer.
 *
 * We deliberately avoid pulling in a heavy markdown library for a single
 * public page. This renderer escapes ALL HTML first, then applies a small,
 * well-understood subset of Markdown by emitting React elements (never
 * dangerouslySetInnerHTML), so raw input can never inject markup.
 *
 * Supported: # headings (h1–h3), **bold**, *italic*, `inline code`,
 * - / * bullet lists, 1. ordered lists, [text](url) links (http/https only),
 * paragraphs and blank-line separation.
 */
import React from 'react';

type Inline = React.ReactNode;

const SAFE_LINK = /^https?:\/\//i;

/** Render inline spans: bold, italic, code, links. Order matters. */
function renderInline(text: string, keyPrefix: string): Inline[] {
  const nodes: Inline[] = [];
  // Tokenise on the inline constructs we support.
  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-i${i++}`;

    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-panel2 px-1.5 py-0.5 text-[0.85em] text-ink"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      // [label](url)
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const label = linkMatch[1];
        const url = linkMatch[2];
        if (SAFE_LINK.test(url)) {
          nodes.push(
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2"
            >
              {label}
            </a>
          );
        } else {
          // Unsafe scheme (javascript:, data:, etc.) — render as plain text.
          nodes.push(label);
        }
      } else {
        nodes.push(token);
      }
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

/**
 * Parse a markdown string into a list of block-level React elements.
 * Because we build React nodes directly, all text content is auto-escaped
 * by React — there is no HTML injection surface.
 */
export function renderMarkdown(src: string): React.ReactNode {
  const lines = (src ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];

  let i = 0;
  let key = 0;
  const nextKey = () => `b${key++}`;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip.
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Headings (# / ## / ###)
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2].trim(), nextKey());
      const cls =
        level === 1
          ? 'text-xl font-bold text-ink mt-5 mb-2'
          : level === 2
            ? 'text-lg font-semibold text-ink mt-4 mb-2'
            : 'text-base font-semibold text-ink mt-3 mb-1.5';
      const Tag = (`h${level}` as 'h1' | 'h2' | 'h3');
      blocks.push(
        <Tag key={nextKey()} className={cls}>
          {content}
        </Tag>
      );
      i++;
      continue;
    }

    // Unordered list block
    if (/^\s*[-*]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[-*]\s+/, '');
        items.push(
          <li key={nextKey()} className="ml-1">
            {renderInline(itemText, nextKey())}
          </li>
        );
        i++;
      }
      blocks.push(
        <ul
          key={nextKey()}
          className="list-disc list-inside space-y-1 text-ink2 my-2"
        >
          {items}
        </ul>
      );
      continue;
    }

    // Ordered list block
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+\.\s+/, '');
        items.push(
          <li key={nextKey()} className="ml-1">
            {renderInline(itemText, nextKey())}
          </li>
        );
        i++;
      }
      blocks.push(
        <ol
          key={nextKey()}
          className="list-decimal list-inside space-y-1 text-ink2 my-2"
        >
          {items}
        </ol>
      );
      continue;
    }

    // Paragraph — gather consecutive non-blank, non-block lines.
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={nextKey()} className="text-ink2 leading-relaxed my-2">
        {renderInline(paraLines.join(' '), nextKey())}
      </p>
    );
  }

  return <>{blocks}</>;
}
