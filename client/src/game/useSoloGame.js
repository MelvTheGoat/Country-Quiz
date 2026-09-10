import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildQuiz, summarizePlayer } from '@capitals-quiz/shared';
import { playCorrect, playWrong } from '../lib/sound.js';

const ADVANCE_DELAY_MS = 1100;

/**
 * Solo mode runs entirely in the browser using the same quiz builder the server
 * uses for multiplayer, so both modes ask questions of the same shape and
 * difficulty.
 */
export function useSoloGame({ settings, soundOn }) {
  const quiz = useMemo(
    () =>
      buildQuiz({
        selection: settings.selection,
        count: settings.questionCount,
        direction: settings.direction,
      }),
    [settings],
  );

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [picked, setPicked] = useState(null); // { optionId, correct } for the current question
  const [finished, setFinished] = useState(false);

  const quizStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const advanceTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(advanceTimerRef.current), []);

  const question = quiz.questions[index];
  const isLast = index === quiz.questions.length - 1;

  const streak = useMemo(() => {
    let run = 0;
    for (let i = answers.length - 1; i >= 0; i -= 1) {
      if (!answers[i].correct) break;
      run += 1;
    }
    return run;
  }, [answers]);

  const advance = useCallback(() => {
    clearTimeout(advanceTimerRef.current);
    setPicked(null);
    if (isLast) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      questionStartRef.current = Date.now();
    }
  }, [isLast]);

  const answer = useCallback(
    (optionId) => {
      if (picked) return;
      const correct = optionId === question.correctOptionId;
      const ms = Date.now() - questionStartRef.current;

      setPicked({ optionId, correct });
      setAnswers((prev) => [...prev, { questionIndex: index, optionId, correct, ms }]);
      if (correct) playCorrect(soundOn);
      else playWrong(soundOn);

      advanceTimerRef.current = setTimeout(advance, ADVANCE_DELAY_MS);
    },
    [advance, index, picked, question, soundOn],
  );

  const results = useMemo(() => {
    if (!finished) return null;
    const totalMs = Date.now() - quizStartRef.current;
    return {
      settings,
      stats: { ...summarizePlayer({ answers }), totalMs },
      review: quiz.questions.map((q) => {
        const given = answers.find((a) => a.questionIndex === q.index) || null;
        return {
          question: q,
          chosenOptionId: given?.optionId ?? null,
          correct: Boolean(given?.correct),
          ms: given?.ms ?? null,
        };
      }),
    };
  }, [answers, finished, quiz.questions, settings]);

  return {
    question,
    index,
    total: quiz.questions.length,
    picked,
    answers,
    streak,
    finished,
    results,
    answer,
    skipAhead: advance,
  };
}
