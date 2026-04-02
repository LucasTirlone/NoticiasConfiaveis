import { Switch, Route, useLocation } from "wouter";
import { StoreProvider, useStore } from "@/lib/store";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import Onboarding from "@/pages/onboarding";
import Feed from "@/pages/feed";
import Detail from "@/pages/detail";
import Sources from "@/pages/sources";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";

function AppContent() {
  const { preferences } = useStore();
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const publicRoutes = ["/login", "/register", "/privacy", "/terms"];
  const isPublicRoute = publicRoutes.includes(location);

  useEffect(() => {
    if (isLoading) return;

    // Not authenticated → send to login (unless already on a public route)
    if (!user && !isPublicRoute) {
      setLocation("/login");
      return;
    }

    // Authenticated but onboarding not done → send to onboarding
    if (user && preferences.onboardingCompleted === false && location !== "/onboarding") {
      setLocation("/onboarding");
      return;
    }
  }, [user, isLoading, preferences.onboardingCompleted, location, setLocation, isPublicRoute]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Public routes — no Layout
  if (isPublicRoute) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
      </Switch>
    );
  }

  // Onboarding — no Layout
  if (location === "/onboarding") {
    return <Route path="/onboarding" component={Onboarding} />;
  }

  if (!user) return null;

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Feed} />
        <Route path="/news/:id" component={Detail} />
        <Route path="/sources" component={Sources} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppContent />
        <Toaster />
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
