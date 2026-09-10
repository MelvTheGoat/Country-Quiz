import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRIES,
  CONTINENTS,
  DIRECTIONS,
  MIN_CUSTOM_COUNTRIES,
  buildQuiz,
  countriesIn,
  isValidRoomCode,
  generateRoomCode,
  normalizeRoomCode,
  publicQuestion,
  resolveRound,
  selectionError,
  summarizePlayer,
} from '../src/index.js';

test('dataset is well formed', () => {
  const codes = new Set();
  for (const country of COUNTRIES) {
    assert.match(country.code, /^[A-Z]{2}$/, `${country.name} has a bad ISO code`);
    assert.ok(!codes.has(country.code), `duplicate code ${country.code}`);
    codes.add(country.code);
    assert.ok(country.name.length > 0);
    assert.ok(country.capital.length > 0, `${country.name} is missing a capital`);
    assert.ok(CONTINENTS.includes(country.continent), `${country.name} has an odd continent`);
    assert.ok(country.flag.length > 0);
    assert.equal(country.flagUrl, `https://flagcdn.com/${country.code.toLowerCase()}.svg`);
  }
  assert.ok(COUNTRIES.length > 190);
  for (const continent of CONTINENTS) {
    assert.ok(countriesIn(continent).length >= MIN_CUSTOM_COUNTRIES, `${continent} is too small`);
  }
});

test('a quiz never repeats a country and always offers four options', () => {
  const quiz = buildQuiz({
    selection: { type: 'continent', continent: 'Africa' },
    count: 20,
    direction: DIRECTIONS.COUNTRY_TO_CAPITAL,
    seed: 7,
  });

  assert.equal(quiz.questions.length, 20);
  const asked = new Set();
  for (const question of quiz.questions) {
    assert.ok(!asked.has(question.answerCode), 'the same country was asked twice');
    asked.add(question.answerCode);

    assert.equal(question.options.length, 4);
    const texts = new Set(question.options.map((o) => o.text));
    assert.equal(texts.size, 4, 'two options showed the same text');
    assert.ok(question.options.some((o) => o.id === question.correctOptionId));
  }
});

test('distractors come from the quiz pool, not the whole world', () => {
  const codes = countriesIn('South America').map((c) => c.code);
  const quiz = buildQuiz({
    selection: { type: 'custom', codes },
    count: 8,
    direction: DIRECTIONS.CAPITAL_TO_COUNTRY,
    seed: 99,
  });

  for (const question of quiz.questions) {
    for (const option of question.options) {
      assert.ok(codes.includes(option.code), `${option.text} is not in the custom set`);
    }
  }
});

test('a pool smaller than the minimum is refused', () => {
  assert.throws(() => buildQuiz({ selection: { type: 'custom', codes: ['FR', 'DE'] } }));
  assert.ok(selectionError({ type: 'custom', codes: ['FR', 'DE'] }));
  assert.equal(selectionError({ type: 'continent', continent: 'Europe' }), null);
  assert.ok(selectionError({ type: 'continent', continent: 'Atlantis' }));
});

test('the quiz count is capped at the size of the pool', () => {
  const quiz = buildQuiz({
    selection: { type: 'custom', codes: ['FR', 'DE', 'IT', 'ES', 'PT'] },
    count: 20,
    seed: 3,
  });
  assert.equal(quiz.questions.length, 5);
});

test('mixed direction produces both kinds of question', () => {
  const quiz = buildQuiz({
    selection: { type: 'world' },
    count: 40,
    direction: DIRECTIONS.MIXED,
    seed: 12,
  });
  const kinds = new Set(quiz.questions.map((q) => q.direction));
  assert.equal(kinds.size, 2);
});

test('the public view of a question hides the answer', () => {
  const [question] = buildQuiz({
    selection: { type: 'continent', continent: 'Europe' },
    count: 1,
    seed: 5,
  }).questions;
  const sent = publicQuestion(question);
  assert.equal(sent.correctOptionId, undefined);
  assert.equal(sent.answerCode, undefined);
  assert.equal(sent.options.length, 4);
});

test('the faster of two correct answers takes the point', () => {
  const question = { correctOptionId: 'FR' };
  const outcome = resolveRound(
    question,
    { a: { optionId: 'FR', ms: 2400 }, b: { optionId: 'FR', ms: 1200 } },
    ['a', 'b'],
  );
  assert.equal(outcome.scorerId, 'b');
});

test('one correct answer wins the point, two wrong answers win nothing', () => {
  const question = { correctOptionId: 'FR' };
  assert.equal(
    resolveRound(question, { a: { optionId: 'FR', ms: 9000 }, b: { optionId: 'DE', ms: 100 } }, [
      'a',
      'b',
    ]).scorerId,
    'a',
  );
  assert.equal(
    resolveRound(question, { a: { optionId: 'IT', ms: 1 }, b: { optionId: 'DE', ms: 2 } }, [
      'a',
      'b',
    ]).scorerId,
    null,
  );
});

test('a missing answer counts as wrong, not as an error', () => {
  const outcome = resolveRound({ correctOptionId: 'FR' }, { a: { optionId: 'FR', ms: 500 } }, [
    'a',
    'b',
  ]);
  const b = outcome.results.find((r) => r.playerId === 'b');
  assert.equal(b.timedOut, true);
  assert.equal(b.correct, false);
  assert.equal(outcome.scorerId, 'a');
});

test('player summaries report accuracy, streaks and speed', () => {
  const stats = summarizePlayer({
    answers: [
      { correct: true, ms: 1000 },
      { correct: true, ms: 3000 },
      { correct: false, ms: 2000 },
      { correct: true, ms: 2000 },
    ],
  });
  assert.equal(stats.correct, 3);
  assert.equal(stats.accuracy, 75);
  assert.equal(stats.bestStreak, 2);
  assert.equal(stats.avgMs, 2000);
});

test('room codes avoid ambiguous characters', () => {
  for (let i = 0; i < 500; i += 1) {
    const code = generateRoomCode();
    assert.ok(isValidRoomCode(code), `${code} is not a valid room code`);
    assert.ok(!/[0O1IL5S2ZB8]/.test(code), `${code} contains an ambiguous character`);
  }
  assert.equal(normalizeRoomCode(' q4f 7h '), 'Q4F7H');
  assert.equal(isValidRoomCode('ABC'), false);
});
