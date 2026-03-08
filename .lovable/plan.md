

# Fix Markdown Headings Not Rendering in Multi-Line Blocks

## Problem
The `ChatMarkdown` parser only detects headings when a block contains exactly one line (`lines.length === 1`). If a heading like `## Agent/automation vibe` is followed by body text with a single newline (no blank line separator), the entire block is treated as a plain paragraph -- so `##` renders as literal text.

## Fix
Change `parseBlock` in `ChatMarkdown.tsx` to process each line individually instead of only checking single-line blocks. When a line starts with `#`, render it as a heading element. Other lines continue through the existing list/paragraph logic.

## Technical Detail

**File: `src/components/ping/ChatMarkdown.tsx`**

Replace the current `parseBlock` function logic:

1. Remove the `lines.length === 1` guard around heading detection
2. Process lines one at a time: split the block into "runs" where heading lines become their own elements and consecutive non-heading lines get grouped into paragraphs/lists as before
3. This handles both standalone headings and headings mixed into multi-line content

The key change is roughly:

```tsx
function parseBlock(block: string, blockKey: number): React.ReactNode {
  const lines = block.split('\n');
  const headingRe = /^(#{1,6})\s+(.+)$/;

  // If block has mixed heading + non-heading lines, split into sub-blocks
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
      const level = Math.min(hm[1].length, 6);
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
```

The existing code-block, list, and paragraph logic moves into a helper `parseNonHeadingLines()` function that handles the non-heading line groups.

No other files need changes -- the heading CSS styles already exist in `index.css`.

