/* CropWise — Monsoon Field Notes: keep the app shell quiet so the field dashboard carries the story. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SharedScan from "./pages/SharedScan";
import SignIn from "./pages/SignIn";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import AuthRetry from "./pages/AuthRetry";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return <Switch><Route path="/" component={Home} /><Route path="/dashboard" component={Home} /><Route path="/sign-in" component={SignIn} /><Route path="/reset-password" component={ResetPassword} /><Route path="/auth-retry" component={AuthRetry} /><Route path="/account" component={Account} /><Route path="/scan/:slug" component={SharedScan} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

function LocalizedApplication() {
  const { t } = useLanguage();
  return <ErrorBoundary errorTitle={t("unexpectedError")} reloadLabel={t("reloadPage")}><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default function App() {
  return <LanguageProvider><LocalizedApplication /></LanguageProvider>;
}
