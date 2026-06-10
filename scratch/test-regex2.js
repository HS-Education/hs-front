const texts = [
`Fuente: Teoría De Probabilidades
Enlace de descarga: /api/v1/courses/1/documents/1/download`,
`**Fuente:** Teoría De Probabilidades
**Enlace de descarga:** /api/v1/courses/1/documents/1/download`,
`Fuente: **Teoría De Probabilidades**
[Enlace de descarga](/api/v1/courses/1/documents/1/download)`,
`Fuente: Teoría De Probabilidades
Enlace: /api/v1/courses/1/documents/1/download`
];

const regex = /(?:\*\*)?Fuente:(?:\*\*)?\s*([^\r\n]+)\s*[\r\n]+.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;

for (const text of texts) {
  regex.lastIndex = 0;
  const match = regex.exec(text);
  console.log("Match for:", text.split('\n')[0], "->", match !== null);
}
