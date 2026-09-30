// scripts/testStudySuite.mjs — Comprehensive Verification Suite for Study Tools & Gemini 3.8 Flash
import assert from 'assert';

const BASE_URL = 'http://localhost:3001';

console.log('🧪 Starting A.E.G.I.S. Study Tools & Gemini 3.8 Verification Suite...\n');

async function runTests() {
  let passedCount = 0;
  let totalCount = 0;

  async function test(name, fn) {
    totalCount++;
    process.stdout.write(`• Testing: ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passedCount++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error('  Error:', err.message || err);
    }
  }

  // TEST 1: GET /api/study-tools
  await test('GET /api/study-tools returns tools array', async () => {
    const res = await fetch(`${BASE_URL}/api/study-tools`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(Array.isArray(data.tools), 'Expected tools array');
  });

  // TEST 2: POST /api/study-tools/generate (Flashcards for ECON-217)
  let createdFlashcardTool = null;
  await test('POST /api/study-tools/generate creates valid Flashcards via Gemini 3.8 Flash', async () => {
    const res = await fetch(`${BASE_URL}/api/study-tools/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'flashcards',
        courseCode: 'ECON-217',
        topic: 'Quiz 5: Monopoly Pricing & Deadweight Loss',
        difficulty: 'medium',
        count: 5,
      }),
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true, `API returned error: ${data.error}`);
    assert(data.tool, 'Missing tool in response');
    assert.strictEqual(data.tool.type, 'flashcards');
    assert.strictEqual(data.tool.courseCode, 'ECON-217');
    assert(data.tool.data.cards.length >= 4, `Expected at least 4 cards, got ${data.tool.data.cards.length}`);

    // Verify cards schema
    const firstCard = data.tool.data.cards[0];
    assert(firstCard.front, 'Card missing front');
    assert(firstCard.back, 'Card missing back');
    assert.strictEqual(firstCard.box, 1, 'Card should start in Leitner Box 1');

    // Verify plain natural text (no bold asterisks or markdown headers in cards)
    assert(!firstCard.front.includes('**'), 'Front contains markdown bold');
    assert(!firstCard.back.includes('**'), 'Back contains markdown bold');

    createdFlashcardTool = data.tool;
    console.log(`[Created tool ID: ${data.tool.id}, Model: ${data.tool.modelUsed}]`);
  });

  // TEST 3: Update Study Tool Progress & Leitner State
  await test('POST /api/study-tools progress update & Leitner state persistence', async () => {
    assert(createdFlashcardTool, 'Need createdFlashcardTool');

    // Simulate student getting 2 cards right
    const updatedCards = createdFlashcardTool.data.cards.map((c, i) =>
      i < 2 ? { ...c, box: 2, lastReviewed: new Date().toISOString() } : c
    );

    const res = await fetch(`${BASE_URL}/api/study-tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'progress',
        id: createdFlashcardTool.id,
        progress: 40,
        data: {
          ...createdFlashcardTool.data,
          cards: updatedCards,
        },
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.tool.progress, 40);

    // Fetch by ID to confirm persistent server file storage
    const fetchRes = await fetch(`${BASE_URL}/api/study-tools?id=${createdFlashcardTool.id}`);
    const fetchData = await fetchRes.json();
    assert.strictEqual(fetchData.tool.progress, 40);
    assert.strictEqual(fetchData.tool.data.cards[0].box, 2);
  });

  // TEST 4: Tool Duplicate & Rename
  await test('POST /api/study-tools rename & duplicate', async () => {
    assert(createdFlashcardTool, 'Need createdFlashcardTool');

    // Rename
    const renameRes = await fetch(`${BASE_URL}/api/study-tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'rename',
        id: createdFlashcardTool.id,
        newTitle: 'Mastered Econ Quiz 5 Deck',
      }),
    });
    const renameData = await renameRes.json();
    assert.strictEqual(renameData.tool.title, 'Mastered Econ Quiz 5 Deck');

    // Duplicate
    const dupRes = await fetch(`${BASE_URL}/api/study-tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'duplicate',
        id: createdFlashcardTool.id,
      }),
    });
    const dupData = await dupRes.json();
    assert.strictEqual(dupData.success, true);
    assert(dupData.tool.title.includes('(Copy)'));
  });

  // TEST 5: Short Answer AI Evaluator / Grader
  await test('POST /api/study-tools/grade-answer accurately grades student answer', async () => {
    const res = await fetch(`${BASE_URL}/api/study-tools/grade-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Under what condition does a profit-maximizing monopolist produce?',
        canonicalAnswer: 'Where marginal revenue equals marginal cost, MR = MC.',
        studentAnswer: 'The firm produces at the output level where MR equals MC.',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.correct, true, `Expected correct: true, got ${data.correct} (${data.reason})`);
    assert(data.reason && data.reason.length > 5, 'Expected 1-line reason');
    console.log(`[AI Evaluator reason: "${data.reason}"]`);
  });

  // TEST 6: Natural Trigger via Chat / Voice Intent
  await test('POST /api/voice natural trigger creates tool and returns 1-line response', async () => {
    const res = await fetch(`${BASE_URL}/api/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Make me flashcards for Econ Quiz 5',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.text, 'Expected response text');
    assert(data.generatedTool, 'Expected generatedTool in response');
    assert.strictEqual(data.generatedTool.type, 'flashcards');
    assert.strictEqual(data.generatedTool.courseCode, 'ECON-217');

    // Confirm natural human tone: no markdown asterisks or bullet signs
    assert(!data.text.includes('**'), 'Response text should not contain bold asterisks');
    assert(!data.text.includes('##'), 'Response text should not contain markdown headers');

    console.log(`[Jarvis Response: "${data.text}"]`);
    console.log(`[Audio Base64 Generated: ${Boolean(data.audioBase64)}]`);
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passedCount}/${totalCount} tests passed.`);
  console.log(`========================================\n`);

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
