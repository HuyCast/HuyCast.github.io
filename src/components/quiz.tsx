import React, { useState, useEffect } from 'react';
import { VocabularyWord } from '@/types';
import { Button, Card, CardContent, Progress } from '@/components/ui';
import { CheckCircle2, XCircle, Volume2 } from 'lucide-react';
import { useStore } from '@/lib/storage';

type QuestionType = 'multiple_choice' | 'typing' | 'fill_blank';

interface Question {
  type: QuestionType;
  word: VocabularyWord;
  options?: string[];
  answer: string;
}

export function Quiz({ words }: { words: VocabularyWord[] }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { addTestResult } = useStore();
  const [startTime, setStartTime] = useState(Date.now());
  const [wrongWords, setWrongWords] = useState<string[]>([]);

  useEffect(() => {
    // Generate 50 questions
    const generated: Question[] = [];
    const availableWords = [...words].sort(() => 0.5 - Math.random());
    const count = Math.min(50, availableWords.length);
    
    for (let i = 0; i < count; i++) {
      const word = availableWords[i];
      const typeRand = Math.random();
      
      let type: QuestionType = 'multiple_choice';
      if (typeRand > 0.7 && word.examples?.length > 0) type = 'fill_blank';
      else if (typeRand > 0.4) type = 'typing';

      if (type === 'multiple_choice') {
        const others = words.filter(w => w.id !== word.id).sort(() => 0.5 - Math.random()).slice(0, 3);
        const options = [word.basic.vietnamese_meaning, ...others.map(w => w.basic.vietnamese_meaning)].sort(() => 0.5 - Math.random());
        generated.push({ type, word, options, answer: word.basic.vietnamese_meaning });
      } else if (type === 'fill_blank') {
        generated.push({ type, word, answer: word.basic.word });
      } else {
        generated.push({ type, word, answer: word.basic.word });
      }
    }
    setQuestions(generated);
    setStartTime(Date.now());
  }, [words]);

  if (questions.length === 0) {
    return <div className="p-8 text-center">Not enough words to generate a quiz. Learn more words first!</div>;
  }

  const currentQ = questions[currentIndex];

  const handleSubmit = (ans: string = userAnswer) => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    
    const isCorrect = ans.toLowerCase().trim() === currentQ.answer.toLowerCase().trim();
    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      setWrongWords(prev => [...prev, currentQ.word.id]);
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
        setUserAnswer('');
        setIsSubmitted(false);
      } else {
        // Finish test
        setShowResult(true);
        addTestResult({
          date: new Date().toISOString(),
          score: score + (isCorrect ? 1 : 0),
          total: questions.length,
          accuracy: Math.round(((score + (isCorrect ? 1 : 0)) / questions.length) * 100),
          timeSpent: Math.round((Date.now() - startTime) / 1000),
          wrongWords: isCorrect ? wrongWords : [...wrongWords, currentQ.word.id]
        });
      }
    }, 1500);
  };

  const playAudio = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentQ.word.basic.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (showResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in">
        <TrophyIcon className="w-20 h-20 text-yellow-500 mb-4" />
        <h2 className="text-3xl font-bold mb-2">Test Completed!</h2>
        <p className="text-xl mb-6">Score: {score} / {questions.length}</p>
        <Button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }))}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto p-4 animate-in fade-in">
      <div className="mb-4">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>Score: {score}</span>
        </div>
        <Progress value={((currentIndex) / questions.length) * 100} className="h-2" />
      </div>

      <Card className="flex-1 flex flex-col items-center justify-center p-6 text-center shadow-sm relative overflow-hidden">
        {currentQ.type === 'multiple_choice' && (
          <>
            <h2 className="text-3xl font-bold text-primary mb-2">{currentQ.word.basic.word}</h2>
            <p className="text-muted-foreground mb-8">What does this word mean?</p>
            <div className="w-full flex flex-col gap-3">
              {currentQ.options?.map((opt, i) => {
                const isSelected = userAnswer === opt;
                const isCorrectOpt = opt === currentQ.answer;
                
                let bgClass = "bg-card";
                if (isSubmitted) {
                  if (isCorrectOpt) bgClass = "bg-green-100 dark:bg-green-900 border-green-500";
                  else if (isSelected) bgClass = "bg-red-100 dark:bg-red-900 border-red-500";
                } else if (isSelected) {
                  bgClass = "border-primary";
                }

                return (
                  <Button 
                    key={i} 
                    variant="outline" 
                    className={`h-auto py-3 justify-start px-4 text-left whitespace-normal ${bgClass}`}
                    onClick={() => {
                      if (!isSubmitted) {
                        setUserAnswer(opt);
                        handleSubmit(opt);
                      }
                    }}
                  >
                    {opt}
                  </Button>
                );
              })}
            </div>
          </>
        )}

        {currentQ.type === 'typing' && (
          <>
            <button onClick={playAudio} className="p-4 rounded-full bg-primary/10 text-primary mb-4 hover:bg-primary/20">
              <Volume2 size={32} />
            </button>
            <p className="text-muted-foreground mb-8">Type the word you hear</p>
            <div className="w-full flex flex-col gap-3">
              <input 
                type="text" 
                autoFocus
                className="w-full text-center text-2xl p-4 border rounded-xl outline-none focus:ring-2 focus:ring-primary bg-transparent"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={isSubmitted}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              {!isSubmitted && <Button onClick={() => handleSubmit()} className="w-full py-6">Submit</Button>}
              
              {isSubmitted && (
                <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${userAnswer.toLowerCase() === currentQ.answer.toLowerCase() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {userAnswer.toLowerCase() === currentQ.answer.toLowerCase() ? <CheckCircle2 /> : <XCircle />}
                  <span className="font-bold">Correct answer: {currentQ.answer}</span>
                </div>
              )}
            </div>
          </>
        )}

        {currentQ.type === 'fill_blank' && (
          <>
            <h2 className="text-lg font-medium text-foreground mb-8 leading-relaxed">
              {currentQ.word.examples[0]?.en.replace(new RegExp(currentQ.answer, 'gi'), '________')}
            </h2>
            <p className="text-muted-foreground mb-4">({currentQ.word.basic.vietnamese_meaning})</p>
            <div className="w-full flex flex-col gap-3">
              <input 
                type="text" 
                autoFocus
                className="w-full text-center text-2xl p-4 border rounded-xl outline-none focus:ring-2 focus:ring-primary bg-transparent"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={isSubmitted}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              {!isSubmitted && <Button onClick={() => handleSubmit()} className="w-full py-6">Submit</Button>}
              
              {isSubmitted && (
                <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${userAnswer.toLowerCase() === currentQ.answer.toLowerCase() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {userAnswer.toLowerCase() === currentQ.answer.toLowerCase() ? <CheckCircle2 /> : <XCircle />}
                  <span className="font-bold">Correct answer: {currentQ.answer}</span>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function TrophyIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7c0 6 6 10 6 10s6-4 6-10V2z" />
    </svg>
  );
}
