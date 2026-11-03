import { useStore } from "@/lib/store";
import { NewsCard } from "@/components/NewsCard";
import { LoadingProgress } from "@/components/LoadingProgress";
import { Button } from "@/components/ui/button";
import { FeedFilters } from "@/components/FeedFilters";
import { ShieldCheck, RefreshCw, AlertTriangle, ChevronRight } from "lucide-react";
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshFeed();
    } finally {
      setIsRefreshing(false);
    }
  };

  const showLoadingBar = refreshProgress.status !== "idle" || isLoading;
  return (
    <div className="space-y-6">
      {showLoadingBar && <LoadingProgress />}
      
      <div className={`space-y-4 ${showLoadingBar ? "pt-24" : ""}`}>
        <motion.section 
          className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[0.07] via-primary/[0.035] to-transparent px-4 py-4 sm:px-5 sm:py-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 text-left">
                <h1 className="text-xl font-serif font-bold leading-tight text-primary sm:text-2xl">
                  Notícias Verificadas
                </h1>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  {feed.length > 0 
                    ? `${totalNews} notícias disponíveis nos últimos 7 dias · ${feed.length} carregadas`
                    : "Notícias dos últimos 7 dias"
                  }
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-4 sm:shrink-0 sm:flex-nowrap">
              {isAdmin && (
                <Button 
                  variant="outline"
                  className="h-11 gap-2 border-primary/25 px-3 text-primary hover:bg-primary/5"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  data-testid="refresh-button"
                  aria-label="Atualizar notícias"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden />
                  <span className="text-sm">Atualizar notícias</span>
                </Button>
              )}
              <FeedFilters
                selectedTags={preferences.selectedTags}
                toggleTheme={toggleTheme}
                selectAllThemes={selectAllThemes}
                clearAllThemes={clearAllThemes}
                selectCategory={selectCategory}
                deselectCategory={deselectCategory}
              />
            </div>
          </div>
        </motion.section>

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
