import { useStore, AVAILABLE_TAGS } from "@/lib/store";
import { NewsCard } from "@/components/NewsCard";
import { LoadingProgress } from "@/components/LoadingProgress";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Feed() {
  const { feed, isLoading, preferences, refreshFeed, refreshProgress, toggleTag, loadNews } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>(preferences.selectedTags);

  const handleTagClick = async (tag: string) => {
    const newFilters = activeFilters.includes(tag)
      ? activeFilters.filter(t => t !== tag)
      : [...activeFilters, tag];
    setActiveFilters(newFilters);
    await loadNews(newFilters.length > 0 ? newFilters : undefined);
  };

  const filteredFeed = feed.filter(item => {
    if (preferences.sensitivity === "critical_only" && item.alertLevel === "info") {
      return false;
    }
    return true;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFeed();
    setIsRefreshing(false);
  };

  const showLoadingBar = refreshProgress.status !== "idle" || isLoading;

  return (
    <div className="space-y-6">
      {showLoadingBar && <LoadingProgress />}
      
      <div className={showLoadingBar ? "pt-24" : ""}>
        <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-serif text-primary flex items-center gap-2">
              <ShieldCheck className="w-8 h-8" />
              Notícias Verificadas
            </h1>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-12 w-12 shrink-0"
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-testid="refresh-button"
            >
              <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-muted-foreground text-lg">
            Monitorando {feed.length} eventos em tempo real para você.
          </p>
        </section>

        <section className="bg-card border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Filtrar por palavras-chave:
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map(tag => {
              const isActive = activeFilters.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  aria-pressed={isActive}
                  className={`px-4 py-2 rounded-full text-base font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary' 
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                  }`}
                  data-testid={`tag-filter-${tag}`}
                >
                  {isActive ? '✓ ' : ''}{tag.charAt(0).toUpperCase() + tag.slice(1)}
                </button>
              );
            })}
          </div>
          {activeFilters.length > 0 && (
            <button
              onClick={() => { setActiveFilters([]); loadNews(); }}
              className="text-sm text-primary hover:underline"
              data-testid="clear-filters-button"
            >
              Limpar filtros ({activeFilters.length} selecionados)
            </button>
          )}
        </section>

        {isLoading && refreshProgress.status === "idle" ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredFeed.length > 0 ? (
              filteredFeed.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <NewsCard item={item} />
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">
                  {activeFilters.length > 0 
                    ? "Nenhuma notícia encontrada para essas palavras-chave."
                    : "Nenhuma notícia disponível no momento."
                  }
                </p>
                {activeFilters.length > 0 && (
                  <Button 
                    variant="link" 
                    onClick={() => { setActiveFilters([]); loadNews(); }} 
                    className="mt-2 text-lg" 
                    data-testid="clear-search-button"
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
