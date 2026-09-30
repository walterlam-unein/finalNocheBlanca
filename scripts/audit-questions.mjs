import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/questions.js', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const pool = sandbox.window.QUESTION_POOL;
if (!Array.isArray(pool)) throw new Error('QUESTION_POOL no está definido correctamente.');

const counts = pool.reduce((acc, q) => {
  acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
  if (!q.id || !q.question || !Array.isArray(q.choices) || q.choices.length !== 4 || !q.answer) {
    throw new Error(`Pregunta inválida: ${q.id || 'sin id'}`);
  }
  if (!q.choices.includes(q.answer)) throw new Error(`La respuesta correcta no aparece en las opciones: ${q.id}`);
  return acc;
}, {});

const expected = { easy: 35, medium: 10, hard: 5 };
for (const [key, value] of Object.entries(expected)) {
  if ((counts[key] || 0) !== value) throw new Error(`Distribución incorrecta para ${key}: ${counts[key] || 0}, esperado ${value}`);
}
if (pool.length !== 50) throw new Error(`El banco debe contener 50 preguntas y contiene ${pool.length}.`);

const ids = new Set(pool.map((q) => q.id));
if (ids.size !== pool.length) throw new Error('Hay IDs de preguntas duplicados.');

console.log(`Banco validado: ${counts.easy} fáciles, ${counts.medium} medias, ${counts.hard} difíciles. Total: ${pool.length}.`);
