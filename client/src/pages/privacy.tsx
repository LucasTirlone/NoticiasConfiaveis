import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function Privacy() {
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
          <ShieldCheck className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">Política de Privacidade</h1>
            <p className="text-muted-foreground text-sm">Sentinela IA — Última atualização: abril de 2026</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Quem somos</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Sentinela IA é um aplicativo de agregação e verificação de notícias que utiliza inteligência artificial (Google Gemini) para filtrar, traduzir e resumir informações de fontes públicas e confiáveis. Operamos exclusivamente no Brasil.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Dados que coletamos</h2>
            <p className="text-muted-foreground leading-relaxed">Coletamos apenas:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">E-mail e nome:</strong> fornecidos voluntariamente no cadastro, para identificar sua conta.</li>
              <li><strong className="text-foreground">Senha:</strong> armazenada de forma criptografada (hash) — nunca em texto simples.</li>
              <li><strong className="text-foreground">Preferências de uso:</strong> temas de interesse, configurações de acessibilidade e sensibilidade de alertas — salvas localmente no seu dispositivo e vinculadas à sua conta.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Não coletamos</strong> dados de localização, contatos, câmera, microfone, histórico de navegação ou qualquer outra informação sensível.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Como usamos seus dados</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Autenticar e manter sua sessão de forma segura.</li>
              <li>Personalizar seu feed de acordo com seus interesses.</li>
              <li>Enviar alertas sobre notícias relevantes (quando habilitado).</li>
              <li>Melhorar a qualidade do serviço com dados agregados e anonimizados.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Compartilhamento de dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Não vendemos, alugamos nem compartilhamos</strong> seus dados pessoais com terceiros para fins comerciais. Seus dados podem ser processados por:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Google (Gemini AI):</strong> os resumos de notícias são gerados via API do Google. Os textos das notícias são enviados, mas nunca seu nome, e-mail ou dados pessoais.</li>
              <li><strong className="text-foreground">Infraestrutura de hospedagem (Replit):</strong> onde o aplicativo e o banco de dados são mantidos com segurança.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Seus direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed">
              Em conformidade com a <strong className="text-foreground">Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>, você tem direito a:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Acessar os dados que temos sobre você.</li>
              <li>Corrigir informações incorretas.</li>
              <li>Solicitar a exclusão da sua conta e todos os seus dados.</li>
              <li>Revogar o consentimento a qualquer momento.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Para exercer esses direitos, entre em contato conosco pelas Configurações do aplicativo ou pelo e-mail de suporte.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos criptografia (scrypt) para senhas, cookies HTTPOnly para sessões, HTTPS em todo o tráfego e acesso restrito ao banco de dados. Nenhuma medida é 100% infalível, mas adotamos as melhores práticas disponíveis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Menores de idade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Sentinela IA não é direcionado a menores de 13 anos. Se você tem conhecimento de que uma criança cadastrou-se sem autorização, entre em contato conosco para remover os dados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Alterações a esta política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta política periodicamente. Quando fizermos alterações significativas, notificaremos você dentro do aplicativo. O uso continuado após a notificação implica aceite das mudanças.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Dúvidas ou solicitações relacionadas à privacidade? Entre em contato pela seção de Ajustes do aplicativo. Respondemos em até 15 dias úteis, conforme exigido pela LGPD.
            </p>
          </section>

          <div className="border-t pt-6 text-center text-sm text-muted-foreground">
            © 2026 Sentinela IA. Todos os direitos reservados.{" "}
            <Link href="/terms">
              <span className="underline cursor-pointer">Termos de Uso</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
