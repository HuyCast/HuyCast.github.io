export type AppView = 'dashboard' | 'flashcard' | 'quiz' | 'test' | 'vocabulary' | 'settings';

export interface WordFamily {
  noun: string;
  verb: string;
  adjective: string;
  adverb: string;
  person_noun: string;
  opposite_form: string;
  prefix: string;
  suffix: string;
}

export interface WordFormsVerb {
  base: string;
  v2: string;
  v3: string;
  ving: string;
}

export interface WordFormsNoun {
  singular: string;
  plural: string;
}

export interface WordFormsAdjective {
  comparative: string;
  superlative: string;
}

export interface WordForms {
  verb?: WordFormsVerb | null;
  noun?: WordFormsNoun | null;
  adjective?: WordFormsAdjective | null;
}

export interface RelatedWords {
  synonyms: string[];
  antonyms: string[];
  collocations: string[];
  phrasal_verbs: string[];
  idioms: string[];
  confused_words: string[];
}

export interface WordExample {
  en: string;
  vi: string;
}

export interface WordBasic {
  word: string;
  ipa: string;
  audio: string;
  part_of_speech: string;
  vietnamese_meaning: string;
  english_definition: string;
  cefr: string;
  topic: string;
}

export interface VocabularyWord {
  id: string;
  basic: WordBasic;
  word_family: WordFamily;
  word_forms: WordForms;
  related: RelatedWords;
  examples: WordExample[];
  memory_tip?: string;
  common_mistakes?: string;
}

export interface SM2Data {
  repetition: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: string; // ISO String
}

export interface ReviewItem {
  wordId: string;
  sm2: SM2Data;
}

export interface TestHistory {
  date: string; // ISO String
  score: number;
  total: number;
  accuracy: number;
  timeSpent: number; // in seconds
  wrongWords: string[]; // Word IDs
}
