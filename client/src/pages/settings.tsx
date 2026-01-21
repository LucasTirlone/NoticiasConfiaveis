import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ShieldCheck, Eye, Bell, HelpCircle, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Settings() {
  const { preferences, updatePreferences } = useStore();

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-primary">Ajustes e Ajuda</h1>
        <p className="text-lg text-muted-foreground">
          Personalize sua experiência e entenda como o Verifica protege você.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Como Funciona Section */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Info className="w-6 h-6 text-primary" />
              Como o Verifica funciona?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-lg">
            <p>
              <strong>1. Monitoramento:</strong> Nosso sistema acompanha 24h por dia apenas fontes oficiais (como Defesa Civil, NASA, Institutos de Meteorologia) e grandes veículos de imprensa.
            </p>
            <p>
              <strong>2. Cruzamento de Dados:</strong> Se um boato surge na internet, nós verificamos se as fontes oficiais confirmam. 
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><span className="text-green-700 font-bold">Escudo Verde (Confiável):</span> Confirmado por múltiplas fontes oficiais.</li>
              <li><span className="text-blue-700 font-bold">Escudo Azul (Provável):</span> Noticiado por imprensa séria, mas aguardando nota oficial.</li>
              <li><span className="text-amber-700 font-bold">Lupa (Em Apuração):</span> Algo novo que estamos investigando. Tenha cautela.</li>
              <li><span className="text-red-700 font-bold">Escudo Vermelho (Falso):</span> Mentira ou golpe desmentido.</li>
            </ul>
            <p>
              <strong>3. Alerta Familiar:</strong> Quando algo é realmente perigoso, geramos um cartão fácil para você enviar no grupo da família.
            </p>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bell className="w-5 h-5" />
              Preferências de Alerta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="sensitivity" className="text-lg flex flex-col">
                <span>Nível de Sensibilidade</span>
                <span className="font-normal text-muted-foreground text-base">Quais notícias você quer ver?</span>
              </Label>
              <Select 
                value={preferences.sensitivity} 
                onValueChange={(v: any) => updatePreferences({ sensitivity: v })}
              >
                <SelectTrigger className="w-[180px] h-12 text-lg">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tudo (Recomendado)</SelectItem>
                  <SelectItem value="critical_only">Só Emergências</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-muted p-4 rounded-lg text-muted-foreground text-sm">
              * Você pode alterar os temas de interesse (tempestades, saúde, etc) refazendo o cadastro inicial.
              <Button variant="link" className="px-1 text-primary h-auto font-bold" onClick={() => updatePreferences({ onboardingCompleted: false })}>
                Refazer Cadastro
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Eye className="w-5 h-5" />
              Acessibilidade Visual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="contrast" className="text-lg flex flex-col">
                <span>Alto Contraste</span>
                <span className="font-normal text-muted-foreground text-base">Melhora a leitura para visão cansada</span>
              </Label>
              <Switch 
                id="contrast" 
                checked={preferences.highContrast}
                onCheckedChange={(c) => updatePreferences({ highContrast: c })}
                className="scale-125 mr-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
