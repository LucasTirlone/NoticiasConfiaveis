import { NewsItem } from "@/lib/store";
import { TrustBadge } from "./TrustBadge";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ChevronRight, Clock } from "lucide-react";

export function NewsCard({ item }: { item: NewsItem }) {
  const isCritical = item.alertLevel === "critical" || item.alertLevel === "warning";

  return (
    <Link href={`/news/${item.id}`}>
      <div 
        className={`
          group relative flex flex-col gap-3 p-5 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer bg-card
          ${isCritical ? 'border-destructive/30 bg-destructive/5' : 'border-border hover:border-primary/30'}
        `}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TrustBadge level={item.reliability} />
            {item.sources[0] && (
              <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                {item.sources[0].name}
              </span>
            )}
          </div>
          <span className="text-muted-foreground text-sm flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-md shrink-0">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ptBR })}
          </span>
        </div>

        <div className="space-y-2">
          <h3 className={`font-serif font-bold leading-tight ${isCritical ? 'text-destructive' : 'text-foreground'}`}>
            {isCritical && <AlertTriangle className="inline w-6 h-6 mr-2 mb-1" />}
            {item.title}
          </h3>
          <p className="text-base text-muted-foreground line-clamp-3 leading-relaxed">
            {item.summary}
          </p>
        </div>

        <div className="flex justify-between items-center mt-2 border-t pt-3 border-dashed border-border/50">
          <div className="flex gap-2 flex-wrap">
            {item.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs uppercase font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                {tag}
              </span>
            ))}
            {item.tags.length > 2 && <span className="text-xs text-muted-foreground self-center">+{item.tags.length - 2}</span>}
          </div>
          
          <div className="flex items-center text-primary font-bold text-sm group-hover:underline decoration-2 underline-offset-4">
            Ler tudo <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}
