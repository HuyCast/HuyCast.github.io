import { useStore } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Progress } from '@/components/ui';
import { BookOpen, Flame, Target, Trophy } from 'lucide-react';
import { VocabularyWord } from '@/types';

export function Dashboard({ 
  vocabulary 
}: { 
  vocabulary: VocabularyWord[] 
}) {
  const { dailyGoal, streak, learnedWords, reviewSchedule } = useStore();

  const totalWords = vocabulary.length || 0;
  const progressPercent = Math.round((learnedWords.length / totalWords) * 100) || 0;
  
  const today = new Date().toISOString().split('T')[0];
  const reviewsToday = Object.values(reviewSchedule).filter(item => {
    return item.sm2.nextReviewDate.startsWith(today) || item.sm2.nextReviewDate < today;
  }).length;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back! 👋</h1>
        <p className="text-muted-foreground">Here is your learning progress for today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Flame className="w-8 h-8 text-orange-500 mb-2" />
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{streak}</div>
            <p className="text-xs font-medium text-orange-600/80 dark:text-orange-500">Day Streak</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Target className="w-8 h-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{dailyGoal}</div>
            <p className="text-xs font-medium text-blue-600/80 dark:text-blue-500">Daily Goal</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-8 h-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{learnedWords.length}</div>
            <p className="text-xs font-medium text-green-600/80 dark:text-green-500">Learned Words</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Trophy className="w-8 h-8 text-purple-500 mb-2" />
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{reviewsToday}</div>
            <p className="text-xs font-medium text-purple-600/80 dark:text-purple-500">Reviews Today</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8 shadow-sm">
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>You have mastered {learnedWords.length} out of {totalWords} words.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={progressPercent} className="h-3" />
            </div>
            <span className="font-semibold">{progressPercent}%</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Recommendations */}
      <h2 className="text-xl font-bold mb-4">Recommended for you</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'flashcard' }))}>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" /> Review Flashcards
            </h3>
            <p className="text-sm text-muted-foreground mb-4">You have {reviewsToday} words waiting for review based on spaced repetition.</p>
            <div className="text-primary text-sm font-medium">Start Review →</div>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'quiz' }))}>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-2">
              <CheckSquare className="w-5 h-5 text-green-500" /> Weekly Test
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Challenge yourself with a 50-question test based on what you've learned.</p>
            <div className="text-primary text-sm font-medium">Take Test →</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Just an icon wrapper since CheckSquare wasn't imported at top
function CheckSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
