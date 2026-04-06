import { useStore, CATEGORIES } from "@/lib/store";
import { NewsCard } from "@/components/NewsCard";
import { LoadingProgress } from "@/components/LoadingProgress";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCw, CheckCheck, X, Filter, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Feed() {
  const { 
    paginatedFeed, 
    isLoading, 
    preferences, 
    refreshFeed, 
    refreshProgress, 
    toggleTheme,
    selectAllThemes,
    clearAllThemes,
    selectCategory,
    deselectCategory,
    currentPage,
    setCurrentPage,
    totalPages,
    feed
  } = useStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

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
    await refreshFeed();
    setIsRefreshing(false);
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
                    ? `${feed.length} alertas nos últimos 7 dias`
                    : "Selecione filtros para ver notícias"
                  }
                </p>
              </div>
            </div>
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
          </div>
        </motion.section>

        <section className="bg-card border rounded-2xl p-5 space-y-4">
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

          <div className="space-y-3">
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
                      <span className="text-xl">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
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
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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
              Selecione pelo menos uma categoria ou tema para ver as notícias.
            </p>
            <Button onClick={selectAllThemes} data-testid="select-all-empty-button">
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
          <>
            <div className="grid gap-4">
              {paginatedFeed.length > 0 ? (
                paginatedFeed.map((item, idx) => (
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
                    Nenhuma notícia encontrada para os temas selecionados nos últimos 7 dias.
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4"
                >
                  Próxima
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
