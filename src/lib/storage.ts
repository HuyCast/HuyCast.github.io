import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ReviewItem, TestHistory, VocabularyWord } from '@/types';

interface AppState {
  learnedWords: string[];
  favorites: string[];
  reviewSchedule: Record<string, ReviewItem>;
  dailyGoal: number;
  streak: number;
  lastStudyDate: string | null;
  testHistory: TestHistory[];
  
  // Actions
  markLearned: (wordId: string) => void;
  toggleFavorite: (wordId: string) => void;
  updateReview: (item: ReviewItem) => void;
  updateStreak: () => void;
  addTestResult: (result: TestHistory) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      learnedWords: [],
      favorites: [],
      reviewSchedule: {},
      dailyGoal: 20,
      streak: 0,
      lastStudyDate: null,
      testHistory: [],

      markLearned: (wordId) => set((state) => ({
        learnedWords: state.learnedWords.includes(wordId) 
          ? state.learnedWords 
          : [...state.learnedWords, wordId]
      })),

      toggleFavorite: (wordId) => set((state) => ({
        favorites: state.favorites.includes(wordId)
          ? state.favorites.filter(id => id !== wordId)
          : [...state.favorites, wordId]
      })),

      updateReview: (item) => set((state) => ({
        reviewSchedule: {
          ...state.reviewSchedule,
          [item.wordId]: item
        },
        learnedWords: state.learnedWords.includes(item.wordId)
          ? state.learnedWords
          : [...state.learnedWords, item.wordId]
      })),

      updateStreak: () => set((state) => {
        const today = new Date().toISOString().split('T')[0];
        if (state.lastStudyDate === today) return state; // Already studied today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (state.lastStudyDate === yesterdayStr) {
          return { streak: state.streak + 1, lastStudyDate: today };
        } else {
          return { streak: 1, lastStudyDate: today };
        }
      }),

      addTestResult: (result) => set((state) => ({
        testHistory: [...state.testHistory, result]
      }))
    }),
    {
      name: 'fceng-storage',
      partialize: (state) => ({
        learnedWords: state.learnedWords,
        favorites: state.favorites,
        reviewSchedule: state.reviewSchedule,
        dailyGoal: state.dailyGoal,
        streak: state.streak,
        lastStudyDate: state.lastStudyDate,
        testHistory: state.testHistory
      })
    }
  )
);

// Helper for fetching vocabulary
let vocabCache: VocabularyWord[] | null = null;
export async function fetchVocabulary(): Promise<VocabularyWord[]> {
  if (vocabCache) return vocabCache;
  const res = await fetch('/data/vocabulary.json');
  if (!res.ok) throw new Error('Failed to fetch vocabulary');
  const data = await res.json();
  vocabCache = data;
  return data;
}
