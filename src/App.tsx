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
import RoleGuard from "./components/auth/RoleGuard";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />

        <Route
          path="/dashboard"
          element={
            <RoleGuard allowedRoles={["admin", "cashier", "security", "member"]}>
              <Dashboard />
            </RoleGuard>
          }
        />

        <Route
          path="/members/new"
          element={
            <RoleGuard allowedRoles={["admin"]}>
              <NewMember />
            </RoleGuard>
          }
        />

        <Route
          path="/members"
          element={
            <RoleGuard allowedRoles={["admin"]}>
              <MembersList />
            </RoleGuard>
          }
        />

        <Route
          path="/members/profile"
          element={
            <RoleGuard allowedRoles={["admin", "member"]}>
              <MemberProfile />
            </RoleGuard>
          }
        />

        <Route
          path="/security/qr/validate"
          element={
            <RoleGuard allowedRoles={["admin", "security"]}>
              <QrValidation />
            </RoleGuard>
          }
        />

        <Route
          path="/security/qr/scan"
          element={
            <RoleGuard allowedRoles={["admin", "security"]}>
              <QrScannerPage />
            </RoleGuard>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
