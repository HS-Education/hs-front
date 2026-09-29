import { MarkdownMathPipe, sanitizeRenderedHtml } from './markdown-math.pipe';

describe('MarkdownMathPipe', () => {
  const pipe = new MarkdownMathPipe();

  it('renders equations and ordinary emphasis', () => {
    const html = pipe.transform('**Resultado:** $x^2+1$');
    expect(html).toContain('<strong');
    expect(html).toContain('katex');
    expect(html).toContain('Resultado:');
  });

  it('does not allow HTML or LaTeX to introduce scripts and event handlers', () => {
    const html = pipe.transform('<img src=x onerror=alert(1)> <svg onload=alert(1)> $\\href{javascript:alert(1)}{click}$ $\\includegraphics{https://invalid.example/x}$');
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
