import { Switch, Route, useLocation } from "wouter";
import { StoreProvider, useStore } from "@/lib/store";
import { Layout } from "@/components/Layout";
import Onboarding from "@/pages/onboarding";
import Feed from "@/pages/feed";
import Detail from "@/pages/detail";
import Sources from "@/pages/sources";
import NotFound from "@/pages/not-found";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";

import Settings from "@/pages/settings";

// Wrapper to handle redirection logic
function AppContent() {
  const { preferences } = useStore();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // If onboarding is not complete, redirect to onboarding
    // Unless we are already there
    if (!preferences.onboardingCompleted && location !== "/onboarding") {
      setLocation("/onboarding");
    }
  }, [preferences.onboardingCompleted, location, setLocation]);

  // Layout is hidden on onboarding page for immersion
  if (location === "/onboarding") {
    return <Route path="/onboarding" component={Onboarding} />;
  }

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
    <StoreProvider>
      <AppContent />
      <Toaster />
    </StoreProvider>
  );
}

export default App;
