import { useStore } from "@/lib/store";
import { NewsCard } from "@/components/NewsCard";
import { LoadingProgress } from "@/components/LoadingProgress";
import { Button } from "@/components/ui/button";
import { Search, Filter, ShieldCheck, RefreshCw, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Feed() {
  const { feed, isLoading, preferences, refreshFeed, refreshProgress } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredFeed = feed.filter(item => {
    if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase()) && !item.summary.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
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
        <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-2">
          <h1 className="text-2xl font-serif text-primary flex items-center justify-center gap-2">
            <ShieldCheck className="w-8 h-8" />
            Notícias Verificadas
          </h1>
          <p className="text-muted-foreground text-lg">
            Monitorando {feed.length} eventos em tempo real para você.
          </p>
          
          {preferences.selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <Tag className="w-4 h-4 text-primary" />
              {preferences.selectedTags.slice(0, 5).map(tag => (
                <span 
                  key={tag} 
                  className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                  data-testid={`active-tag-${tag}`}
                >
                  {tag}
                </span>
              ))}
              {preferences.selectedTags.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{preferences.selectedTags.length - 5} mais
                </span>
              )}
            </div>
          )}
        </section>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder="Buscar por tema..." 
              className="pl-10 h-12 text-lg bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-input"
            />
          </div>
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
          <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" data-testid="filter-button">
            <Filter className="w-6 h-6" />
          </Button>
        </div>

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
                  {preferences.selectedTags.length > 0 
                    ? "Nenhuma notícia encontrada para suas categorias selecionadas."
                    : "Nenhuma notícia encontrada com esses filtros."
                  }
                </p>
                <Button variant="link" onClick={() => setSearchTerm("")} className="mt-2 text-lg" data-testid="clear-search-button">
                  Limpar busca
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
