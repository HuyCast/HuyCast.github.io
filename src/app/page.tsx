'use client';
import { useState, useEffect } from 'react';
import { AppView, VocabularyWord } from '@/types';
import { Navigation } from '@/components/navigation';
import { Dashboard } from '@/components/dashboard';
import { FlashcardView } from '@/components/flashcard';
import { Quiz } from '@/components/quiz';
import { fetchVocabulary, useStore } from '@/lib/storage';
import { Loader2 } from 'lucide-react';

export default function AppContainer() {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { updateStreak, reviewSchedule, learnedWords } = useStore();

  useEffect(() => {
    updateStreak();
    
    fetchVocabulary()
      .then(data => {
        setVocabulary(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch vocabulary", err);
        setLoading(false);
      });

    const handleNavigate = (e: CustomEvent<AppView>) => {
      setActiveView(e.detail);
    };

    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate', handleNavigate as EventListener);
  }, [updateStreak]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground animate-pulse">Loading vocabulary...</p>
      </div>
    );
  }

  // Filter logic for different views
  const getReviewWords = () => {
    const today = new Date().toISOString().split('T')[0];
    const wordsToReview = vocabulary.filter(w => {
      const schedule = reviewSchedule[w.id];
      if (!schedule) return true; // Never reviewed
      return schedule.sm2.nextReviewDate.startsWith(today) || schedule.sm2.nextReviewDate < today;
    });
    return wordsToReview.length > 0 ? wordsToReview : vocabulary; // Fallback to all if nothing to review
  };

  const getLearnedWords = () => {
    return vocabulary.filter(w => learnedWords.includes(w.id));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Navigation activeView={activeView} setActiveView={setActiveView} />
      
      <main className="flex-1 md:pl-64 h-full overflow-y-auto relative">
        {activeView === 'dashboard' && <Dashboard vocabulary={vocabulary} />}
        {activeView === 'flashcard' && <FlashcardView words={vocabulary} mode="browse" />}
        {activeView === 'vocabulary' && <FlashcardView words={getReviewWords()} mode="review" />}
        {activeView === 'quiz' && <Quiz words={getLearnedWords().length >= 10 ? getLearnedWords() : vocabulary} />}
        
        {activeView === 'settings' && (
          <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Settings</h1>
            <p className="text-muted-foreground">Coming soon in next update...</p>
          </div>
        )}
      </main>
    </div>
  );
}
