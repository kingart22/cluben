import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import MemberProfile from "./pages/MemberProfile";
import QrValidation from "./pages/QrValidation";
import QrScannerPage from "./pages/QrScanner";
import NewMember from "./pages/NewMember";
import MembersList from "./pages/MembersList";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/members/new" element={<NewMember />} />
        <Route path="/members" element={<MembersList />} />
        <Route path="/members/profile" element={<MemberProfile />} />
        <Route path="/security/qr/validate" element={<QrValidation />} />
        <Route path="/security/qr/scan" element={<QrScannerPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
