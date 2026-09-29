const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function flatten(object, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(object)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, full, result);
    else result[full] = value;
  }
  return result;
}
const dictionaries = Object.fromEntries(['es', 'en'].map(lang => [lang, flatten(JSON.parse(fs.readFileSync(path.join(root, `public/i18n/${lang}.json`), 'utf8')))]));
const errors = [];
const placeholders = value => [...value.matchAll(/{{\s*([^}]+?)\s*}}/g)].map(match => match[1]).sort().join('|');
for (const key of new Set([...Object.keys(dictionaries.es), ...Object.keys(dictionaries.en)])) {
  for (const lang of ['es', 'en']) {
    if (typeof dictionaries[lang][key] !== 'string' || !dictionaries[lang][key].trim()) errors.push(`${lang}: missing or empty ${key}`);
  }
  if (dictionaries.es[key] && dictionaries.en[key] && placeholders(dictionaries.es[key]) !== placeholders(dictionaries.en[key])) errors.push(`Interpolation mismatch: ${key}`);
}
function files(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
const sources = files(path.join(root, 'src/app')).filter(file => /\.(html|ts)$/.test(file));
const groups = new Set(Object.keys(dictionaries.es).map(key => key.split('.')[0]));
let references = 0;
for (const file of sources) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(['"`])([A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+)+)\1/g)) {
    const key = match[2];
    if (!groups.has(key.split('.')[0])) continue;
    // Dynamically assembled prefixes are checked through their dictionary families.
    if (/^\s*\+/.test(source.slice(match.index + match[0].length))) continue;
    references++;
    for (const lang of ['es', 'en']) if (!(key in dictionaries[lang])) errors.push(`${path.relative(root, file)}: ${lang} missing ${key}`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS: ${Object.keys(dictionaries.es).length} keys in each language; matching placeholders; ${references} static references across ${sources.length} source files.`);
}
