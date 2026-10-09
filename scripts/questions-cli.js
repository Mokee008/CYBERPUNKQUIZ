import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { questionService } from '../src/services/questionService.js';
import { questionRepo } from '../src/repositories/questionRepo.js';
import { validateQuestionBank } from '../src/utils/validateQuestions.js';
import { config } from '../src/config.js';

const args = process.argv.slice(2);
const command = args[0] || 'list';

async function main() {
  try {
    switch (command) {
      case 'list': {
        const { questions } = questionService.getAll();
        console.log(`\n================ QUESTION BANK (${questions.length} total, ${questions.filter(q => q.active).length} active) ================`);
        console.table(
          questions.map(q => ({
            ID: q.id,
            Category: q.category,
            Diff: q.difficulty,
            Active: q.active ? 'YES' : 'NO',
            Question: q.question.length > 55 ? q.question.substring(0, 52) + '...' : q.question
          }))
        );
        break;
      }

      case 'validate': {
        console.log('\n[Validating] Inspecting data/questions.json...');
        const all = questionRepo.getAll();
        validateQuestionBank(all);
        const stats = questionService.getStats();
        console.log('✓ Question bank integrity verified successfully!');
        console.log(`- Total Questions: ${stats.total} (${stats.active} active, ${stats.inactive} inactive)`);
        console.log('- By Category:', stats.byCategory);
        console.log('- By Difficulty:', stats.byDifficulty);
        console.log('- Correct Index Distribution (A/B/C/D):', stats.correctDist);
        if (stats.warnings.length > 0) {
          console.log('\n⚠️ Warnings detected:');
          stats.warnings.forEach(w => console.log('  -', w));
        } else {
          console.log('\n✓ No distribution or balance warnings detected.');
        }
        break;
      }

      case 'add': {
        const rl = readline.createInterface({ input, output });
        console.log('\n--- ADD NEW QUESTION ---');

        const category = await rl.question(`Category (${config.categories.join('/')}): `);
        const difficulty = await rl.question(`Difficulty (${config.difficulties.join('/')}): `);
        const questionText = await rl.question('Question text: ');

        console.log('Enter 4 options:');
        const opt0 = await rl.question('  Option A (Index 0): ');
        const opt1 = await rl.question('  Option B (Index 1): ');
        const opt2 = await rl.question('  Option C (Index 2): ');
        const opt3 = await rl.question('  Option D (Index 3): ');

        const correctStr = await rl.question('Correct Index (0, 1, 2, or 3): ');
        const explanation = await rl.question('Explanation: ');

        const confirm = await rl.question('\nConfirm save? (y/N): ');
        rl.close();

        if (confirm.trim().toLowerCase() === 'y') {
          const payload = {
            category: category.trim(),
            difficulty: difficulty.trim(),
            question: questionText.trim(),
            options: [opt0.trim(), opt1.trim(), opt2.trim(), opt3.trim()],
            correctIndex: parseInt(correctStr, 10),
            explanation: explanation.trim(),
            active: true
          };
          const created = await questionService.addQuestion(payload, 'cli-user');
          console.log(`\n✓ Question created with ID ${created.id}`);
        } else {
          console.log('\nAborted. No question added.');
        }
        break;
      }

      case 'edit': {
        const id = args[1];
        if (!id) {
          console.error('Error: Please specify question ID to edit (e.g. npm run q:edit -- 12)');
          process.exit(1);
        }
        const existing = questionService.getById(id);
        if (!existing) {
          console.error(`Error: Question ${id} not found.`);
          process.exit(1);
        }

        const rl = readline.createInterface({ input, output });
        console.log(`\n--- EDIT QUESTION ${id} ---`);

        const category = (await rl.question(`Category [${existing.category}]: `)) || existing.category;
        const difficulty = (await rl.question(`Difficulty [${existing.difficulty}]: `)) || existing.difficulty;
        const questionText = (await rl.question(`Question text [${existing.question}]: `)) || existing.question;

        const opt0 = (await rl.question(`  Option A [${existing.options[0]}]: `)) || existing.options[0];
        const opt1 = (await rl.question(`  Option B [${existing.options[1]}]: `)) || existing.options[1];
        const opt2 = (await rl.question(`  Option C [${existing.options[2]}]: `)) || existing.options[2];
        const opt3 = (await rl.question(`  Option D [${existing.options[3]}]: `)) || existing.options[3];

        const correctStr = (await rl.question(`Correct Index [${existing.correctIndex}]: `)) || String(existing.correctIndex);
        const explanation = (await rl.question(`Explanation [${existing.explanation}]: `)) || existing.explanation;

        const confirm = await rl.question('\nConfirm changes? (y/N): ');
        rl.close();

        if (confirm.trim().toLowerCase() === 'y') {
          const payload = {
            category: category.trim(),
            difficulty: difficulty.trim(),
            question: questionText.trim(),
            options: [opt0.trim(), opt1.trim(), opt2.trim(), opt3.trim()],
            correctIndex: parseInt(correctStr, 10),
            explanation: explanation.trim()
          };
          const updated = await questionService.updateQuestion(id, payload, 'cli-user');
          console.log(`\n✓ Question ${updated.id} successfully updated.`);
        } else {
          console.log('\nAborted. No changes made.');
        }
        break;
      }

      case 'delete': {
        const id = args[1];
        const isHard = args.includes('--hard');
        const isForce = args.includes('--force');

        if (!id) {
          console.error('Error: Please specify question ID (e.g. npm run q:delete -- 12)');
          process.exit(1);
        }

        const res = await questionService.deleteQuestion(id, { hard: isHard, force: isForce }, 'cli-user');
        console.log(`\n✓ Question ${id} ${res.hard ? 'permanently removed (hard delete)' : 'deactivated (soft delete)'}.`);
        break;
      }

      case 'restore': {
        const id = args[1];
        if (!id) {
          console.error('Error: Please specify question ID (e.g. npm run q:restore -- 12)');
          process.exit(1);
        }
        const restored = await questionService.restoreQuestion(id, 'cli-user');
        console.log(`\n✓ Question ${restored.id} successfully restored and active.`);
        break;
      }

      case 'export': {
        const outFile = args[1] || 'questions-export.json';
        const { questions } = questionService.getAll();
        fs.writeFileSync(path.resolve(process.cwd(), outFile), JSON.stringify(questions, null, 2), 'utf-8');
        console.log(`\n✓ Exported ${questions.length} questions to ${outFile}`);
        break;
      }

      case 'import': {
        const inFile = args[1];
        const isReplace = args.includes('--replace');
        if (!inFile) {
          console.error('Error: Please specify import file (e.g. npm run q:import -- file.json --append)');
          process.exit(1);
        }
        const raw = fs.readFileSync(path.resolve(process.cwd(), inFile), 'utf-8');
        const parsed = JSON.parse(raw);
        const res = await questionService.importBank(
          { mode: isReplace ? 'replace' : 'append', questions: parsed, confirm: true },
          'cli-user'
        );
        console.log(`\n✓ Successfully imported questions. Total bank now: ${res.total}`);
        break;
      }

      default:
        console.log(`Unknown command: ${command}`);
        console.log('Available commands: list, add, edit, delete, restore, validate, export, import');
        break;
    }
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
