import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownMathPipe, sanitizeRenderedHtml } from './markdown-math.pipe';

describe('MarkdownMathPipe', () => {
  let sanitizer: DomSanitizer;
  let pipe: MarkdownMathPipe;

  const renderHtml = (value: string): string =>
    sanitizer.sanitize(SecurityContext.HTML, pipe.transform(value)) ?? '';

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sanitizer = TestBed.inject(DomSanitizer);
    pipe = new MarkdownMathPipe(sanitizer);
  });

  it('renders equations and ordinary emphasis', () => {
    const html = renderHtml('**Resultado:** $x^2+1$');
    expect(html).toContain('<strong');
    expect(html).toContain('katex');
    expect(html).toContain('Resultado:');
  });

  it('preserves KaTeX layout styles so legacy unwrapped fractions do not overlap', () => {
    const html = renderHtml('P(A)=\\frac{\\text{casos favorables}}{\\text{casos posibles}}');
    expect(html).toContain('katex');
    expect(html).toContain('mfrac');
    expect(html).toContain('casos favorables');
    expect(html).toContain('casos posibles');
    expect(html).toMatch(/style="top:/);
    expect(html).not.toContain('inline-flex; flex-direction: column');
  });

  it('does not allow HTML or LaTeX to introduce scripts and event handlers', () => {
    const html = renderHtml('<img src=x onerror=alert(1)> <svg onload=alert(1)> $\\href{javascript:alert(1)}{click}$ $\\includegraphics{https://invalid.example/x}$');
    const documentFragment = new DOMParser().parseFromString(html, 'text/html');
    expect(documentFragment.querySelector('script, img, svg, [onerror], [onload], [onclick]')).toBeNull();
    expect(documentFragment.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(html).toContain('&lt;img');
  });

  it('sanitizes final markup after source links are added', () => {
    const html = sanitizeRenderedHtml('<a href="javascript:alert(1)" data-source-index="0">[1]</a>');
    const link = new DOMParser().parseFromString(html, 'text/html').querySelector('a');
    expect(link?.getAttribute('href')).toBeNull();
    expect(link?.dataset['sourceIndex']).toBe('0');
  });
});
