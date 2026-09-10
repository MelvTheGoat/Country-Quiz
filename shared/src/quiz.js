/**
 * Pure quiz generation. No DOM, no sockets — the client uses it for solo mode
 * and the server uses it to drive a multiplayer match, so both modes ask
 * questions built by exactly the same rules.
 */
import { COUNTRIES, countriesIn, resolvePool } from './countries.js';
import { createRng, randomSeed, shuffle, sample } from './random.js';

export const DIRECTIONS = {
  COUNTRY_TO_CAPITAL: 'country-to-capital',
  CAPITAL_TO_COUNTRY: 'capital-to-country',
  MIXED: 'mixed',
};

export const DIRECTION_LABELS = {
  [DIRECTIONS.COUNTRY_TO_CAPITAL]: 'Country → Capital',
  [DIRECTIONS.CAPITAL_TO_COUNTRY]: 'Capital → Country',
  [DIRECTIONS.MIXED]: 'Mixed (both ways)',
};

export const OPTIONS_PER_QUESTION = 4;
export const MIN_CUSTOM_COUNTRIES = 5;

/** Text shown on an option button for a given direction. */
function optionText(country, direction) {
  return direction === DIRECTIONS.CAPITAL_TO_COUNTRY ? country.name : country.capital;
}

/**
 * Wrong answers are drawn from the quiz's own pool first (same continent, or the
 * player's custom set) so they are plausible. Only if that pool is too small do
 * we widen to the answer's continent and then to the whole world.
 */
export function pickDistractors(answer, pool, direction, rng, howMany = OPTIONS_PER_QUESTION - 1) {
  const answerText = optionText(answer, direction);
  const chosen = [];
  const usedCodes = new Set([answer.code]);
  const usedTexts = new Set([answerText]);

  const tiers = [pool, countriesIn(answer.continent), COUNTRIES];
  for (const tier of tiers) {
    if (chosen.length >= howMany) break;
    const candidates = tier.filter((c) => {
      const text = optionText(c, direction);
      return !usedCodes.has(c.code) && !usedTexts.has(text);
    });
    for (const candidate of sample(candidates, howMany - chosen.length, rng)) {
      chosen.push(candidate);
      usedCodes.add(candidate.code);
      usedTexts.add(optionText(candidate, direction));
    }
  }
  return chosen;
}

function buildQuestion(answer, index, pool, direction, rng) {
  const resolved =
    direction === DIRECTIONS.MIXED
      ? rng() < 0.5
        ? DIRECTIONS.COUNTRY_TO_CAPITAL
        : DIRECTIONS.CAPITAL_TO_COUNTRY
      : direction;

  const distractors = pickDistractors(answer, pool, resolved, rng);
  const options = shuffle([answer, ...distractors], rng).map((country) => ({
    id: country.code,
    code: country.code,
    text: optionText(country, resolved),
  }));

  const askingForCapital = resolved === DIRECTIONS.COUNTRY_TO_CAPITAL;

  return {
    index,
    direction: resolved,
    answerCode: answer.code,
    correctOptionId: answer.code,
    prompt: {
      // 'country' prompts get a flag; 'capital' prompts are text only.
      kind: askingForCapital ? 'country' : 'capital',
      text: askingForCapital ? answer.name : answer.capital,
      code: askingForCapital ? answer.code : null,
      label: askingForCapital ? 'What is the capital of' : 'Which country has the capital',
    },
    options,
  };
}

/**
 * Build a full quiz. Never repeats a country inside one quiz, so the question
 * count is capped at the size of the pool.
 */
export function buildQuiz({
  selection,
  count = 10,
  direction = DIRECTIONS.COUNTRY_TO_CAPITAL,
  seed = randomSeed(),
} = {}) {
  const pool = resolvePool(selection);
  if (pool.length < MIN_CUSTOM_COUNTRIES) {
    throw new Error(`A quiz needs at least ${MIN_CUSTOM_COUNTRIES} countries (got ${pool.length}).`);
  }

  const rng = createRng(seed);
  const total = Math.min(count, pool.length);
  const answers = sample(pool, total, rng);

  return {
    seed,
    selection,
    direction,
    questions: answers.map((answer, index) => buildQuestion(answer, index, pool, direction, rng)),
  };
}

/** The view of a question a player is allowed to see before the reveal. */
export function publicQuestion(question) {
  const { correctOptionId, answerCode, ...rest } = question;
  return rest;
}
