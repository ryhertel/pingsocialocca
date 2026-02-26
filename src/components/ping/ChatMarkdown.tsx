import React from 'react';
import { cn } from '@/lib/utils';

interface ChatMarkdownProps {
  text: string;
  className?: string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Regex order matters: code first, then bold, italic, links
  const inlineRe = /(`([^`]+)`)|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = inlineRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      // inline code
      nodes.push(<code key={key++} className="chat-md-code">{match[2]}</code>);
    } else if (match[3]) {
      // bold
      nodes.push(<strong key={key++}>{match[4]}</strong>);
    } else if (match[5]) {
      // italic
      nodes.push(<em key={key++}>{match[6]}</em>);
    } else if (match[7]) {
      // link
      nodes.push(
        <a key={key++} href={match[9]} target="_blank" rel="noopener noreferrer" className="chat-md-link">
          {match[8]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

function parseLine(line: string): React.ReactNode {
  return <>{parseInline(line)}</>;
}

function parseNonHeadingLines(lines: string[], key: number): React.ReactNode {
  // Check for code block
  if (lines[0]?.startsWith('```')) {
    const code = lines.slice(1, lines[lines.length - 1] === '```' ? -1 : undefined).join('\n');
    return (
      <pre key={key} className="chat-md-codeblock">
        <code>{code}</code>
      </pre>
    );
  }

  // Check if all lines are list items
  const bulletRe = /^[-*] (.+)$/;
  const orderedRe = /^\d+\. (.+)$/;

  const allBullets = lines.every((l) => bulletRe.test(l.trim()));
  const allOrdered = lines.every((l) => orderedRe.test(l.trim()));

  if (allBullets && lines.length > 0) {
    return (
      <ul key={key} className="chat-md-ul">
        {lines.map((l, i) => {
          const m = bulletRe.exec(l.trim());
          return <li key={i}>{m ? parseLine(m[1]) : parseLine(l)}</li>;
        })}
      </ul>
    );
  }

  if (allOrdered && lines.length > 0) {
    return (
      <ol key={key} className="chat-md-ol">
        {lines.map((l, i) => {
          const m = orderedRe.exec(l.trim());
          return <li key={i}>{m ? parseLine(m[1]) : parseLine(l)}</li>;
        })}
      </ol>
    );
  }

  // Regular paragraph
  return (
    <p key={key}>
      {lines.map((l, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {parseLine(l)}
        </React.Fragment>
      ))}
    </p>
  );
}

function parseBlock(block: string, blockKey: number): React.ReactNode {
  const lines = block.split('\n');

  // Code blocks pass through directly
  if (lines[0]?.startsWith('```')) {
    return parseNonHeadingLines(lines, blockKey);
  }

  const headingRe = /^(#{1,6})\s+(.+)$/;
  const elements: React.ReactNode[] = [];
  let nonHeadingBuffer: string[] = [];
  let subKey = 0;

  const flushBuffer = () => {
    if (nonHeadingBuffer.length > 0) {
      elements.push(parseNonHeadingLines(nonHeadingBuffer, subKey++));
      nonHeadingBuffer = [];
    }
  };

  for (const line of lines) {
    const hm = headingRe.exec(line.trim());
    if (hm) {
      flushBuffer();
      const level = Math.min(hm[1].length, 6) as 1 | 2 | 3 | 4 | 5 | 6;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      elements.push(<Tag key={subKey++} className={`chat-md-h${level}`}>{parseLine(hm[2])}</Tag>);
    } else {
      nonHeadingBuffer.push(line);
    }
  }
  flushBuffer();

  if (elements.length === 1) return React.cloneElement(elements[0] as React.ReactElement, { key: blockKey });
  return <React.Fragment key={blockKey}>{elements}</React.Fragment>;
}

export function ChatMarkdown({ text, className }: ChatMarkdownProps) {
  if (!text) return null;

  // Split on code blocks first, then paragraphs
  const codeBlockRe = /(```[\s\S]*?```)/g;
  const segments = text.split(codeBlockRe);

  const blocks: React.ReactNode[] = [];
  let key = 0;

  for (const segment of segments) {
    if (segment.startsWith('```')) {
      blocks.push(parseBlock(segment, key++));
    } else {
      const paragraphs = segment.split(/\n{2,}/);
      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (trimmed) {
          blocks.push(parseBlock(trimmed, key++));
        }
      }
    }
  }

  return <div className={cn('chat-markdown', className)}>{blocks}</div>;
}
