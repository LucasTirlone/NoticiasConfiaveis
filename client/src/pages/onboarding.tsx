import { useStore, AVAILABLE_TAGS } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Onboarding() {
  const { toggleTag, preferences, markOnboardingComplete } = useStore();
  const [, setLocation] = useLocation();

  const handleFinish = () => {
    markOnboardingComplete();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl flex flex-col gap-8">
        <div className="text-center space-y-4 mt-8">
          <h1 className="text-3xl md:text-4xl font-serif text-primary font-bold">
            Bem-vindo ao Verifica
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Selecione os assuntos que você deseja acompanhar. Nós avisaremos apenas quando houver notícias confiáveis.
          </p>
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
            Escolha seus interesses:
          </h2>
          
          <ScrollArea className="h-[40vh] border rounded-xl p-4 bg-card shadow-inner">
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_TAGS.map(tag => {
                const isSelected = preferences.selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`
                      px-4 py-3 rounded-full border-2 text-lg font-medium transition-all flex items-center gap-2
                      ${isSelected 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-background border-input hover:border-primary/50 text-muted-foreground'}
                    `}
                  >
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    {isSelected && <Check className="w-5 h-5" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="pt-4 pb-8 sticky bottom-0 bg-background border-t">
          <Button 
            size="lg" 
            className="w-full text-xl h-16 font-bold shadow-lg" 
            onClick={handleFinish}
          >
            Começar a Usar
            <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
          <p className="text-center text-muted-foreground mt-4 text-sm">
            Você poderá alterar isso depois em Ajustes.
          </p>
        </div>
      </div>
    </div>
  );
}
