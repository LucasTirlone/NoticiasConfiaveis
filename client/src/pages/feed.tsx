import { useStore, CATEGORIES } from "@/lib/store";
import { NewsCard } from "@/components/NewsCard";
import { LoadingProgress } from "@/components/LoadingProgress";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCw, CheckCheck, X, Filter, AlertTriangle, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";

export default function Feed() {
  const { 
    feed,
    isLoading, 
    isLoadingMore,
    hasMore,
    totalNews,
    feedError,
    loadNextPage,
    retryFeed,
    preferences, 
    refreshFeed, 
    refreshProgress, 
    toggleTheme,
    selectAllThemes,
    clearAllThemes,
    selectCategory,
    deselectCategory,
  } = useStore();
  
  const { isAdmin } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadNextPageRef = useRef(loadNextPage);
  loadNextPageRef.current = loadNextPage;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined" || !hasMore || isLoading || isLoadingMore || feedError) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void loadNextPageRef.current();
    }, { rootMargin: "320px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, feedError, feed.length]);

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const isCategoryFullySelected = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return false;
    return category.themes.every(t => preferences.selectedTags.includes(t.id));
  };

  const isCategoryPartiallySelected = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return false;
    const selectedCount = category.themes.filter(t => preferences.selectedTags.includes(t.id)).length;
    return selectedCount > 0 && selectedCount < category.themes.length;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshFeed();
    } finally {
      setIsRefreshing(false);
    }
  };

  const showLoadingBar = refreshProgress.status !== "idle" || isLoading;
  const allSelected = preferences.selectedTags.length === CATEGORIES.flatMap(c => c.themes).length;
  const noneSelected = preferences.selectedTags.length === 0;
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
                    ? `${totalNews} notícias disponíveis nos últimos 7 dias · ${feed.length} carregadas`
                    : "Notícias dos últimos 7 dias"
                  }
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-primary uppercase tracking-wider hidden sm:inline">
                  Atualizar Notícias
                </span>
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
            )}
          </div>
        </motion.section>

        <section className="bg-card border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">
                Filtrar por categoria:
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={allSelected ? "default" : "outline"} 
                size="sm"
                onClick={selectAllThemes}
                className="text-sm"
                data-testid="select-all-button"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Todos
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAllThemes}
                disabled={noneSelected}
                className="text-sm"
                data-testid="clear-all-button"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {CATEGORIES.map(category => {
              const isExpanded = expandedCategories.includes(category.id);
              const isFullySelected = isCategoryFullySelected(category.id);
              const isPartiallySelected = isCategoryPartiallySelected(category.id);
              
              return (
                <div key={category.id} className="border rounded-xl overflow-hidden">
                  <div 
                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                      isFullySelected ? 'bg-primary/10' : isPartiallySelected ? 'bg-primary/5' : 'bg-muted/30'
                    }`}
                    onClick={() => toggleCategoryExpand(category.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{category.icon}</span>
                      <span className="text-sm font-normal">{category.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({category.themes.filter(t => preferences.selectedTags.includes(t.id)).length}/{category.themes.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isFullySelected ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          isFullySelected ? deselectCategory(category.id) : selectCategory(category.id);
                        }}
                        className="text-xs h-7"
                      >
                        {isFullySelected ? "✓" : "Selecionar"}
                      </Button>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-3 bg-background border-t">
                      <div className="flex flex-wrap gap-2">
                        {category.themes.map(theme => {
                          const isActive = preferences.selectedTags.includes(theme.id);
                          return (
                            <button
                              key={theme.id}
                              onClick={() => toggleTheme(theme.id)}
                              className={`px-2.5 py-1 rounded-full text-xs font-normal transition-all ${
                                isActive 
                                  ? 'bg-primary text-primary-foreground shadow-sm' 
                                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                              }`}
                              data-testid={`theme-filter-${theme.id}`}
                            >
                              {isActive ? '✓ ' : ''}{theme.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {isLoading && feed.length === 0 ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {feed.length > 0 ? (
                feed.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx % 8, 5) * 0.035 }}
                  >
                    <NewsCard item={item} />
                  </motion.div>
                ))
              ) : !feedError && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg">
                    Nenhuma notícia encontrada para os temas selecionados nos últimos 7 dias.
                  </p>
                  {isAdmin && (
                    <Button 
                      variant="link" 
                      onClick={handleRefresh} 
                      className="mt-2 text-lg" 
                      data-testid="refresh-empty-button"
                    >
                      Atualizar notícias
                    </Button>
                  )}
                </div>
              )}
            </div>

            {feedError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center" role="alert">
                <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-destructive" aria-hidden />
                <p className="font-medium">{feedError}</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => feed.length ? void loadNextPage() : void retryFeed()}
                >
                  Tentar novamente
                </Button>
              </div>
            )}

            <div ref={sentinelRef} aria-hidden="true" className="h-1" />
            {isLoadingMore && (
              <div className="flex justify-center py-5" role="status" aria-live="polite">
                <span className="animate-pulse text-sm text-muted-foreground">Carregando mais notícias…</span>
              </div>
            )}
            {hasMore && !feedError && (
              <div className="flex justify-center py-3">
                <Button variant="outline" onClick={() => void loadNextPage()} disabled={isLoadingMore} aria-label="Carregar mais notícias">
                  {isLoadingMore ? "Carregando…" : "Carregar mais"}
                  {!isLoadingMore && <ChevronRight className="ml-1 h-4 w-4" aria-hidden />}
                </Button>
              </div>
            )}
            {!hasMore && feed.length > 0 && !isLoading && (
              <p className="py-5 text-center text-sm text-muted-foreground" aria-live="polite">
                Você chegou ao fim das notícias dos últimos 7 dias.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
