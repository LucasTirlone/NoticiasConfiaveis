import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
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
import { ShieldCheck, Eye, Bell, Info, ScrollText, LogOut, User, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { preferences, updatePreferences } = useStore();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success("Até logo!");
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-primary">Ajustes</h1>
        <p className="text-lg text-muted-foreground">
          Personalize sua experiência no Sentinela IA.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Account Section */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="w-5 h-5" />
                Sua Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-foreground">{user.displayName}</span>
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>
              <Button
                variant="outline"
                className="w-full h-11 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleLogout}
                data-testid="button-logout-settings"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair da conta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Como Funciona Section */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Info className="w-6 h-6 text-primary" />
              Como o Sentinela IA funciona?
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
                data-testid="switch-high-contrast"
              />
            </div>
          </CardContent>
        </Card>

        {/* Legal Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="w-5 h-5" />
              Privacidade e Termos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/privacy">
              <div className="flex items-center justify-between py-3 px-1 border-b cursor-pointer hover:text-primary transition-colors" data-testid="link-privacy-policy">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Política de Privacidade</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
            <Link href="/terms">
              <div className="flex items-center justify-between py-3 px-1 cursor-pointer hover:text-primary transition-colors" data-testid="link-terms">
                <div className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-primary" />
                  <span className="font-medium">Termos de Uso</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Sentinela IA — versão 2.0 · © 2026
        </p>
      </div>
    </div>
  );
}
