import { Flag } from './Flag.jsx';

/** The prompt half of a question: flag + "What is the capital of France?" */
export function QuestionCard({ question, index, total, children }) {
  return (
    <section className="question" aria-labelledby="question-text">
      <p className="question__counter">
        Question {index + 1} <span aria-hidden="true">/</span>
        <span className="visually-hidden">of</span> {total}
      </p>

      {question.prompt.kind === 'country' && (
        <Flag code={question.prompt.code} size="lg" className="question__flag" />
      )}

      <h2 id="question-text" className="question__text">
        <span className="question__label">{question.prompt.label}</span>
        <strong>{question.prompt.text}</strong>
        <span aria-hidden="true">?</span>
      </h2>

      {children}
    </section>
  );
}
