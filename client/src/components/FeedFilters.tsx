import { useState } from "react";
import { CATEGORIES } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  CloudLightning,
  Globe2,
  Landmark,
  Minus,
  Orbit,
  Shield,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";

interface FeedFiltersProps {
  selectedTags: string[];
  toggleTheme: (themeId: string) => void;
  selectAllThemes: () => void;
  clearAllThemes: () => void;
  selectCategory: (categoryId: string) => void;
  deselectCategory: (categoryId: string) => void;
}

const categoryIcons: Record<string, LucideIcon> = {
  space: Orbit,
  natural: CloudLightning,
  biological: Activity,
  tech: Shield,
  geopolitics: Globe2,
  politics: Landmark,
};

export function FeedFilters({
  selectedTags,
  toggleTheme,
  selectAllThemes,
  clearAllThemes,
  selectCategory,
  deselectCategory,
}: FeedFiltersProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const totalThemes = CATEGORIES.reduce((sum, category) => sum + category.themes.length, 0);

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories(current =>
      current.includes(categoryId)
        ? current.filter(id => id !== categoryId)
        : [...current, categoryId],
    );
  };

  const panel = (
    <div className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="font-semibold leading-tight">Temas do feed</p>
          <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
            {selectedTags.length} de {totalThemes} temas selecionados
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={selectAllThemes}
            disabled={selectedTags.length === totalThemes}
            className="h-10 px-3"
            data-testid="select-all-button"
          >
            Selecionar todos
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearAllThemes}
            disabled={selectedTags.length === 0}
            className="h-10 w-10"
            aria-label="Limpar temas selecionados"
            title="Limpar seleção"
            data-testid="clear-all-button"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="max-h-[min(62vh,520px)] min-h-0 space-y-2 overflow-y-auto overscroll-contain p-3">
        {CATEGORIES.map(category => {
          const selectedCount = category.themes.filter(theme => selectedTags.includes(theme.id)).length;
          const fullySelected = selectedCount === category.themes.length;
          const partiallySelected = selectedCount > 0 && !fullySelected;
          const expanded = expandedCategories.includes(category.id);
          const Icon = categoryIcons[category.id] ?? SlidersHorizontal;

          return (
            <section key={category.id} className="overflow-hidden rounded-xl border bg-card">
              <div className={`flex min-h-14 items-center gap-2 px-3 ${selectedCount ? "bg-primary/[0.06]" : "bg-muted/20"}`}>
                <button
                  type="button"
                  onClick={() => toggleCategoryExpand(category.id)}
                  aria-expanded={expanded}
                  aria-controls={`feed-filter-category-${category.id}`}
                  className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary ring-1 ring-border/70">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium leading-snug">{category.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedCount} de {category.themes.length}
                    </span>
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
                    aria-hidden
                  />
                </button>
                <button
                  type="button"
                  onClick={() => fullySelected ? deselectCategory(category.id) : selectCategory(category.id)}
                  aria-label={`${fullySelected ? "Desmarcar" : "Selecionar"} todos os temas de ${category.name}`}
                  aria-checked={fullySelected ? true : partiallySelected ? "mixed" : false}
                  role="checkbox"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                    fullySelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : partiallySelected
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {fullySelected && <Check className="h-4 w-4" aria-hidden />}
                  {partiallySelected && <Minus className="h-4 w-4" aria-hidden />}
                </button>
              </div>

              {expanded && (
                <div id={`feed-filter-category-${category.id}`} className="border-t px-3 py-2">
                  <div className="divide-y">
                    {category.themes.map(theme => {
                      const checked = selectedTags.includes(theme.id);
                      return (
                        <label
                          key={theme.id}
                          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-muted/60 focus-within:ring-2 focus-within:ring-ring"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTheme(theme.id)}
                            className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                            data-testid={`theme-filter-${theme.id}`}
                          />
                          <span className="py-2 leading-snug">{theme.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );

  const trigger = (
    <Button
      type="button"
      variant="outline"
      className={`h-11 gap-2 border-primary/30 px-3.5 text-primary hover:bg-primary/5 ${selectedTags.length < totalThemes ? "bg-primary/[0.04]" : ""}`}
      aria-label={`Filtros, ${selectedTags.length} temas selecionados`}
      data-testid="feed-filters-trigger"
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      <span>Filtros</span>
      <span className="min-w-6 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-primary">
        {selectedTags.length}
      </span>
      <ChevronDown className="ml-0.5 h-3.5 w-3.5 opacity-65" aria-hidden />
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="flex max-h-[88dvh] w-full flex-col gap-0 overflow-hidden rounded-t-2xl p-0"
          aria-describedby="feed-filters-description"
        >
          <SheetHeader className="shrink-0 border-b px-4 py-4 pr-12 text-left">
            <SheetTitle className="text-lg">Filtrar notícias</SheetTitle>
            <SheetDescription id="feed-filters-description">
              Escolha os temas que deseja acompanhar.
            </SheetDescription>
          </SheetHeader>
          {panel}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex max-h-[min(80dvh,var(--radix-popover-content-available-height))] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border-border/80 bg-popover p-0 shadow-xl"
        aria-label="Filtros de notícias"
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}
