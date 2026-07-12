import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Volume2, RefreshCw, Shuffle, CheckCircle2 } from 'lucide-react';
import { VocabularyWord } from '@/types';
import { Badge, Separator, Button } from '@/components/ui';
import { useStore } from '@/lib/storage';
import { calculateSM2, getQualityFromAction } from '@/lib/utils';

export function FlashcardView({ 
  words, 
  mode = 'browse' 
}: { 
  words: VocabularyWord[], 
  mode?: 'browse' | 'review' 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [key, setKey] = useState(0);
  const { reviewSchedule, updateReview } = useStore();

  const currentWord = words[currentIndex] || null;

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setKey(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setKey(prev => prev + 1);
    }
  };

  const handleReviewAction = (action: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentWord) return;
    const quality = getQualityFromAction(action);
    const existingData = reviewSchedule[currentWord.id]?.sm2;
    const newSM2 = calculateSM2(quality, existingData);
    
    updateReview({
      wordId: currentWord.id,
      sm2: newSM2
    });

    handleNext();
  };

  if (!currentWord) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-in fade-in">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold">All caught up!</h2>
        <p className="text-muted-foreground mt-2">You've completed all cards for now.</p>
        <Button className="mt-6" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }))}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto relative overflow-hidden animate-in fade-in">
      <div className="flex-1 flex flex-col justify-center items-center p-4 min-h-0 w-full relative">
        <div className="w-full h-full max-h-[500px] relative flex justify-center items-center">
          <FlashcardCard 
            key={key} 
            word={currentWord} 
            onSwipeLeft={mode === 'browse' ? handleNext : undefined}
            onSwipeRight={mode === 'browse' ? handlePrev : undefined}
            interactive={true}
          />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4 shrink-0 bg-background border-t pb-24">
        {mode === 'browse' ? (
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              {currentIndex + 1} / {words.length}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePrev} disabled={currentIndex === 0}>&larr;</Button>
              <Button variant="outline" size="icon" onClick={() => {
                setCurrentIndex(Math.floor(Math.random() * words.length));
                setKey(k => k + 1);
              }}><Shuffle className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={handleNext} disabled={currentIndex >= words.length - 1}>&rarr;</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <Button variant="destructive" className="flex-col h-auto py-2" onClick={() => handleReviewAction('again')}>
              <span className="font-bold">Again</span>
              <span className="text-[10px] opacity-80">&lt; 1m</span>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-2 border-orange-200 text-orange-600 dark:border-orange-900" onClick={() => handleReviewAction('hard')}>
              <span className="font-bold">Hard</span>
              <span className="text-[10px] opacity-80">1d</span>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-2 border-blue-200 text-blue-600 dark:border-blue-900" onClick={() => handleReviewAction('good')}>
              <span className="font-bold">Good</span>
              <span className="text-[10px] opacity-80">3d</span>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-2 border-green-200 text-green-600 dark:border-green-900" onClick={() => handleReviewAction('easy')}>
              <span className="font-bold">Easy</span>
              <span className="text-[10px] opacity-80">4d</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const FlashcardCard = React.memo(function FlashcardCard({ word, onSwipeLeft, onSwipeRight, interactive = true }: any) {
  const [isFlipped, setIsFlipped] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleFlip = (e: any) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsFlipped(!isFlipped);
  };

  const handleDragEnd = async (e: any, info: PanInfo) => {
    if (!interactive) return;
    const threshold = 100;
    if (info.offset.x > threshold) {
      await controls.start({ x: 300, opacity: 0, transition: { duration: 0.2 } });
      onSwipeRight?.();
    } else if (info.offset.x < -threshold) {
      await controls.start({ x: -300, opacity: 0, transition: { duration: 0.2 } });
      onSwipeLeft?.();
    } else {
      controls.start({ x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.basic.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="relative w-full max-w-sm aspect-[3/4] mx-auto perspective-1000">
      <motion.div
        className="w-full h-full preserve-3d cursor-pointer"
        animate={controls}
        style={{ x, rotate, opacity, willChange: 'transform' }}
        drag={interactive && (onSwipeLeft || onSwipeRight) ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={handleDragEnd}
        onClick={handleFlip}
        initial={{ rotateY: 0 }}
      >
        <motion.div 
          className="absolute w-full h-full preserve-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          style={{ willChange: 'transform' }}
        >
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-card rounded-2xl shadow-xl border p-6 flex flex-col items-center justify-center text-center">
            <Badge variant="secondary" className="absolute top-4 left-4">{word.basic.topic}</Badge>
            <button onClick={playAudio} className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground">
              <Volume2 size={24} />
            </button>
            <h2 className="text-5xl font-bold tracking-tight text-primary mb-4">{word.basic.word}</h2>
            <p className="text-xl text-muted-foreground font-medium">{word.basic.ipa}</p>
            <p className="text-sm text-muted-foreground mt-2 opacity-60">({word.basic.part_of_speech})</p>
            <div className="absolute bottom-6 text-sm text-muted-foreground/50 flex items-center gap-2">
              <RefreshCw size={14} /> Tap to flip
            </div>
          </div>

          {/* Back */}
          <div 
            className="absolute w-full h-full backface-hidden bg-card rounded-2xl shadow-xl border p-6 flex flex-col overflow-y-auto"
            style={{ transform: "rotateY(180deg)", willChange: 'transform' }}
          >
            <div className="flex justify-between items-start mb-4 shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-primary">{word.basic.word}</h3>
                <p className="text-sm text-muted-foreground">{word.basic.ipa}</p>
              </div>
              <button onClick={playAudio} className="p-2 rounded-full bg-primary/10 text-primary">
                <Volume2 size={20} />
              </button>
            </div>
            
            <div className="space-y-4 flex-1">
              <div>
                <p className="text-lg font-medium">{word.basic.vietnamese_meaning}</p>
                <p className="text-sm text-muted-foreground mt-1">{word.basic.english_definition}</p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">Examples</h4>
                <ul className="space-y-3">
                  {word.examples?.slice(0, 2).map((ex: any, i: number) => (
                    <li key={i} className="text-sm">
                      <p className="font-medium">{ex.en}</p>
                      <p className="text-muted-foreground">{ex.vi}</p>
                    </li>
                  ))}
                </ul>
              </div>
              {word.word_family?.noun && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">Word Family</h4>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {word.word_family.noun && <div><span className="text-muted-foreground">n.</span> {word.word_family.noun}</div>}
                      {word.word_family.verb && <div><span className="text-muted-foreground">v.</span> {word.word_family.verb}</div>}
                      {word.word_family.adjective && <div><span className="text-muted-foreground">adj.</span> {word.word_family.adjective}</div>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
});
