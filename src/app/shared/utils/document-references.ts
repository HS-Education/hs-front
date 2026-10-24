/** Removes model-written source blocks; callers render validated references separately. */
export function stripDocumentReferences(text: string): string {
  return text
    .replace(/(?:\*\*)?(?:Fuente|Source)(?:\*\*)?:(?:\*\*)?[^\n]*/gi, '')
    .replace(/(?:^|\n)[ \t]*(?:[-*•][ \t]*)?(?:\*\*)?(?:Enlace de descarga|Download link)(?:\*\*)?:(?:\*\*)?[^\n]*/gi, '')
    .replace(/(?:Material de apoyo:\s*)?\[[^\]]*\]\([^)]*\/courses\/\d+\/documents\/\d+\/download\)/gi, '')
    .replace(/\n\s*(?:\*\*)?(?:referencias?|fuentes consultadas)(?:\*\*)?:?\s*$/gi, '');
}

export function escapeReferenceTitle(title: string): string {
  return title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
