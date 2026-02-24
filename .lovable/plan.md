

# Add Markdown Rendering to Chat Messages

## The Problem
All chat messages render as plain text inside a single `<p>` tag. Bold, italics, line breaks, bullet points, numbered lists, and paragraphs all get squished into one unformatted blob of text.

## Solution
Create a lightweight markdown renderer component (zero new dependencies) and use it in both ChatStack and DockedChat.

## What Will Be Supported
- Bold text
- Italic text
- Line breaks and paragraphs
- Bullet lists
- Numbered lists
- Inline code
- Code blocks
- Links

## Files Changed

| File | What changes |
|------|-------------|
| `src/components/ping/ChatMarkdown.tsx` | New file -- lightweight markdown-to-JSX renderer |
| `src/components/ping/ChatStack.tsx` | Replace plain `<p>` tag with ChatMarkdown component |
| `src/components/ping/DockedChat.tsx` | Same replacement as ChatStack |
| `src/index.css` | Add scoped styles for lists, code blocks, paragraphs |

## Technical Approach

The ChatMarkdown component will:
1. Split text on double-newlines into paragraphs
2. Detect bullet and numbered list runs and wrap in proper list elements
3. Apply inline regex replacements for bold, italic, code, and links
4. Render single newlines as line breaks
5. No external dependencies -- pure regex and React

Scoped CSS additions for `.chat-markdown`:
- Paragraph spacing
- List indentation and markers
- Inline code with subtle background
- Code blocks with background and padding
- Links with underline

