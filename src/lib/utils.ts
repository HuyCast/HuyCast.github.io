import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SM2Data } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// The SM-2 Algorithm
// https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm

export function calculateSM2(
  quality: number,
  previousData?: SM2Data
): SM2Data {
  let repetition = previousData?.repetition || 0;
  let interval = previousData?.interval || 1;
  let easeFactor = previousData?.easeFactor || 2.5;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    repetition,
    interval,
    easeFactor,
    nextReviewDate: nextReviewDate.toISOString(),
  };
}

// Helper to determine quality from user action
// 0 = Again (Blackout), 1 = Hard (Wrong), 3 = Hard (Correct), 4 = Good, 5 = Easy
export function getQualityFromAction(action: 'again' | 'hard' | 'good' | 'easy'): number {
  switch (action) {
    case 'again': return 0;
    case 'hard': return 3;
    case 'good': return 4;
    case 'easy': return 5;
    default: return 4;
  }
}
