import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import generatedIcon from "@assets/generated_images/app_icon_showing_a_shield_with_a_checkmark,_symbolizing_trusted_news.png";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caracteres", ok: password.length >= 8 },
    { label: "Letra maiúscula", ok: /[A-Z]/.test(password) },
    { label: "Número", ok: /[0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="flex gap-3 flex-wrap mt-1">
      {checks.map(c => (
        <span
          key={c.label}
          className={`flex items-center gap-1 text-xs ${c.ok ? "text-green-600" : "text-muted-foreground"}`}
        >
          <CheckCircle2 className={`w-3 h-3 ${c.ok ? "text-green-600" : "text-muted-foreground/40"}`} />
          {c.label}
        </span>
      ))}
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!acceptTerms) {
      setError("Você deve aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password) || password.length < 8) {
      setError("Sua senha não atende aos requisitos mínimos.");
      return;
    }
    setLoading(true);
    try {
      await register(email, displayName, password);
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta. Tente novamente.");
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
              Crie sua conta. É grátis.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card border rounded-2xl shadow-sm p-6 space-y-5">
          <h2 className="text-xl font-semibold text-center">Criar conta</h2>

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2" role="alert">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-name" className="text-base">Seu nome</Label>
              <Input
                id="reg-name"
                data-testid="input-display-name"
                type="text"
                placeholder="Como quer ser chamado?"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                autoComplete="name"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-email" className="text-base">E-mail</Label>
              <Input
                id="reg-email"
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
              <Label htmlFor="reg-password" className="text-base">Senha</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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
              <PasswordStrength password={password} />
            </div>

            <div className="flex items-start gap-3 pt-1">
              <Checkbox
                id="accept-terms"
                data-testid="checkbox-accept-terms"
                checked={acceptTerms}
                onCheckedChange={v => setAcceptTerms(Boolean(v))}
                className="mt-0.5"
              />
              <label htmlFor="accept-terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                Li e aceito os{" "}
                <Link href="/terms">
                  <span className="text-primary underline">Termos de Uso</span>
                </Link>{" "}
                e a{" "}
                <Link href="/privacy">
                  <span className="text-primary underline">Política de Privacidade</span>
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              data-testid="button-register-submit"
              className="w-full h-12 text-base font-semibold"
              disabled={loading || !acceptTerms}
            >
              {loading ? "Criando conta..." : "Criar conta grátis"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login">
              <span className="text-primary font-semibold hover:underline cursor-pointer" data-testid="link-go-login">
                Entrar
              </span>
            </Link>
          </div>
        </div>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <span>Nunca compartilhamos seus dados com terceiros.</span>
        </div>
      </motion.div>
    </div>
  );
}
