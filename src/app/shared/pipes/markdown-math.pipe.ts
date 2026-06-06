import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdownMath',
  standalone: true
})
export class MarkdownMathPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    // 1. Escape basic HTML tags to prevent XSS
    let escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Convert code blocks: ```code```
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] my-2 overflow-x-auto">$1</pre>');

    // 3. Convert inline code: `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded-md font-semibold text-[11px]">$1</code>');

    // 4. Convert bold: **text**
    escaped = escaped.replace(/\*\*([\s\S]*?)\*\*/g, '<strong class="font-extrabold text-slate-950">$1</strong>');

    // 5. Convert italic: *text*
    escaped = escaped.replace(/\*([\s\S]*?)\*/g, '<em class="italic">$1</em>');

    // 6. Format Display Math: $$ ... $$ and \[ ... \]
    escaped = escaped.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="math-block bg-indigo-50/40 border border-indigo-100/50 rounded-xl p-3 my-2.5 text-center font-serif text-sm text-indigo-900 font-semibold">$1</div>');
    escaped = escaped.replace(/\\\[([\s\S]*?)\\\]/g, '<div class="math-block bg-indigo-50/40 border border-indigo-100/50 rounded-xl p-3 my-2.5 text-center font-serif text-sm text-indigo-900 font-semibold">$1</div>');

    // 7. Format Inline Math: $ ... $ and \( ... \)
    escaped = escaped.replace(/\$([^$]+)\$/g, '<span class="math-inline font-serif font-semibold text-indigo-900 bg-indigo-50/20 px-1 py-0.5 rounded border border-indigo-100/30">$1</span>');
    escaped = escaped.replace(/\\\(([\s\S]*?)\\\)/g, '<span class="math-inline font-serif font-semibold text-indigo-900 bg-indigo-50/20 px-1 py-0.5 rounded border border-indigo-100/30">$1</span>');

    // 8. Basic Math representations:
    // Replace standard LaTeX math symbols with readable unicode
    escaped = escaped
      .replace(/\\text\{([^}]+)\}/g, '$1') // Strip LaTeX \text{...} wrappers
      .replace(/\\\{/g, '{') // Convert literal \{ to {
      .replace(/\\\}/g, '}') // Convert literal \} to }
      .replace(/\\,/g, '') // Remove LaTeX thin space spacers
      .replace(/\\(dots|cdots)/g, '…') // Convert LaTeX ellipsis
      .replace(/\\times/g, ' × ')
      .replace(/\\div/g, ' ÷ ')
      .replace(/\\pm/g, ' ± ')
      .replace(/\\leq?/g, ' ≤ ')
      .replace(/\\geq?/g, ' ≥ ')
      .replace(/\\neq/g, ' ≠ ')
      .replace(/\\alpha/g, ' α ')
      .replace(/\\beta/g, ' β ')
      .replace(/\\theta/g, ' θ ')
      .replace(/\\pi/g, ' π ')
      .replace(/\\sqrt\{([^}]+)\}/g, '√$1')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span style="display: inline-flex; flex-direction: column; vertical-align: middle; text-align: center; margin: 0 4px; font-size: 0.95em;"><span style="border-bottom: 1.5px solid #64748b; padding: 0 4px; display: block; line-height: 1.15; font-weight: bold;">$1</span><span style="padding: 0 4px; display: block; line-height: 1.15; font-weight: bold;">$2</span></span>')
      .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>') // Subscripts with curly braces: a_{n}
      .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>') // Superscripts with curly braces: r^{n-1}
      .replace(/\^([0-9a-zA-Z+-]+)/g, '<sup>$1</sup>') // Simple superscripts: x^2
      .replace(/_([0-9a-zA-Z+-]+)/g, '<sub>$1</sub>'); // Simple subscripts: x_n

    // 9. Convert newlines to breaks
    escaped = escaped.replace(/\n/g, '<br/>');

    return this.sanitizer.bypassSecurityTrustHtml(escaped);
  }
}
