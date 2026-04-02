import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import generatedIcon from "@assets/generated_images/app_icon_showing_a_shield_with_a_checkmark,_symbolizing_trusted_news.png";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-sm space-y-8"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src={generatedIcon}
            alt="Sentinela IA"
            className="w-16 h-16 rounded-2xl shadow-md"
          />
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">
              Sentinela IA
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Notícias verificadas. Informação confiável.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card border rounded-2xl shadow-sm p-6 space-y-5">
          <h2 className="text-xl font-semibold text-center">Entrar na sua conta</h2>

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2" role="alert">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email" className="text-base">E-mail</Label>
              <Input
                id="login-email"
                data-testid="input-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password" className="text-base">Senha</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 text-base pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="button-login-submit"
              className="w-full h-12 text-base font-semibold"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link href="/register">
              <span className="text-primary font-semibold hover:underline cursor-pointer" data-testid="link-go-register">
                Cadastrar-se
              </span>
            </Link>
          </div>
        </div>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <span>Seus dados estão protegidos. Consulte nossa{" "}
            <Link href="/privacy">
              <span className="underline cursor-pointer">Política de Privacidade</span>
            </Link>
          </span>
        </div>
      </motion.div>
    </div>
  );
}
