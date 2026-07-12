import { AppView } from '@/types';
import { cn } from '@/lib/utils';
import { Home, BookOpen, CheckSquare, Settings, Activity } from 'lucide-react';

export function Navigation({ activeView, setActiveView }: { activeView: AppView, setActiveView: (view: AppView) => void }) {
  const links = [
    { view: 'dashboard', icon: Home, label: 'Dashboard', shortLabel: 'Home' },
    { view: 'flashcard', icon: BookOpen, label: 'Browse Words', shortLabel: 'Browse' },
    { view: 'vocabulary', icon: Activity, label: 'Learn & Review', shortLabel: 'Learn' }, // Mapping vocabulary to Learn for now
    { view: 'quiz', icon: CheckSquare, label: 'Weekly Test', shortLabel: 'Test' },
  ] as const;

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t pb-safe md:hidden">
        <div className="flex justify-around items-center h-16 px-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = activeView === link.view;
            
            return (
              <button 
                key={link.view} 
                onClick={() => setActiveView(link.view)}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                <Icon size={20} className={cn(isActive && "fill-primary/20")} />
                <span className="text-[10px] font-medium">{link.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen border-r bg-muted/30 fixed left-0 top-0">
        <div className="p-6">
          <h2 className="text-2xl font-bold tracking-tight text-primary">FCENG</h2>
          <p className="text-sm text-muted-foreground mt-1">Master Vocabulary</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = activeView === link.view;
            
            return (
              <button
                key={link.view}
                onClick={() => setActiveView(link.view)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm text-left",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon size={18} className={cn(isActive && "fill-primary/20")} />
                {link.label}
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t">
          <button 
            onClick={() => setActiveView('settings')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}
