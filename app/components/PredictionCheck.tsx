"use client";

import { useId, useRef, useState } from "react";

import styles from "./PredictionCheck.module.css";

export type PredictionChoice = {
  id: string;
  label: string;
};

export type PredictionChoices =
  | readonly [PredictionChoice, PredictionChoice]
  | readonly [PredictionChoice, PredictionChoice, PredictionChoice];

export type PredictionCheckProps = {
  question: string;
  choices: PredictionChoices;
  correctChoiceId: string;
  explanation: string;
  eyebrow?: string;
  correctFeedback?: string;
  incorrectFeedback?: string;
  resetLabel?: string;
  className?: string;
};

export default function PredictionCheck({
  question,
  choices,
  correctChoiceId,
  explanation,
  eyebrow = "Quick prediction",
  correctFeedback = "Exactly right.",
  incorrectFeedback = "Good prediction. Let’s trace what actually happens.",
  resetLabel = "Try again",
  className,
}: PredictionCheckProps) {
  const titleId = useId();
  const feedbackId = useId();
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

  const answered = selectedChoiceId !== null;
  const isCorrect = selectedChoiceId === correctChoiceId;

  function resetPrediction() {
    setSelectedChoiceId(null);
    window.requestAnimationFrame(() => firstChoiceRef.current?.focus());
  }

  return (
    <section
      className={[styles.check, className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
    >
      <div className={styles.heading}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h3 id={titleId}>{question}</h3>
      </div>

      <div className={styles.choices} role="group" aria-labelledby={titleId}>
        {choices.map((choice, index) => {
          const selected = selectedChoiceId === choice.id;
          const correctChoice = answered && choice.id === correctChoiceId;
          const incorrectChoice = selected && !isCorrect;

          return (
            <button
              ref={index === 0 ? firstChoiceRef : undefined}
              className={styles.choice}
              data-correct={correctChoice || undefined}
              data-incorrect={incorrectChoice || undefined}
              key={choice.id}
              type="button"
              aria-pressed={selected}
              aria-describedby={answered ? feedbackId : undefined}
              disabled={answered}
              onClick={() => setSelectedChoiceId(choice.id)}
            >
              <span className={styles.choiceMarker} aria-hidden="true">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{choice.label}</span>
              {correctChoice ? (
                <span className={styles.answerMark} aria-hidden="true">✓</span>
              ) : null}
              {incorrectChoice ? (
                <span className={styles.answerMark} aria-hidden="true">×</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div
          className={styles.feedback}
          data-correct={isCorrect || undefined}
          id={feedbackId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div>
            <strong>{isCorrect ? correctFeedback : incorrectFeedback}</strong>
            <p>{explanation}</p>
          </div>
          <button className={styles.reset} type="button" onClick={resetPrediction}>
            {resetLabel} ↻
          </button>
        </div>
      ) : (
        <p className={styles.hint}>Choose one answer before running the visual.</p>
      )}
    </section>
  );
}
