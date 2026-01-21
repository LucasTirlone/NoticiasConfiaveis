import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sparkles, Bell, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function Onboarding() {
  const { markOnboardingComplete } = useStore();
  const [, setLocation] = useLocation();

  const handleFinish = () => {
    markOnboardingComplete();
    setLocation("/");
  };

  const features = [
    {
      icon: ShieldCheck,
      title: "Notícias Verificadas",
      description: "Acompanhe apenas informações de fontes confiáveis como agências oficiais e veículos de imprensa reconhecidos."
    },
    {
      icon: Sparkles,
      title: "Resumos com IA",
      description: "Cada notícia tem um resumo simplificado gerado por inteligência artificial para facilitar o entendimento."
    },
    {
      icon: Bell,
      title: "Filtros Personalizados",
      description: "Escolha os temas de nossa lista de assuntos que mais importam a você."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl flex flex-col justify-center gap-8">
        <motion.div 
          className="text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-primary font-bold">
            Verifica
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Sua fonte confiável de notícias verificadas sobre eventos naturais e emergências.
          </p>
        </motion.div>

        <div className="space-y-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="bg-card border rounded-2xl p-5 flex items-start gap-4 shadow-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
            <CheckCircle2 className="w-5 h-5" />
            Como usar
          </h3>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span>Na tela inicial, você verá as notícias mais recentes com selos de confiabilidade.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span>Use os filtros para ver apenas os temas que interessam a você.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>Clique em uma notícia para ver o resumo simplificado e acessar a fonte original.</span>
            </li>
          </ul>
        </motion.div>

        <motion.div
          className="pt-4 pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Button 
            size="lg" 
            className="w-full text-xl h-16 font-bold shadow-lg bg-primary hover:bg-primary/90" 
            onClick={handleFinish}
            data-testid="button-comecar"
          >
            Começar a Usar
            <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
