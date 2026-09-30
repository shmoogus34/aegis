// scripts/testCleanAiResponse.js
// Unit tests for cleanAiResponse to ensure all rules and edge cases pass.

const { cleanAiResponse } = require('../lib/cleanAiResponse');
const assert = require('assert');

function runTests() {
  console.log('Testing cleanAiResponse()...\n');

  // Test 1: Strip headers
  const headerInput = '### Overview of Deadweight Loss\nHere is what you need to know.';
  const headerExpected = 'Overview of Deadweight Loss\nHere is what you need to know.';
  assert.strictEqual(cleanAiResponse(headerInput), headerExpected, 'Failed to strip pound headers');
  console.log('✓ Test 1: Header stripping passed');

  // Test 2: Strip bold and italics without touching multiplication
  const boldInput = 'This is **very important** and *essential* to remember. Calculate 5 * 10 = 50.';
  const boldExpected = 'This is very important and essential to remember. Calculate 5 * 10 = 50.';
  assert.strictEqual(cleanAiResponse(boldInput), boldExpected, 'Failed bold/italics or altered math multiplication');
  console.log('✓ Test 2: Bold/italics stripped while math preserved');

  // Test 3: Bullet markers converted to hyphens
  const listInput = '* First point\n+ Second point\n• Third point\n- Already a hyphen\n1. Numbered item';
  const listExpected = '- First point\n- Second point\n- Third point\n- Already a hyphen\n1. Numbered item';
  assert.strictEqual(cleanAiResponse(listInput), listExpected, 'Failed to standardize list bullets');
  console.log('✓ Test 3: List standardization passed');

  // Test 4: Real code blocks preserved intact
  const codeInput = 'Here is a quick Python script:\n```python\n# This is a python comment, not a markdown header\ndef calculate_elasticity(p1, p2, q1, q2):\n    return (q2 - q1) / (p2 - p1) * (p1 / q1)\n```\nAnd back to regular text with **bold** words.';
  const codeExpected = 'Here is a quick Python script:\n```python\n# This is a python comment, not a markdown header\ndef calculate_elasticity(p1, p2, q1, q2):\n    return (q2 - q1) / (p2 - p1) * (p1 / q1)\n```\nAnd back to regular text with bold words.';
  assert.strictEqual(cleanAiResponse(codeInput), codeExpected, 'Failed to preserve code blocks');
  console.log('✓ Test 4: Code blocks preserved intact');

  // Test 5: Strip horizontal rules and format table rows
  const tableInput = 'Here is the summary:\n---\n| Course | Due Date |\n|---|---|\n| ECON-217 | Friday |\n| MATH-171 | Sunday |';
  const cleanedTable = cleanAiResponse(tableInput);
  assert(!cleanedTable.includes('---'), 'Failed to strip horizontal rule');
  assert(!cleanedTable.includes('|---|---|'), 'Failed to strip table separator');
  assert(cleanedTable.includes('ECON-217'), 'Table content was lost');
  console.log('✓ Test 5: Horizontal rules and tables cleaned');

  // Test 6: Underscores and quotes
  const underInput = 'Check the _Mamun syllabus_ for the __final project__ guidelines.';
  const underExpected = 'Check the Mamun syllabus for the final project guidelines.';
  assert.strictEqual(cleanAiResponse(underInput), underExpected, 'Failed to strip underscore markers');
  console.log('✓ Test 6: Underscore emphasis stripped');

  console.log('\nAll cleanAiResponse tests passed with 100% success!\n');
}

runTests();
