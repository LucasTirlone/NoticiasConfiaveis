import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ScrollText } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <ScrollText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">Termos de Uso</h1>
            <p className="text-muted-foreground text-sm">Sentinela IA — Última atualização: abril de 2026</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao criar uma conta ou utilizar o Sentinela IA, você concorda com estes Termos de Uso e com a nossa Política de Privacidade. Se não concordar com qualquer parte destes termos, não utilize o serviço.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Sentinela IA é uma plataforma de agregação de notícias que monitora fontes públicas e confiáveis, utiliza inteligência artificial para filtrar informações de alto impacto e as apresenta ao usuário de forma resumida em português brasileiro.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              O serviço é fornecido "como está", sem garantias de disponibilidade ininterrupta. Podemos interromper, modificar ou encerrar o serviço a qualquer momento, com ou sem aviso prévio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Sua Conta</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Você é responsável por manter a confidencialidade de sua senha.</li>
              <li>Você não pode criar contas para outros sem autorização explícita.</li>
              <li>Cada pessoa pode ter apenas uma conta.</li>
              <li>Notifique-nos imediatamente se suspeitar de uso não autorizado de sua conta.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Uso Aceitável</h2>
            <p className="text-muted-foreground leading-relaxed">Você concorda em não:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Usar o serviço para qualquer finalidade ilegal ou não autorizada.</li>
              <li>Tentar acessar sistemas ou áreas restritas do aplicativo.</li>
              <li>Fazer scraping automatizado do conteúdo em larga escala.</li>
              <li>Disseminar informações falsas usando o nome ou conteúdo do Sentinela IA.</li>
              <li>Interferir na infraestrutura ou segurança do serviço.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Conteúdo e Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Sentinela IA agrega notícias de fontes públicas. O conteúdo original das notícias pertence às respectivas fontes (BBC, Reuters, NASA, etc.). Os resumos gerados por IA são derivados desse conteúdo e ficam sujeitos à mesma atribuição.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              O código, design, marca e interface do Sentinela IA são propriedade exclusiva dos seus criadores, protegidos por leis de propriedade intelectual.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Isenção de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              Os resumos e classificações de notícias são gerados automaticamente por IA e podem conter imprecisões. O Sentinela IA não é um serviço de verificação de fatos (fact-checking) e não substitui fontes primárias. <strong className="text-foreground">Sempre verifique informações críticas nas fontes originais antes de agir sobre elas.</strong>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              Na máxima extensão permitida pela lei brasileira, o Sentinela IA não se responsabiliza por danos diretos, indiretos, incidentais ou consequentes decorrentes do uso ou incapacidade de uso do serviço.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Encerramento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você pode encerrar sua conta a qualquer momento nas Configurações. Podemos suspender ou encerrar contas que violem estes termos, com ou sem aviso prévio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Lei Aplicável e Foro</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes termos são regidos pelas leis da República Federativa do Brasil. Eventuais disputas serão resolvidas no foro da comarca de São Paulo — SP.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Alterações</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas dentro do aplicativo. O uso continuado após a notificação constitui aceite dos novos termos.
            </p>
          </section>

          <div className="border-t pt-6 text-center text-sm text-muted-foreground">
            © 2026 Sentinela IA. Todos os direitos reservados.{" "}
            <Link href="/privacy">
              <span className="underline cursor-pointer">Política de Privacidade</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
