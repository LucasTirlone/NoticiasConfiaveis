import { ReliabilityLevel } from "@/lib/store";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  level: ReliabilityLevel;
  className?: string;
  showLabel?: boolean;
}

export function TrustBadge({ level, className, showLabel = true }: TrustBadgeProps) {
  const config = {
    high: {
      icon: ShieldCheck,
      text: "Confiável",
      color: "text-green-700 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
      border: "border-green-200 dark:border-green-800",
      desc: "Confirmado por múltiplas fontes oficiais."
    },
    medium: {
      icon: ShieldCheck, // Still a check, but neutral
      text: "Verificada",
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      border: "border-blue-200 dark:border-blue-800",
      desc: "Verificada pelo Sentinela IA com base em fontes de imprensa reconhecidas."
    },
    low: {
      icon: ShieldAlert,
      text: "Falso/Baixo",
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
      border: "border-red-200 dark:border-red-800",
      desc: "Fonte desconhecida ou desmentida."
    },
    investigating: {
      icon: Search,
      text: "Em Apuração",
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
      border: "border-amber-200 dark:border-amber-800",
      desc: "Informação recente, tenha cautela."
    }
  };

  const current = config[level];
  const Icon = current.icon;

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-full border w-fit font-bold shadow-sm",
        current.bg,
        current.border,
        current.color,
        className
      )}
      title={current.desc}
    >
      <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
      {showLabel && <span className="uppercase tracking-wide text-xs md:text-sm">{current.text}</span>}
    </div>
  );
}
