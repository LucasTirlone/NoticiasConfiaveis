import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Settings, Home, List, Moon, Sun, Type, RefreshCw, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReactNode } from "react";
import generatedIcon from "@assets/generated_images/app_icon_showing_a_shield_with_a_checkmark,_symbolizing_trusted_news.png";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { preferences, updatePreferences, refreshFeed, isLoading } = useStore();

  const isHighContrast = preferences.highContrast;
  const textSize = preferences.textSize;

  const toggleContrast = () => {
    updatePreferences({ highContrast: !isHighContrast });
  };

  const setSize = (size: "normal" | "large" | "extra_large") => {
    updatePreferences({ textSize: size });
  };

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300`}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm h-16 md:h-20 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={generatedIcon} alt="Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-lg" />
              <span className="font-serif font-bold text-xl md:text-2xl text-primary tracking-tight">Verifica</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={refreshFeed} 
            disabled={isLoading}
            className="text-muted-foreground hover:text-primary"
            title="Atualizar Notícias"
          >
            <RefreshCw className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Accessibility Controls */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="border-primary/20" title="Ajustes de Leitura">
                <Type className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Tamanho do Texto</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSize("normal")}>
                Normal
                {textSize === "normal" && " ✓"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSize("large")}>
                Grande (L)
                {textSize === "large" && " ✓"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSize("extra_large")}>
                Muito Grande (XL)
                {textSize === "extra_large" && " ✓"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleContrast} className="flex items-center justify-between">
                <span>Alto Contraste</span>
                {isHighContrast ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl">
        {children}
      </main>

      {/* BOTTOM NAV (Mobile First) */}
      <nav className="sticky bottom-0 z-50 w-full bg-card border-t h-20 md:h-24 pb-2 flex items-center justify-around md:justify-center md:gap-12 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <Link 
          href="/" 
          className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer ${location === '/' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
        >
          <Home className="w-7 h-7 mb-1" />
          <span className="text-xs font-semibold">Início</span>
        </Link>
        
        <Link 
          href="/sources" 
          className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer ${location === '/sources' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
        >
          <List className="w-7 h-7 mb-1" />
          <span className="text-xs font-semibold">Fontes</span>
        </Link>
        
        <Link 
          href="/settings" 
          className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer ${location === '/settings' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
        >
          <Settings className="w-7 h-7 mb-1" />
          <span className="text-xs font-semibold">Ajustes</span>
        </Link>
      </nav>
    </div>
  );
}
