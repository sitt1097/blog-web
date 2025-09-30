function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" rel="nofollow noreferrer noopener" target="_blank">$1</a>');
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;
  let paragraph: string[] = [];

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  const flushParagraph = () => {
    if (paragraph.length) {
      const text = escapeHtml(paragraph.join(" ").trim());
      html.push(`<p>${formatInline(text)}</p>`);
      paragraph = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      closeList();
      flushParagraph();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      flushParagraph();
      const level = headingMatch[1].length;
      const content = escapeHtml(headingMatch[2].trim());
      html.push(`<h${level}>${formatInline(content)}</h${level}>`);
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      if (!inList) {
        flushParagraph();
        html.push("<ul>");
        inList = true;
      }
      const itemContent = escapeHtml(line.replace(/^[-*+]\s+/, ""));
      html.push(`<li>${formatInline(itemContent)}</li>`);
      continue;
    }

    if (/^>\s+/.test(line)) {
      closeList();
      flushParagraph();
      const quoteContent = escapeHtml(line.replace(/^>\s+/, ""));
      html.push(`<blockquote>${formatInline(quoteContent)}</blockquote>`);
      continue;
    }

    if (/^```/.test(line)) {
      closeList();
      flushParagraph();
      const codeLines: string[] = [];
      let pointer = index + 1;
      while (pointer < lines.length && !/^```/.test(lines[pointer].trim())) {
        codeLines.push(lines[pointer]);
        pointer += 1;
      }
      const code = escapeHtml(codeLines.join("\n"));
      html.push(`<pre><code>${code}</code></pre>`);
      index = pointer;
      continue;
    }

    paragraph.push(line.trim());
  }

  closeList();
  flushParagraph();

  return html.join("\n");
}
