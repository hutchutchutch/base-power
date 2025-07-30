import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PhotoVerification from "@/pages/photo-verification";
import SurveyVerification from "@/pages/survey-verification";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";

interface AdminUser {
  id: string;
  email: string;
  name: string;
}

function Router() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [, setLocation] = useLocation();

  // Check for stored admin session on app load
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (storedAdmin) {
      try {
        setAdmin(JSON.parse(storedAdmin));
      } catch {
        localStorage.removeItem('admin');
      }
    }
  }, []);

  const handleAdminLogin = (adminUser: AdminUser) => {
    setAdmin(adminUser);
  };

  const handleAdminLogout = () => {
    setAdmin(null);
    localStorage.removeItem('admin');
    setLocation('/admin');
  };

  return (
    <Switch>
      {/* Demo photo verification (original) */}
      <Route path="/" component={PhotoVerification} />
      <Route path="/photo-verification" component={PhotoVerification} />
      
      {/* Survey verification with token */}
      <Route path="/survey/:token">
        {(params) => <SurveyVerification token={params.token} />}
      </Route>
      
      {/* Admin routes */}
      <Route path="/admin">
        {admin ? (
          <AdminDashboard admin={admin} onLogout={handleAdminLogout} />
        ) : (
          <AdminLogin onLogin={handleAdminLogin} />
        )}
      </Route>
      
      <Route path="/admin/dashboard">
        {admin ? (
          <AdminDashboard admin={admin} onLogout={handleAdminLogout} />
        ) : (
          <AdminLogin onLogin={handleAdminLogin} />
        )}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
