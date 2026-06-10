const rawText = `Una probabilidad es una herramienta matemática que permite medir la posibilidad de que ocurra un evento. Se expresa mediante un número entre 0 y 1; 0 indica que el evento es imposible y 1 que ocurrirá con total seguridad. Por ejemplo, al lanzar una moneda, la probabilidad de obtener cara es 1/2, ya que hay dos resultados posibles con la misma posibilidad de aparecer.

Fuente: Teoría De Probabilidades
Enlace de descarga: /api/v1/courses/1/documents/1/download`;

const regex = /\s*(?:\*\*)?Fuente:(?:\*\*)?\s*([^\r\n]+)\s*[\r\n]+.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;

let result = rawText.replace(regex, (match, p1) => {
  return ` [1]\n\n@@@SOURCEBLOCK:0@@@`;
});

console.log(result);
