import { useStore } from "@/lib/store";
import { useRoute, Link } from "wouter";
import { TrustBadge as BadgeComponent } from "@/components/TrustBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Detail() {
  const [, params] = useRoute("/news/:id");
  const { feed } = useStore();
  const item = feed.find(n => n.id === params?.id);

  if (!item) return <div className="p-8 text-center text-xl">Notícia não encontrada.</div>;

  const isCritical = item.alertLevel === "critical" || item.alertLevel === "warning";

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: `Verifica Alert: ${item.summary}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert("Link copiado para a área de transferência!");
      navigator.clipboard.writeText(`${item.title} - ${window.location.href}`);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <Link href="/">
        <Button variant="ghost" className="pl-0 text-lg hover:bg-transparent hover:text-primary">
          <ArrowLeft className="mr-2 h-6 w-6" />
          Voltar para o Início
        </Button>
      </Link>

      <article className="space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <BadgeComponent level={item.reliability} />
            <span className="text-muted-foreground font-medium">
              {format(new Date(item.timestamp), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
            </span>
          </div>
          
          <h1 className={`text-3xl md:text-4xl font-serif font-bold leading-tight ${isCritical ? 'text-destructive' : 'text-foreground'}`}>
            {item.title}
          </h1>

          {/* Critical Alert Box */}
          {isCritical && (
            <div className="bg-destructive/10 border-2 border-destructive/20 rounded-xl p-4 flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-destructive shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-destructive text-lg">Alerta de Atenção</h3>
                <p className="text-destructive/80 font-medium">Esta é uma situação em desenvolvimento que requer cuidados.</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-xl md:text-2xl leading-relaxed font-medium text-foreground/90">
            {item.summary}
          </p>
          <div className="my-8 border-l-4 border-primary/30 pl-6 py-2 bg-primary/5 rounded-r-xl">
            <h3 className="text-primary font-bold text-lg mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Explicação Simples
            </h3>
            <p className="text-lg text-foreground/80">
              {item.fullContent}
            </p>
          </div>
        </div>

        {/* Verification Section */}
        <Card className="bg-secondary/20 border-secondary">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-xl flex items-center gap-2">
              Por que isso é confiável?
            </h3>
            <p className="text-lg">{item.whyReliable}</p>
            
            <div className="space-y-2 mt-4">
              <h4 className="font-semibold text-muted-foreground uppercase text-sm tracking-wider">Fontes Analisadas</h4>
              <ul className="space-y-2">
                {item.sources.map(source => (
                  <li key={source.id} className="flex items-center justify-between bg-background p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${source.trusted ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="font-medium">{source.name}</span>
                      <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full uppercase">{source.type}</span>
                    </div>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center text-sm font-bold">
                      Ver Original <ExternalLink className="ml-1 w-4 h-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </article>

      {/* Floating Action Button for Sharing */}
      <div className="fixed bottom-6 right-6 z-50 md:sticky md:bottom-6 md:float-right">
        <Button 
          size="lg" 
          className="rounded-full shadow-xl h-16 w-16 md:w-auto md:px-8 md:h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg"
          onClick={handleShare}
        >
          <Share2 className="w-6 h-6 md:mr-2" />
          <span className="hidden md:inline">Compartilhar Alerta</span>
        </Button>
      </div>
    </div>
  );
}
