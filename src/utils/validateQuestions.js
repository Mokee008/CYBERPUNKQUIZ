import { questionSchema } from '../schemas/question.js';

export function validateQuestionBank(questions) {
  const errors = [];
  const ids = new Set();
  const texts = new Set();

  if (!Array.isArray(questions)) {
    throw new Error('Question bank must be an array of questions');
  }

  questions.forEach((q, idx) => {
    // 1. Validate against schema
    const parseRes = questionSchema.safeParse(q);
    if (!parseRes.success) {
      errors.push(`Question index ${idx} (id: ${q?.id}): ${parseRes.error.errors.map(e => e.message).join(', ')}`);
    }

    // 2. Validate duplicate IDs
    if (q && typeof q.id === 'number') {
      if (ids.has(q.id)) {
        errors.push(`Duplicate question id found: ${q.id}`);
      }
      ids.add(q.id);
    }

    // 3. Validate duplicate question text (case-insensitive)
    if (q && typeof q.question === 'string') {
      const norm = q.question.trim().toLowerCase();
      if (texts.has(norm)) {
        errors.push(`Duplicate question text found at id ${q.id}: "${q.question}"`);
      }
      texts.add(norm);
    }

    // 4. Validate exact 4 options
    if (!q || !Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`Question id ${q?.id} does not have exactly 4 options`);
    }

    // 5. Validate correctIndex range
    if (!q || typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
      errors.push(`Question id ${q?.id} has out-of-range correctIndex: ${q?.correctIndex}`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Question bank integrity failure:\n- ${errors.join('\n- ')}`);
  }

  return true;
}
