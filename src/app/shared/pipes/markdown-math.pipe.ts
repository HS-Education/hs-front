import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdownMath',
  standalone: true
})
export class MarkdownMathPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    const escaped = MarkdownMathPipe.process(value);
    if (!escaped) return '';
    return this.sanitizer.bypassSecurityTrustHtml(escaped);
  }

  static process(value: string | null | undefined): string {
    if (!value) return '';

    // 1. Escape basic HTML tags to prevent XSS
    let escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1.5 Format Source Badges (e.g. from RAG or internal Contexts)
    escaped = escaped.replace(/(?:\*\*)?Fuente:(?:\*\*)?\s*(.*?)\s*(?:\*\*)?Enlace de descarga:(?:\*\*)?\s*([^\s]+)/gi, (match, sourceName, link) => {
      let finalName = sourceName.trim();
      if (finalName.includes('Contexto') && link === 'N/A') {
         finalName = 'Datos de Rendimiento (AI Interno)';
      }
      return `<br/><span class="inline-flex items-center gap-1.5 mt-3 mb-1 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-3 py-1.5 rounded-lg font-semibold text-[10px] uppercase tracking-wide transition border border-[var(--brand-primary)]/20 w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            Fuente: ${finalName}
          </span><br/>`;
    });

    // Headers
    escaped = escaped.replace(/^###\s+(.*)$/gim, '<h3 class="text-sm font-bold text-[var(--text-primary)] mt-4 mb-2">$1</h3>');
    escaped = escaped.replace(/^##\s+(.*)$/gim, '<h2 class="text-base font-extrabold text-[var(--text-primary)] mt-5 mb-2">$1</h2>');
    escaped = escaped.replace(/^#\s+(.*)$/gim, '<h1 class="text-lg font-black text-[var(--text-primary)] mt-6 mb-3">$1</h1>');

    // 2. Convert code blocks: ```code```
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] my-2 overflow-x-auto">$1</pre>');

    // 3. Convert inline code: `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded-md font-semibold text-[11px]">$1</code>');

    // 4. Convert bold: **text**
    escaped = escaped.replace(/\*\*([\s\S]*?)\*\*/g, '<strong class="font-extrabold text-[var(--text-primary)]">$1</strong>');

    // 5. Convert italic: *text*
    escaped = escaped.replace(/\*([\s\S]*?)\*/g, '<em class="italic">$1</em>');

    // 6. Format Display Math: $$ ... $$ and \[ ... \]
    escaped = escaped.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="math-block bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 rounded-xl p-3 my-2.5 text-center font-serif text-sm text-[var(--text-primary)] font-semibold">$1</div>');
    escaped = escaped.replace(/\\\[([\s\S]*?)\\\]/g, '<div class="math-block bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 rounded-xl p-3 my-2.5 text-center font-serif text-sm text-[var(--text-primary)] font-semibold">$1</div>');

    // 7. Format Inline Math: $ ... $ and \( ... \)
    escaped = escaped.replace(/\$([^$]+)\$/g, '<span class="math-inline font-serif font-semibold text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-1 py-0.5 rounded border border-[var(--brand-primary)]/20">$1</span>');
    escaped = escaped.replace(/\\\(([\s\S]*?)\\\)/g, '<span class="math-inline font-serif font-semibold text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-1 py-0.5 rounded border border-[var(--brand-primary)]/20">$1</span>');

    // 8. Basic Math representations:
    // Replace standard LaTeX math symbols with readable unicode
    escaped = escaped
      .replace(/\\text\{([^}]+)\}/g, '$1') // Strip LaTeX \text{...} wrappers
      .replace(/\\\{/g, '{') // Convert literal \{ to {
      .replace(/\\\}/g, '}') // Convert literal \} to }
      .replace(/\\,/g, ' ') // Remove LaTeX thin space spacers
      .replace(/\\ /g, ' ') // Normal latex space
      .replace(/\\quad/g, ' &nbsp;&nbsp; ') // quad space
      .replace(/\\qquad/g, ' &nbsp;&nbsp;&nbsp;&nbsp; ') // qquad space
      .replace(/\\(dots|cdots)/g, '…') // Convert LaTeX ellipsis
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
      .replace(/\\sqrt\{([^}]+)\}/g, '√$1')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span style="display: inline-flex; flex-direction: column; vertical-align: middle; text-align: center; margin: 0 4px; font-size: 0.95em;"><span style="border-bottom: 1.5px solid var(--border); padding: 0 4px; display: block; line-height: 1.15; font-weight: bold;">$1</span><span style="padding: 0 4px; display: block; line-height: 1.15; font-weight: bold;">$2</span></span>')
      .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>') // Subscripts with curly braces: a_{n}
      .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>') // Superscripts with curly braces: r^{n-1}
      .replace(/\^([0-9a-zA-Z+-]+)/g, '<sup>$1</sup>') // Simple superscripts: x^2
      .replace(/_([0-9a-zA-Z+-]+)/g, '<sub>$1</sub>'); // Simple subscripts: x_n

    // 9. Convert newlines to breaks
    escaped = escaped.replace(/\n/g, '<br/>');

    return escaped;
  }
}
