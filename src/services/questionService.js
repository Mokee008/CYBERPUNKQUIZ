import { questionRepo } from '../repositories/questionRepo.js';
import { questionSchema, createQuestionSchema } from '../schemas/question.js';
import { config } from '../config.js';
import { shuffleArray } from '../utils/shuffle.js';
import { questionGenerator } from './questionGenerator.js';

export const questionService = {
  getAll(filters = {}) {
    let list = questionRepo.getAll();

    if (filters.category) {
      list = list.filter(q => q.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.difficulty) {
      list = list.filter(q => q.difficulty.toLowerCase() === filters.difficulty.toLowerCase());
    }
    if (filters.active !== undefined) {
      const isActive = String(filters.active) === 'true';
      list = list.filter(q => q.active === isActive);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(q =>
        q.question.toLowerCase().includes(s) ||
        q.explanation.toLowerCase().includes(s) ||
        q.options.some(opt => opt.toLowerCase().includes(s))
      );
    }

    const total = list.length;
    if (filters.page && filters.limit) {
      const page = parseInt(filters.page, 10) || 1;
      const limit = parseInt(filters.limit, 10) || 20;
      const start = (page - 1) * limit;
      list = list.slice(start, start + limit);
      return { total, page, limit, questions: list };
    }

    return { total, questions: list };
  },

  getById(id) {
    const list = questionRepo.getAll();
    const q = list.find(item => item.id === Number(id));
    return q || null;
  },

  getNextId(list) {
    if (list.length === 0) return 1;
    const maxId = Math.max(...list.map(q => q.id || 0));
    return maxId + 1;
  },

  async addQuestion(data, ip = 'system') {
    // Validate single question schema
    const parsed = createQuestionSchema.parse(data);
    const list = questionRepo.getAll();

    // Check duplicate question text
    const textNorm = parsed.question.trim().toLowerCase();
    const exists = list.some(q => q.question.trim().toLowerCase() === textNorm);
    if (exists) {
      const err = new Error(`Question with text "${parsed.question}" already exists`);
      err.statusCode = 409;
      err.code = 'DUPLICATE_QUESTION';
      throw err;
    }

    const newQuestion = {
      ...parsed,
      id: this.getNextId(list),
      active: parsed.active ?? true
    };

    list.push(newQuestion);
    await questionRepo.save(list, {
      action: 'ADD_QUESTION',
      id: newQuestion.id,
      ip,
      before: null,
      after: newQuestion
    });

    return newQuestion;
  },

  async updateQuestion(id, data, ip = 'system') {
    const numId = Number(id);
    const list = questionRepo.getAll();
    const index = list.findIndex(q => q.id === numId);
    if (index === -1) {
      const err = new Error(`Question id ${id} not found`);
      err.statusCode = 404;
      err.code = 'QUESTION_NOT_FOUND';
      throw err;
    }

    const parsed = createQuestionSchema.parse(data);

    // Check duplicate question text with other questions
    const textNorm = parsed.question.trim().toLowerCase();
    const duplicate = list.some(q => q.id !== numId && q.question.trim().toLowerCase() === textNorm);
    if (duplicate) {
      const err = new Error(`Another question already exists with text: "${parsed.question}"`);
      err.statusCode = 409;
      err.code = 'DUPLICATE_QUESTION';
      throw err;
    }

    const before = { ...list[index] };
    const updated = {
      ...parsed,
      id: numId,
      active: data.active !== undefined ? data.active : before.active
    };

    list[index] = updated;
    await questionRepo.save(list, {
      action: 'UPDATE_QUESTION',
      id: numId,
      ip,
      before,
      after: updated
    });

    return updated;
  },

  async patchQuestion(id, partialData, ip = 'system') {
    const numId = Number(id);
    const list = questionRepo.getAll();
    const index = list.findIndex(q => q.id === numId);
    if (index === -1) {
      const err = new Error(`Question id ${id} not found`);
      err.statusCode = 404;
      err.code = 'QUESTION_NOT_FOUND';
      throw err;
    }

    const before = { ...list[index] };
    const merged = { ...before, ...partialData, id: numId };

    // Full validation on merged object
    const validated = questionSchema.parse(merged);

    // Check duplicate question text with others
    const textNorm = validated.question.trim().toLowerCase();
    const duplicate = list.some(q => q.id !== numId && q.question.trim().toLowerCase() === textNorm);
    if (duplicate) {
      const err = new Error(`Another question already exists with text: "${validated.question}"`);
      err.statusCode = 409;
      err.code = 'DUPLICATE_QUESTION';
      throw err;
    }

    // Safety check if deactivating
    if (before.active && validated.active === false && !partialData.force) {
      const activeCount = list.filter(q => q.active).length;
      if (activeCount - 1 < config.questionsPerGame) {
        const err = new Error(`Cannot go below ${config.questionsPerGame} active questions`);
        err.statusCode = 409;
        err.code = 'MINIMUM_ACTIVE_QUESTIONS_REQUIRED';
        throw err;
      }
    }

    list[index] = validated;
    await questionRepo.save(list, {
      action: 'PATCH_QUESTION',
      id: numId,
      ip,
      before,
      after: validated
    });

    return validated;
  },

  async deleteQuestion(id, { hard = false, force = false } = {}, ip = 'system') {
    const numId = Number(id);
    const list = questionRepo.getAll();
    const index = list.findIndex(q => q.id === numId);
    if (index === -1) {
      const err = new Error(`Question id ${id} not found`);
      err.statusCode = 404;
      err.code = 'QUESTION_NOT_FOUND';
      throw err;
    }

    const before = { ...list[index] };

    // Minimum active questions safety check
    if (before.active && !force) {
      const activeCount = list.filter(q => q.active).length;
      if (activeCount - 1 < config.questionsPerGame) {
        const err = new Error(`Cannot go below ${config.questionsPerGame} active questions`);
        err.statusCode = 409;
        err.code = 'MINIMUM_ACTIVE_QUESTIONS_REQUIRED';
        throw err;
      }
    }

    let after = null;
    if (hard) {
      list.splice(index, 1);
    } else {
      list[index].active = false;
      after = { ...list[index] };
    }

    await questionRepo.save(list, {
      action: hard ? 'HARD_DELETE_QUESTION' : 'SOFT_DELETE_QUESTION',
      id: numId,
      ip,
      before,
      after
    });

    return { deleted: true, hard, question: hard ? before : after };
  },

  async restoreQuestion(id, ip = 'system') {
    const numId = Number(id);
    const list = questionRepo.getAll();
    const q = list.find(item => item.id === numId);
    if (!q) {
      const err = new Error(`Question id ${id} not found`);
      err.statusCode = 404;
      err.code = 'QUESTION_NOT_FOUND';
      throw err;
    }

    const before = { ...q };
    q.active = true;

    await questionRepo.save(list, {
      action: 'RESTORE_QUESTION',
      id: numId,
      ip,
      before,
      after: q
    });

    return q;
  },

  async bulkAdd(items, ip = 'system') {
    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('Bulk payload must be a non-empty array');
      err.statusCode = 400;
      err.code = 'INVALID_BULK_PAYLOAD';
      throw err;
    }

    const list = questionRepo.getAll();
    const currentTexts = new Set(list.map(q => q.question.trim().toLowerCase()));
    let nextId = this.getNextId(list);

    const validatedItems = [];
    const errors = [];

    items.forEach((item, idx) => {
      const parseRes = createQuestionSchema.safeParse(item);
      if (!parseRes.success) {
        errors.push({
          index: idx,
          errors: parseRes.error.errors.map(e => e.message)
        });
        return;
      }

      const qTextNorm = parseRes.data.question.trim().toLowerCase();
      if (currentTexts.has(qTextNorm)) {
        errors.push({
          index: idx,
          errors: [`Duplicate question text: "${parseRes.data.question}"`]
        });
        return;
      }

      currentTexts.add(qTextNorm);
      validatedItems.push({
        ...parseRes.data,
        id: nextId++,
        active: parseRes.data.active ?? true
      });
    });

    // All-or-nothing check
    if (errors.length > 0) {
      const err = new Error('Bulk validation failed for one or more questions');
      err.statusCode = 422;
      err.code = 'BULK_VALIDATION_ERROR';
      err.details = errors;
      throw err;
    }

    const updatedList = [...list, ...validatedItems];
    await questionRepo.save(updatedList, {
      action: 'BULK_ADD_QUESTIONS',
      count: validatedItems.length,
      ip,
      before: null,
      after: { addedCount: validatedItems.length }
    });

    return validatedItems;
  },

  async importBank({ mode = 'append', questions: incoming = [], confirm = false }, ip = 'system') {
    if (mode === 'replace' && !confirm) {
      const err = new Error('Replacing question bank requires ?confirm=true');
      err.statusCode = 400;
      err.code = 'CONFIRMATION_REQUIRED';
      throw err;
    }

    if (!Array.isArray(incoming)) {
      const err = new Error('Import questions must be an array');
      err.statusCode = 400;
      err.code = 'INVALID_IMPORT_PAYLOAD';
      throw err;
    }

    // Validate every item
    const errors = [];
    const texts = new Set();
    const validated = [];

    incoming.forEach((item, idx) => {
      const res = questionSchema.safeParse(item);
      if (!res.success) {
        errors.push({ index: idx, errors: res.error.errors.map(e => e.message) });
      } else {
        const norm = res.data.question.trim().toLowerCase();
        if (texts.has(norm)) {
          errors.push({ index: idx, errors: [`Duplicate text within import: "${res.data.question}"`] });
        }
        texts.add(norm);
        validated.push(res.data);
      }
    });

    if (errors.length > 0) {
      const err = new Error('Import validation failed');
      err.statusCode = 422;
      err.code = 'IMPORT_VALIDATION_ERROR';
      err.details = errors;
      throw err;
    }

    const currentList = questionRepo.getAll();
    let finalList = [];

    if (mode === 'replace') {
      const activeCount = validated.filter(q => q.active).length;
      if (activeCount < config.questionsPerGame) {
        const err = new Error(`Replaced bank must have at least ${config.questionsPerGame} active questions`);
        err.statusCode = 400;
        err.code = 'INSUFFICIENT_QUESTIONS';
        throw err;
      }
      finalList = validated;
    } else {
      // Append mode: deduplicate against existing
      const existingTexts = new Set(currentList.map(q => q.question.trim().toLowerCase()));
      let nextId = this.getNextId(currentList);

      const appendItems = [];
      validated.forEach((item) => {
        const norm = item.question.trim().toLowerCase();
        if (!existingTexts.has(norm)) {
          appendItems.push({
            ...item,
            id: nextId++
          });
          existingTexts.add(norm);
        }
      });
      finalList = [...currentList, ...appendItems];
    }

    await questionRepo.save(finalList, {
      action: `IMPORT_${mode.toUpperCase()}`,
      count: finalList.length,
      ip
    });

    return { total: finalList.length, mode };
  },

  getStats() {
    const list = questionRepo.getAll();
    const total = list.length;
    const active = list.filter(q => q.active).length;
    const inactive = total - active;

    const byCategory = {};
    config.categories.forEach(c => { byCategory[c] = 0; });
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    const correctDist = { A: 0, B: 0, C: 0, D: 0 };
    const optionLetters = ['A', 'B', 'C', 'D'];

    list.forEach(q => {
      if (byCategory[q.category] !== undefined) byCategory[q.category]++;
      if (byDifficulty[q.difficulty] !== undefined) byDifficulty[q.difficulty]++;
      const letter = optionLetters[q.correctIndex] || 'A';
      correctDist[letter]++;
    });

    // Detect warnings
    const warnings = [];
    if (total > 0) {
      // 1. Category imbalance (below 60% of equal share across categories)
      const minCategoryRatio = Math.min(0.15, 0.6 / config.categories.length);
      config.categories.forEach(c => {
        const ratio = byCategory[c] / total;
        if (ratio < minCategoryRatio) {
          warnings.push(`Category '${c}' represents only ${(ratio * 100).toFixed(1)}% of bank (below ${(minCategoryRatio * 100).toFixed(1)}% minimum threshold)`);
        }
      });

      // 2. CorrectIndex skew (> 40% for any letter)
      ['A', 'B', 'C', 'D'].forEach(letter => {
        const ratio = correctDist[letter] / total;
        if (ratio > 0.40) {
          warnings.push(`Option ${letter} accounts for ${(ratio * 100).toFixed(1)}% of correct answers (above 40% maximum threshold)`);
        }
      });
    }

    if (active < config.questionsPerGame) {
      warnings.push(`Active questions count (${active}) is below QUESTIONS_PER_GAME requirement (${config.questionsPerGame})`);
    }

    return {
      total,
      active,
      inactive,
      byCategory,
      byDifficulty,
      correctDist,
      warnings
    };
  },

  getSectorsSummary() {
    const list = questionRepo.getAll().filter(q => q.active);
    const descriptions = {
      CA: 'Chartered Accountancy: Auditing standards, financial accounting (IFRS/Ind AS), corporate taxation, and cost management.',
      Healthcare: 'Clinical patient care, human anatomy, pharmacology mechanisms, diagnostics, and pathology.',
      Programming: 'Data structures, algorithm complexity, software architecture, asynchronous runtimes, and security.',
      Agriculture: 'Soil science (NPK, pH), agronomy, crop rotation, precision irrigation, and pest management.',
      Biology: 'Cellular biology, molecular genetics, human physiology, evolutionary ecology, and plant systems.'
    };

    return config.categories.map(cat => {
      const catQuestions = list.filter(q => q.category === cat);
      const diffBreakdown = { easy: 0, medium: 0, hard: 0 };
      catQuestions.forEach(q => {
        if (diffBreakdown[q.difficulty] !== undefined) diffBreakdown[q.difficulty]++;
      });

      return {
        id: cat,
        name: cat,
        description: descriptions[cat] || `${cat} professional knowledge questions`,
        questionCount: catQuestions.length,
        difficulties: diffBreakdown,
        apiGenerateUrl: `/api/v1/sectors/${encodeURIComponent(cat)}/generate`
      };
    });
  },

  async generateQuestionsForSector({ sector = 'Programming', count = 5, difficulty, persist = true, ip = 'system' }) {
    const list = questionRepo.getAll();
    const isAll = (sector || '').toLowerCase() === 'all';
    const matchedCategory = isAll
      ? undefined
      : config.categories.find(c => c.toLowerCase() === sector.toLowerCase());

    if (!isAll && !matchedCategory) {
      const err = new Error(`Invalid sector: "${sector}". Available sectors: ${config.categories.join(', ')}, all`);
      err.statusCode = 400;
      err.code = 'INVALID_SECTOR';
      throw err;
    }

    const targetCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 50);
    const existingTexts = new Set(list.map(q => q.question.trim().toLowerCase()));

    const generated = questionGenerator.generateBatch({
      category: matchedCategory,
      count: targetCount,
      difficulty,
      excludeExistingTexts: existingTexts
    });

    if (persist) {
      let nextId = this.getNextId(list);
      generated.forEach(q => {
        q.id = nextId++;
        list.push(q);
      });

      await questionRepo.save(list, {
        action: 'API_GENERATE_QUESTIONS',
        sector: matchedCategory || 'all',
        count: generated.length,
        ip
      });
    }

    return {
      sector: matchedCategory || 'all',
      count: generated.length,
      persisted: persist,
      questions: generated
    };
  },

  getPracticeQuestion({ category, difficulty, fresh = false } = {}) {
    let pool = questionRepo.getAll().filter(q => q.active);
    if (category) {
      pool = pool.filter(q => q.category.toLowerCase() === category.toLowerCase());
    }
    if (difficulty) {
      pool = pool.filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    // If pool is empty or fresh=true requested, generate a brand new question on the fly!
    if (pool.length === 0 || fresh) {
      const matchedCat = config.categories.find(c => category && c.toLowerCase() === category.toLowerCase()) || 'Programming';
      const newQ = questionGenerator.generateQuestion({ category: matchedCat, difficulty });
      const list = questionRepo.getAll();
      newQ.id = this.getNextId(list);
      list.push(newQ);
      questionRepo.save(list).catch(() => {});
      return {
        id: newQ.id,
        category: newQ.category,
        difficulty: newQ.difficulty,
        question: newQ.question,
        options: newQ.options
      };
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    // Mask answer fields
    return {
      id: chosen.id,
      category: chosen.category,
      difficulty: chosen.difficulty,
      question: chosen.question,
      options: chosen.options
    };
  },

  /**
   * Randomly selects questions from the bank with fresh un-seen question priority.
   * Auto-refills by generating new questions when player has exhausted available pool!
   */
  selectGameDeck(options = {}) {
    const all = questionRepo.getAll();
    let pool = all.filter(q => q.active);

    if (options.category) {
      pool = pool.filter(q => q.category.toLowerCase() === options.category.toLowerCase());
    }
    if (options.difficulty) {
      pool = pool.filter(q => q.difficulty.toLowerCase() === options.difficulty.toLowerCase());
    }

    const defaultCount = (options.category || options.difficulty)
      ? Math.min(config.questionsPerGame, pool.length > 0 ? pool.length : 10)
      : config.questionsPerGame;
    const targetCount = options.count !== undefined ? options.count : defaultCount;

    // Refresh priority: prioritize questions not in excludeIds (seen by player)
    const excludeSet = new Set(options.excludeIds || []);
    let freshQuestions = pool.filter(q => !excludeSet.has(q.id));

    // If not enough un-seen questions exist, auto-generate fresh questions on the fly!
    if (freshQuestions.length < targetCount) {
      const deficit = targetCount - freshQuestions.length;
      const existingTexts = new Set(all.map(q => q.question.trim().toLowerCase()));
      const newlyGenerated = questionGenerator.generateBatch({
        category: options.category,
        difficulty: options.difficulty,
        count: Math.max(deficit, 10),
        excludeExistingTexts: existingTexts
      });

      let nextId = this.getNextId(all);
      newlyGenerated.forEach(q => {
        q.id = nextId++;
        all.push(q);
        freshQuestions.push(q);
        pool.push(q);
      });

      questionRepo.save(all, { action: 'AUTO_REFILL_QUESTIONS', count: newlyGenerated.length }).catch(() => {});
    }

    // Group available fresh questions by category
    const byCategory = {};
    config.categories.forEach(c => { byCategory[c] = []; });
    freshQuestions.forEach(q => {
      if (byCategory[q.category]) byCategory[q.category].push(q);
    });
    config.categories.forEach(c => {
      byCategory[c] = shuffleArray(byCategory[c]);
    });

    const deck = [];
    let catIndex = 0;
    const catsToUse = options.category
      ? [config.categories.find(c => c.toLowerCase() === options.category.toLowerCase()) || options.category]
      : config.categories;

    while (deck.length < targetCount) {
      const cat = catsToUse[catIndex % catsToUse.length];
      const available = byCategory[cat];
      if (available && available.length > 0) {
        deck.push(available.pop());
      } else {
        const remainingFresh = freshQuestions.find(q => !deck.some(d => d.id === q.id));
        if (remainingFresh) {
          deck.push(remainingFresh);
        } else {
          break;
        }
      }
      catIndex++;
    }

    return shuffleArray(deck);
  }
};
