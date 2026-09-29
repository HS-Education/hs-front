import { Pipe, PipeTransform } from '@angular/core';
import DOMPurify from 'dompurify';
import katex from 'katex';

export function sanitizeRenderedHtml(html: string): string {
  return DOMPurify.sanitize(html);
}

@Pipe({
  name: 'markdownMath',
  standalone: true
})
export class MarkdownMathPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return sanitizeRenderedHtml(MarkdownMathPipe.process(value));
  }

  static process(value: string | null | undefined): string {
    if (!value) return '';

    // Render math before the legacy Markdown formatting touches LaTeX syntax.
    // The completed HTML is sanitized at the final binding point.
    const renderedMath: string[] = [];
    const withMathPlaceholders = value.replace(
      /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\$([^$\n]+)\$|\\\(([\s\S]*?)\\\)/g,
      (_match, displayDollar, displayBracket, inlineDollar, inlineBracket) => {
        const displayMode = displayDollar !== undefined || displayBracket !== undefined;
        const expression = displayDollar ?? displayBracket ?? inlineDollar ?? inlineBracket;
        const html = katex.renderToString(expression, {
          displayMode,
          throwOnError: false,
          trust: false,
          maxExpand: 1000,
          maxSize: 8,
        });
        renderedMath.push(html);
        return `MATHRENDER${renderedMath.length - 1}END`;
      }
    );

    // 1. Escape basic HTML tags to prevent XSS
    let escaped = withMathPlaceholders
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1.5 Strip Source Badges completely (e.g. from RAG or internal Contexts)
    escaped = escaped.replace(/(?:\*\*)?(?:Fuente|Source):(?:\*\*)?\s*(.*?)\s*(?:\*\*)?(?:Enlace de descarga|Download link):(?:\*\*)?\s*([^\s]+)/gi, '');

    // 1.8 Protect Math Pipes: escape '|' inside math blocks so it doesn't break Markdown tables
    escaped = escaped.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$\n]+\$|\\\([\s\S]*?\\\))/g, (match) => {
      return match.replace(/\|/g, '&#124;');
    });

    // ──────────────────────────────────────────────────────────────────
    // 2. TABLES — must run BEFORE bold/italic/headers so | chars are clean
    // ──────────────────────────────────────────────────────────────────
    const buildTableHtml = (rows: string[]): string => {
      let html = '<div class="overflow-x-auto my-4 rounded-xl border border-[var(--border)]"><table class="w-full text-left border-collapse">';
      let headerDone = false;
      let bodyOpen = false;

      for (const row of rows) {
        const trimmed = row.trim();
        if (!trimmed || trimmed.length < 3) continue;
        // Skip separator rows: |---|:---|---:|
        if (/^\|[\s\-|:]+\|$/.test(trimmed)) continue;
        // Must look like a table row
        if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;

        // Split by pipe, but handle escaped pipes '&#124;'
        const cells = trimmed.split(/(?<!&#12)\|(?!4;)/).slice(1, -1).map(c => c.trim().replace(/&#124;/g, '|'));
        if (cells.length === 0) continue;

        if (!headerDone) {
          html += '<thead class="bg-[var(--bg-secondary)] border-b border-[var(--border)]"><tr>';
          cells.forEach(c => { html += `<th class="px-4 py-3 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">${c}</th>`; });
          html += '</tr></thead>';
          headerDone = true;
        } else {
          if (!bodyOpen) { html += '<tbody class="divide-y divide-[var(--border)]">'; bodyOpen = true; }
          html += '<tr class="hover:bg-[var(--bg-secondary)]/50 transition">';
          cells.forEach(c => { html += `<td class="px-4 py-3 text-sm text-[var(--text-secondary)]">${c}</td>`; });
          html += '</tr>';
        }
      }
      if (!headerDone) return ''; // no valid rows found
      if (bodyOpen) html += '</tbody>';
      html += '</table></div>';
      return html;
    };

    // Strategy A: Inline compressed tables (all rows on one line separated by ||)
    // e.g. "text:| H1 | H2 ||---|---|| R1 | R2 || R3 | R4 |more text"
    escaped = escaped.replace(/\|[^\n]*\|\|[^\n]*\|/g, (match) => {
      // Split by || and restore the boundary pipes that get eaten
      const pieces = match.split('||');
      const rows: string[] = [];
      for (let i = 0; i < pieces.length; i++) {
        let piece = pieces[i].trim();
        if (i > 0 && !piece.startsWith('|')) piece = '|' + piece;
        if (i < pieces.length - 1 && !piece.endsWith('|')) piece = piece + '|';
        rows.push(piece);
      }

      const contentRows = rows.filter(r => {
        const t = r.trim();
        return t.startsWith('|') && t.endsWith('|') && !/^\|[\s\-|:]+\|$/.test(t);
      });
      if (contentRows.length < 2) return match;

      const result = buildTableHtml(rows);
      return result || match;
    });

    // Strategy B: Standard multiline tables (rows separated by \n)
    escaped = escaped.replace(/(?:^[ \t]*\|.+\|[ \t]*\n?)+/gm, (match) => {
      if (match.includes('</table>')) return match; // already processed
      const rows = match.trim().split('\n');
      if (rows.length < 2) return match;
      const result = buildTableHtml(rows);
      return result || match;
    });

    // ──────────────────────────────────────────────────────────────────
    // 3. HEADERS, CODE, BOLD, ITALIC, MATH
    // ──────────────────────────────────────────────────────────────────

    // Headers
    escaped = escaped.replace(/^###\s+(.*)$/gim, '<h3 class="text-sm font-bold text-[var(--text-primary)] mt-4 mb-2">$1</h3>');
    escaped = escaped.replace(/^##\s+(.*)$/gim, '<h2 class="text-base font-extrabold text-[var(--text-primary)] mt-5 mb-2">$1</h2>');
    escaped = escaped.replace(/^#\s+(.*)$/gim, '<h1 class="text-lg font-black text-[var(--text-primary)] mt-6 mb-3">$1</h1>');

    // Code blocks: ```code```
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre class="bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border)] p-3.5 rounded-xl font-mono text-[11px] my-2 overflow-x-auto">$1</pre>');

    // Inline code: `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] px-1.5 py-0.5 rounded-md font-semibold text-[11px]">$1</code>');

    // Bold: **text**
    escaped = escaped.replace(/\*\*([\s\S]*?)\*\*/g, '<strong class="font-extrabold text-[var(--text-primary)]">$1</strong>');

    // Italic: *text*
    escaped = escaped.replace(/\*([\s\S]*?)\*/g, '<em class="italic">$1</em>');

    // Display Math: $$ ... $$ and \[ ... \]
    escaped = escaped.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="math-block bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 rounded-xl p-3 my-2.5 text-center font-serif text-sm text-[var(--text-primary)] font-semibold">$1</div>');
    escaped = escaped.replace(/\\\[([\s\S]*?)\\\]/g, '<div class="math-block bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 rounded-xl p-3 my-2.5 text-center font-serif text-sm text-[var(--text-primary)] font-semibold">$1</div>');

    // Inline Math: $ ... $ and \( ... \)
    escaped = escaped.replace(/\$([^$]+)\$/g, '<span class="math-inline font-serif font-semibold text-[var(--brand-primary)] bg-[var(--brand-primary-soft)] px-1 py-0.5 rounded border border-[var(--brand-primary)]/20">$1</span>');
    escaped = escaped.replace(/\\\(([\s\S]*?)\\\)/g, '<span class="math-inline font-serif font-semibold text-[var(--brand-primary)] bg-[var(--brand-primary-soft)] px-1 py-0.5 rounded border border-[var(--brand-primary)]/20">$1</span>');

    // Restore escaped pipes for math blocks if they somehow survived (they should have been matched by the above regexes)
    escaped = escaped.replace(/&#124;/g, '|');

    // LaTeX math symbols → readable unicode
    escaped = escaped
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\\{/g, '{')
      .replace(/\\\}/g, '}')
      .replace(/\\,/g, ' ')
      .replace(/\\ /g, ' ')
      .replace(/\\quad/g, ' &nbsp;&nbsp; ')
      .replace(/\\qquad/g, ' &nbsp;&nbsp;&nbsp;&nbsp; ')
      .replace(/\\(dots|cdots)/g, '…')
      .replace(/\\times/g, ' × ')
      .replace(/\\div/g, ' ÷ ')
      .replace(/\\pm/g, ' ± ')
      .replace(/\\leq?/g, ' ≤ ')
      .replace(/\\geq?/g, ' ≥ ')
      .replace(/\\neq/g, ' ≠ ')
      .replace(/\\approx/g, ' ≈ ')
      .replace(/\\equiv/g, ' ≡ ')
      .replace(/\\sim/g, ' ∼ ')
      .replace(/\\cong/g, ' ≅ ')
      .replace(/\\propto/g, ' ∝ ')
      .replace(/\\rightarrow|\\to/g, ' → ')
      .replace(/\\leftarrow/g, ' ← ')
      .replace(/\\Rightarrow/g, ' ⇒ ')
      .replace(/\\Leftarrow/g, ' ⇐ ')
      .replace(/\\infty/g, ' ∞ ')
      .replace(/\\in\b/g, ' ∈ ')
      .replace(/\\notin\b/g, ' ∉ ')
      .replace(/\\subset/g, ' ⊂ ')
      .replace(/\\subseteq/g, ' ⊆ ')
      .replace(/\\cup/g, ' ∪ ')
      .replace(/\\cap/g, ' ∩ ')
      .replace(/\\sum/g, ' ∑ ')
      .replace(/\\int/g, ' ∫ ')
      .replace(/\\partial/g, ' ∂ ')
      .replace(/\\Delta/g, ' Δ ')
      .replace(/\\nabla/g, ' ∇ ')
      .replace(/\\alpha/g, ' α ')
      .replace(/\\beta/g, ' β ')
      .replace(/\\gamma/g, ' γ ')
      .replace(/\\theta/g, ' θ ')
      .replace(/\\pi/g, ' π ')
      .replace(/\\sigma/g, ' σ ')
      .replace(/\\omega/g, ' ω ')
      .replace(/\\cdot/g, ' · ')
      .replace(/\\displaystyle\s*/g, '')
      .replace(/\\sqrt\{([^}]+)\}/g, '√$1')
      .replace(/\\overline\{([^}]+)\}/g, '<span style="text-decoration: overline;">$1</span>')
      // \frac with up to 2 levels of nested braces: \frac{ A { B {C} } }{ D }
      .replace(/\\d?frac\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g, '<span style="display: inline-flex; flex-direction: column; vertical-align: middle; text-align: center; margin: 0 4px; font-size: 0.95em;"><span style="border-bottom: 1.5px solid var(--border); padding: 0 4px; display: block; line-height: 1.15; font-weight: bold;">$1</span><span style="padding: 0 4px; display: block; line-height: 1.15; font-weight: bold;">$2</span></span>')
      // Run it a second time just in case there are nested \frac inside \frac that were just exposed
      .replace(/\\d?frac\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g, '<span style="display: inline-flex; flex-direction: column; vertical-align: middle; text-align: center; margin: 0 4px; font-size: 0.95em;"><span style="border-bottom: 1.5px solid var(--border); padding: 0 4px; display: block; line-height: 1.15; font-weight: bold;">$1</span><span style="padding: 0 4px; display: block; line-height: 1.15; font-weight: bold;">$2</span></span>')
      .replace(/\\binom\{((?:[^{}]|\{[^{}]*\})*)\}\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<span style="display: inline-flex; flex-direction: column; vertical-align: middle; text-align: center; margin: 0 4px; font-size: 0.95em;"><span style="padding: 0 4px; display: block; line-height: 1.15; font-weight: bold;">$1</span><span style="padding: 0 4px; display: block; line-height: 1.15; font-weight: bold;">$2</span></span>')
      .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
      .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
      .replace(/\^([0-9a-zA-Z+-]+)/g, '<sup>$1</sup>')
      .replace(/_([0-9a-zA-Z+-]+)/g, '<sub>$1</sub>');

    // 4. Force newlines for mashed lists (LLM sometimes streams without \n)
    escaped = escaped.replace(/(\.|\:)\s+(?=\d+\.\s+[A-Z])/g, '$1<br/><br/>'); // e.g. "...calcula: 1. Escribe..."
    escaped = escaped.replace(/(\.|\:)\s+(?=-\s+\d+!)/g, '$1<br/>'); // e.g. "Ejemplos - 1!..."
    escaped = escaped.replace(/(?:\s+-\s+)(?=\d+!)/g, '<br/>- '); // e.g. "... - 2! = ..."

    // Convert newlines to breaks
    escaped = escaped.replace(/\n/g, '<br/>');

    return escaped.replace(/MATHRENDER(\d+)END/g, (match, index) => renderedMath[Number(index)] ?? match);
  }
}
