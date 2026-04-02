import { NewsItem } from "@/lib/store";
import { TrustBadge } from "./TrustBadge";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";

const alertLevelBorder: Record<string, string> = {
  critical: "border-l-[5px] border-l-red-500",
  warning:  "border-l-[5px] border-l-amber-500",
  info:     "border-l-[5px] border-l-blue-500",
  normal:   "border-l-[5px] border-l-border",
};

const alertLevelBg: Record<string, string> = {
  critical: "bg-red-50/50 dark:bg-red-950/20",
  warning:  "bg-amber-50/50 dark:bg-amber-950/20",
  info:     "bg-blue-50/30 dark:bg-blue-950/10",
  normal:   "bg-card",
};

export function NewsCard({ item }: { item: NewsItem }) {
  const level = item.alertLevel ?? "normal";
  const isCritical = level === "critical";
  const isWarning = level === "warning";
  const isUrgent = isCritical || isWarning;

  const timeAgo = formatDistanceToNow(new Date(item.timestamp), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <Link href={`/news/${item.id}`} aria-label={`Ler notícia: ${item.title}`}>
      <article
        data-testid={`card-news-${item.id}`}
        className={`
          group relative rounded-xl border border-border shadow-sm
          hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden
          ${alertLevelBorder[level] ?? alertLevelBorder.normal}
          ${alertLevelBg[level] ?? alertLevelBg.normal}
        `}
      >
        <div className="p-4 space-y-3">
          {/* Top Row: Badges + Time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <TrustBadge level={item.reliability} />
              {item.sources[0] && (
                <span className="text-xs font-medium text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                  {item.sources[0].name}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Clock className="w-3 h-3" aria-hidden />
              <time dateTime={new Date(item.timestamp).toISOString()}>{timeAgo}</time>
            </span>
          </div>

          {/* Headline */}
          <h3 className={`font-serif font-bold leading-snug text-base md:text-lg ${isCritical ? "text-red-700 dark:text-red-400" : isWarning ? "text-amber-800 dark:text-amber-400" : "text-foreground"}`}>
            {isUrgent && (
              <AlertTriangle
                className={`inline w-4 h-4 mr-1.5 mb-0.5 ${isCritical ? "text-red-500" : "text-amber-500"}`}
                aria-hidden
              />
            )}
            {item.title}
          </h3>

          {/* Summary */}
          <p className="text-sm text-foreground/75 line-clamp-3 leading-relaxed">
            {item.summary.length > 220 ? item.summary.slice(0, 220) + "…" : item.summary}
          </p>

          {/* Bottom Row: Tags + CTA */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="flex gap-1.5 flex-wrap">
              {item.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-[10px] uppercase font-semibold tracking-wide text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{item.tags.length - 3}
                </span>
              )}
            </div>

            <span className="flex items-center gap-1 text-xs text-primary font-semibold group-hover:gap-2 transition-all">
              Ler <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
