const text = `Una probabilidad es una herramienta matemática que permite medir la posibilidad de que ocurra un evento. Se expresa mediante un número entre 0 y 1: 0 indica que el evento es imposible y 1 que ocurrirá con total seguridad. Por ejemplo, al lanzar una moneda, la probabilidad de obtener cara es 1/2, ya que hay dos resultados posibles con la misma posibilidad de aparecer.

**Fuente:** Teoría De Probabilidades
**Enlace de descarga:** /api/v1/courses/1/documents/1/download`;

const regex = /Fuente:\s*([^\r\n]+)\s*[\r\n]+\s*Enlace de descarga:\s*.*?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
const match = regex.exec(text);
console.log("Match:", match);
