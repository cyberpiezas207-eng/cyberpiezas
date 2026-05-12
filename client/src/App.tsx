import { useAuth } from "./_core/hooks/useAuth";
import { useRouter } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import OfflineSalesAutoSync from "@/components/OfflineSalesAutoSync";
import { ThemeProvider } from "@/contexts/ThemeContext";
import BranchesManagement from "@/pages/BranchesManagement";
import CategoriesManagement from "@/pages/CategoriesManagement";
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import IncomeTracker from "@/pages/IncomeTracker";
import InventoryReports from "@/pages/InventoryReports";
import InvoicesAndPayments from "@/pages/InvoicesAndPayments";
import NotFound from "@/pages/NotFound";
import NotificationsCenter from "@/pages/NotificationsCenter";
import NotificationPreferences from "@/pages/NotificationPreferences";

import PayPalSubscriptionPlans from "@/pages/PayPalSubscriptionPlans";
import AdminPaymentReview from "@/pages/AdminPaymentReview";
import { OfflineSyncSettings } from "@/pages/OfflineSyncSettings";
import SubscriberManagement from "@/pages/SubscriberManagement";
import AdminCyberpiezas from "@/pages/AdminCyberpiezas";
import VeterinariaPOS from "@/pages/VeterinariaPOS";
import VeterinariaCajeros from "@/pages/VeterinariaCajeros";
import VeterinariaSubscription from "@/pages/VeterinariaSubscription";
import SubscriptionManagement from "@/pages/SubscriptionManagement";
import POS from "@/pages/POS";
import POSHardwareSettings from "@/pages/POSHardwareSettings";
import ProductsManagement from "@/pages/ProductsManagement";
import SalesHistory from "@/pages/SalesHistory";
import UsersManagement from "@/pages/UsersManagement";
import UserManagement from "@/pages/UserManagement";
import TermsAndConditions from "@/pages/TermsAndConditions";
import { LicenseRequest } from "@/pages/LicenseRequest";
import VariantsManagement from "@/pages/VariantsManagement";
import { CyberpiezasHome } from "@/pages/CyberpiezasHome";
import SubscriptionPage from "@/pages/SubscriptionPage";
import PublicStore from "@/pages/PublicStore";
import StoreCheckout from "@/pages/StoreCheckout";
import StoreOrdersPanel from "@/pages/StoreOrdersPanel";
import SystemsPanel from "@/pages/SystemsPanel";

import AbarrotesPOS from "@/pages/AbarrotesPOS";
import VerduleriaPOS from "@/pages/VerduleriaPOS";
import TarimaPublic from "@/pages/TarimaPublic";
import MiTarima from "@/pages/MiTarima";
import DVRQuotation from "@/pages/DVRQuotation";
import AbarrotesProductsManagement from "@/pages/AbarrotesProductsManagement";
import CELINE from "@/pages/CELINE";
import { Donations } from "@/pages/Donations";
import { CamerasStore } from "@/pages/CamerasStore";
import { SubscriptionsDashboard } from "@/pages/SubscriptionsDashboard";
import { UsageReports } from "@/pages/UsageReports";
import PricingPlans from "@/pages/PricingPlans";
import CheckoutPage from "@/pages/CheckoutPage";
import SubscriptionPanel from "@/pages/SubscriptionPanel";
import PaymentConfirmationPanel from "@/pages/PaymentConfirmationPanel";
import CajerosYUsuarios from "@/pages/CajerosYUsuarios";
import GestionAccesoSuscriptor from "@/pages/GestionAccesoSuscriptor";
import MySubscription from "@/pages/MySubscription";
import ReferralPanel from "@/pages/ReferralPanel";
import SubscribersManagement from "@/pages/SubscribersManagement";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";

