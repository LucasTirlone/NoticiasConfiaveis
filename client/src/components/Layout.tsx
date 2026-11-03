import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Settings, Home, List, Moon, Sun, Type, RefreshCw, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReactNode } from "react";
import { toast } from "sonner";
import generatedIcon from "@assets/generated_images/app_icon_showing_a_shield_with_a_checkmark,_symbolizing_trusted_news.png";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { preferences, updatePreferences, refreshFeed, isLoading } = useStore();
  const { user, isAdmin, logout } = useAuth();

  const isHighContrast = preferences.highContrast;
  const textSize = preferences.textSize;

  const toggleContrast = () => updatePreferences({ highContrast: !isHighContrast });
  const setSize = (size: "normal" | "large" | "extra_large") => updatePreferences({ textSize: size });

  const handleRefreshFeed = async () => {
    try {
      await refreshFeed();
      toast.success("Feed atualizado com sucesso!");
    } catch {
      toast.error("Erro ao atualizar o feed");
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Até logo!");
  };

  const initials = user?.displayName
    ? user.displayName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur-sm shadow-sm h-14 md:h-16 flex items-center px-4 justify-between">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer group">
            <img
              src={generatedIcon}
              alt="Logo"
              className="w-8 h-8 md:w-9 md:h-9 rounded-lg group-hover:opacity-90 transition-opacity"
            />
            <div className="flex flex-col leading-none">
              <span className="font-serif font-bold text-base md:text-lg text-primary tracking-tight">
                Sentinela IA
              </span>
              <span className="text-[10px] text-muted-foreground font-medium hidden md:block uppercase tracking-widest">
                Notícias Verificadas
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Refresh Button — admin only */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshFeed}
              disabled={isLoading}
              className="text-muted-foreground hover:text-primary w-9 h-9"
              title="Atualizar notícias"
              data-testid="button-refresh-feed"
              aria-label="Atualizar notícias"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          )}

          {/* Text / Accessibility Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 text-muted-foreground hover:text-primary"
                title="Ajustes de leitura"
                data-testid="button-text-settings"
                aria-label="Ajustes de leitura"
              >
                <Type className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                Tamanho do Texto
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSize("normal")} data-testid="menu-item-text-normal">
                Normal {textSize === "normal" && "✓"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSize("large")} data-testid="menu-item-text-large">
                Grande (L) {textSize === "large" && "✓"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSize("extra_large")} data-testid="menu-item-text-xlarge">
                Muito Grande (XL) {textSize === "extra_large" && "✓"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={toggleContrast}
                className="flex items-center justify-between"
                data-testid="menu-item-toggle-contrast"
              >
                <span>Alto Contraste</span>
                {isHighContrast ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-sm"
                data-testid="button-user-menu"
                aria-label="Menu do usuário"
              >
                {initials}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground truncate">{user?.displayName ?? "Usuário"}</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <div className="flex items-center gap-2 w-full cursor-pointer" data-testid="link-settings-menu">
                    <Settings className="w-4 h-4" />
                    Configurações
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 container mx-auto px-4 py-5 max-w-3xl pb-28" role="main">
        {children}
      </main>

      {/* BOTTOM NAV */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t h-16 pb-safe flex items-center justify-around shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
        aria-label="Navegação principal"
      >
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${location === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="link-home"
          aria-label="Início"
          aria-current={location === "/" ? "page" : undefined}
        >
          <Home className={`w-6 h-6 ${location === "/" ? "fill-primary/20" : ""}`} />
          <span className="text-[11px] font-semibold">Início</span>
        </Link>

        {isAdmin && (
          <Link
            href="/sources"
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${location === "/sources" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            data-testid="link-sources"
            aria-label="Fontes"
            aria-current={location === "/sources" ? "page" : undefined}
          >
            <List className={`w-6 h-6 ${location === "/sources" ? "fill-primary/20" : ""}`} />
            <span className="text-[11px] font-semibold">Fontes</span>
          </Link>
        )}

        <Link
          href="/settings"
          className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${location === "/settings" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="link-settings"
          aria-label="Ajustes"
          aria-current={location === "/settings" ? "page" : undefined}
        >
          <Settings className={`w-6 h-6 ${location === "/settings" ? "fill-primary/20" : ""}`} />
          <span className="text-[11px] font-semibold">Ajustes</span>
        </Link>
      </nav>
    </div>
  );
}
