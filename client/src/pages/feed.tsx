import { useStore } from "@/lib/store";
import { NewsCard } from "@/components/NewsCard";
import { Button } from "@/components/ui/button";
import { Search, Filter, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Feed() {
  const { feed, isLoading, preferences } = useStore();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFeed = feed.filter(item => {
    // Filter by search
    if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase()) && !item.summary.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Filter by user preference (mock logic)
    if (preferences.sensitivity === "critical_only" && item.alertLevel === "info") {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Introduction Banner */}
      <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-2">
        <h1 className="text-2xl font-serif text-primary flex items-center justify-center gap-2">
          <ShieldCheck className="w-8 h-8" />
          Notícias Verificadas
        </h1>
        <p className="text-muted-foreground text-lg">
          Monitorando {feed.length} eventos em tempo real para você.
        </p>
      </section>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder="Buscar por tema..." 
            className="pl-10 h-12 text-lg bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" className="h-12 w-12 shrink-0">
          <Filter className="w-6 h-6" />
        </Button>
      </div>

      {/* Feed List */}
      {isLoading ? (
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
                transition={{ delay: idx * 0.1 }}
              >
                <NewsCard item={item} />
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Nenhuma notícia encontrada com esses filtros.</p>
              <Button variant="link" onClick={() => setSearchTerm("")} className="mt-2 text-lg">
                Limpar busca
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
