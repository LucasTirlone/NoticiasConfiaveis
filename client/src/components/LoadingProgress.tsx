import { useStore } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export function LoadingProgress() {
  const { refreshProgress, isLoading } = useStore();
  
  if (refreshProgress.status === "idle" && !isLoading) {
    return null;
  }
  
  const percentage = refreshProgress.total > 0 
    ? Math.round((refreshProgress.current / refreshProgress.total) * 100)
    : 0;
  
  const statusColor = {
    idle: "bg-muted",
    loading: "bg-primary",
    complete: "bg-green-500",
    error: "bg-destructive"
  };
  
  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-lg p-4"
      data-testid="loading-progress-container"
    >
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {refreshProgress.status === "loading" && (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            )}
            <span className="text-lg font-medium" data-testid="loading-message">
              {refreshProgress.message || "Carregando..."}
            </span>
          </div>
          <span 
            className="text-2xl font-bold text-primary" 
            data-testid="loading-percentage"
          >
            {percentage}%
          </span>
        </div>
        
        <Progress 
          value={percentage} 
          className="h-4"
          data-testid="loading-progress-bar"
        />
        
        {refreshProgress.total > 0 && (
          <p className="text-sm text-muted-foreground text-center" data-testid="loading-step">
            Fonte {refreshProgress.current} de {refreshProgress.total}
          </p>
        )}
      </div>
    </div>
  );
}