function Router() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect unauthenticated users to home page
    if (!isAuthenticated && window.location.pathname === "/") {
      navigate("/home");
    }
  }, [isAuthenticated, navigate]);

  return (
    <Switch>
      <Route path="/sistemas" component={SystemsPanel} />
      <Route path="/cyberpiezas" component={CyberpiezasHome} />
      <Route path="/mis-ingresos" component={IncomeTracker} />
      <Route path="/" component={SystemsPanel} />
      <Route path="/dvr-quotation" component={DVRQuotation} />
      <Route path="/celine">
        <ProtectedRoute requiredProgram="celine">
          <CELINE />
        </ProtectedRoute>
      </Route>
      <Route path="/donations" component={Donations} />
      <Route path="/suscripcion" component={SubscriptionPage} />
      <Route path="/tienda/:slug" component={PublicStore} />
      <Route path="/tienda/:slug/checkout" component={StoreCheckout} />
      <Route path="/store-orders" component={StoreOrdersPanel} />
      <Route path="/cameras-store" component={CamerasStore} />
      <Route path="/subscriptions-dashboard">
        <ProtectedRoute requiredRole="admin">
          <SubscriptionsDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/usage-reports">
        <ProtectedRoute requiredRole="admin">
          <UsageReports />
        </ProtectedRoute>
      </Route>
      <Route path="/abarrotes-products">
        <ProtectedRoute requiredProgram="abarrotes">
          <AbarrotesProductsManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/abarrotes-pos">
        <ProtectedRoute requiredProgram="abarrotes">
          <AbarrotesPOS />
        </ProtectedRoute>
      </Route>
      <Route path="/verduleria" component={VerduleriaPOS} />
       <Route path="/tarima/:slug" component={TarimaPublic} />
   <Route path="/mi-tarima">
     <ProtectedRoute>
       <MiTarima />
     </ProtectedRoute>
   </Route>

      <Route path="/home" component={Home} />
      <Route path="/login" component={Home} />

      <Route path="/dashboard">
        <ProtectedRoute requiredProgram="boutique">
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/products">
        <ProtectedRoute requiredProgram="boutique">
          <ProductsManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/variants">
        <ProtectedRoute requiredProgram="boutique">
          <VariantsManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/categories">
        <ProtectedRoute requiredProgram="boutique">
          <CategoriesManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/inventory-reports">
        <ProtectedRoute requiredProgram="boutique">
          <InventoryReports />
        </ProtectedRoute>
      </Route>

      <Route path="/branches">
        <ProtectedRoute requiredProgram="boutique">
          <BranchesManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/sales">
        <ProtectedRoute requiredProgram="boutique">
          <SalesHistory />
        </ProtectedRoute>
      </Route>

      <Route path="/pos">
        <ProtectedRoute requiredProgram="boutique">
          <POS />
        </ProtectedRoute>
      </Route>

      <Route path="/pos-settings">
        <ProtectedRoute requiredProgram="boutique">
          <POSHardwareSettings />
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute requiredRole="admin">
          <UserManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/users-management">
        <ProtectedRoute requiredRole="admin">
          <UsersManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/notifications">
        <ProtectedRoute requiredRole="admin">
          <NotificationsCenter />
        </ProtectedRoute>
      </Route>

      <Route path="/notification-preferences">
        <ProtectedRoute>
          <NotificationPreferences />
        </ProtectedRoute>
      </Route>

      <Route path="/invoices">
        <ProtectedRoute requiredRole="admin">
          <InvoicesAndPayments />
        </ProtectedRoute>
      </Route>

      <Route path="/subscriptions">
        <ProtectedRoute requiredRole="admin">
          <SubscriptionManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/subscribers">
        <ProtectedRoute requiredRole="admin">
          <SubscriberManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/admin-cyberpiezas">
        <ProtectedRoute requiredRole="admin">
          <AdminCyberpiezas />
        </ProtectedRoute>
      </Route>

      <Route path="/veterinaria-pos/:tab?">
        <ProtectedRoute requiredProgram="veterinaria">
          <VeterinariaPOS />
        </ProtectedRoute>
      </Route>

      <Route path="/vet-cajeros">
        <ProtectedRoute requiredProgram="veterinaria">
          <VeterinariaCajeros />
        </ProtectedRoute>
      </Route>

      <Route path="/vet-suscripcion">
        <ProtectedRoute requiredProgram="veterinaria">
          <VeterinariaSubscription />
        </ProtectedRoute>
      </Route>

      <Route path="/offline-sync">
        <ProtectedRoute requiredRole="admin">
          <OfflineSyncSettings />
        </ProtectedRoute>
      </Route>

      <Route path="/paypal-plans">
        <ProtectedRoute requiredRole="admin">
          <PayPalSubscriptionPlans />
        </ProtectedRoute>
      </Route>

      <Route path="/admin-payment-review">
        <ProtectedRoute requiredRole="admin">
          <AdminPaymentReview />
        </ProtectedRoute>
      </Route>

      <Route path="/terms">
        <TermsAndConditions />
      </Route>

      <Route path="/license-request">
        <LicenseRequest />
      </Route>

      <Route path="/pricing">
        <PricingPlans />
      </Route>

      <Route path="/checkout">
        <CheckoutPage />
      </Route>

      <Route path="/subscription">
        <ProtectedRoute>
          <MySubscription />
        </ProtectedRoute>
      </Route>

      <Route path="/subscription-panel">
        <SubscriptionPanel />
      </Route>

      <Route path="/payment-confirmation">
        <PaymentConfirmationPanel />
      </Route>

      <Route path="/referral">
        <ReferralPanel />
      </Route>

      <Route path="/subscribers">
        <ProtectedRoute requiredRole="admin">
          <SubscribersManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/settings/pos-hardware">
        <ProtectedRoute requiredProgram="boutique">
          <POSHardwareSettings />
        </ProtectedRoute>
      </Route>

      <Route path="/settings/offline-sync">
        <ProtectedRoute requiredRole="admin">
          <OfflineSyncSettings />
        </ProtectedRoute>
      </Route>

      <Route path="/cajeros-usuarios">
        <ProtectedRoute requiredProgram="boutique">
          <CajerosYUsuarios />
        </ProtectedRoute>
      </Route>

      <Route path="/gestion-acceso">
        {/* MOVIDO AL PANEL CYBERPIEZAS: solo accesible para el admin */}
        <ProtectedRoute requiredRole="admin">
          <GestionAccesoSuscriptor />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <OfflineSalesAutoSync>
            <Router />
          </OfflineSalesAutoSync>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
