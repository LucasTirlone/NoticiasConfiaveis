import { useStore, AVAILABLE_TAGS } from "@/lib/store";
import { NewsCard } from "@/components/NewsCard";
import { LoadingProgress } from "@/components/LoadingProgress";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCw, CheckCheck, X, Filter, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Feed() {
  const { feed, isLoading, preferences, refreshFeed, refreshProgress, loadNews, selectAllTags, clearAllTags, updatePreferences } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>(preferences.selectedTags);

  useEffect(() => {
    setActiveFilters(preferences.selectedTags);
  }, [preferences.selectedTags]);

  const handleTagClick = async (tag: string) => {
    const newFilters = activeFilters.includes(tag)
      ? activeFilters.filter(t => t !== tag)
      : [...activeFilters, tag];
    setActiveFilters(newFilters);
    updatePreferences({ selectedTags: newFilters });
  };

  const handleSelectAll = () => {
    setActiveFilters([...AVAILABLE_TAGS]);
    selectAllTags();
  };

  const handleClearAll = () => {
    setActiveFilters([]);
    clearAllTags();
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
  const allSelected = activeFilters.length === AVAILABLE_TAGS.length;
  const noneSelected = activeFilters.length === 0;

  return (
    <div className="space-y-6">
      {showLoadingBar && <LoadingProgress />}
      
      <div className={showLoadingBar ? "pt-24" : ""}>
        <motion.section 
          className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 text-center space-y-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-serif text-primary font-bold">
                  Notícias Verificadas
                </h1>
                <p className="text-muted-foreground text-sm">
                  {feed.length > 0 
                    ? `${feed.length} eventos monitorados em tempo real`
                    : "Selecione filtros para ver notícias"
                  }
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-12 w-12 shrink-0 border-primary/30 hover:bg-primary/10"
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-testid="refresh-button"
            >
              <RefreshCw className={`w-6 h-6 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </motion.section>

        <section className="bg-card border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">
                Filtrar por tema:
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={allSelected ? "default" : "outline"} 
                size="sm"
                onClick={handleSelectAll}
                className="text-sm"
                data-testid="select-all-button"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Todos
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleClearAll}
                disabled={noneSelected}
                className="text-sm"
                data-testid="clear-all-button"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map(tag => {
              const isActive = activeFilters.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  aria-pressed={isActive}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                  data-testid={`tag-filter-${tag}`}
                >
                  {isActive ? '✓ ' : ''}{tag.charAt(0).toUpperCase() + tag.slice(1)}
                </button>
              );
            })}
          </div>
          {activeFilters.length > 0 && activeFilters.length < AVAILABLE_TAGS.length && (
            <p className="text-sm text-muted-foreground">
              {activeFilters.length} de {AVAILABLE_TAGS.length} temas selecionados
            </p>
          )}
        </section>

        {noneSelected ? (
          <motion.div 
            className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl font-medium text-muted-foreground mb-2">
              Nenhum filtro selecionado
            </p>
            <p className="text-muted-foreground mb-6">
              Selecione pelo menos um tema para ver as notícias.
            </p>
            <Button onClick={handleSelectAll} data-testid="select-all-empty-button">
              <CheckCheck className="w-4 h-4 mr-2" />
              Selecionar todos os temas
            </Button>
          </motion.div>
        ) : isLoading && refreshProgress.status === "idle" ? (
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
                  Nenhuma notícia encontrada para os temas selecionados.
                </p>
                <Button 
                  variant="link" 
                  onClick={handleRefresh} 
                  className="mt-2 text-lg" 
                  data-testid="refresh-empty-button"
                >
                  Atualizar notícias
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
