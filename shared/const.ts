export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// Subscription Plans - Pricing in MXN (Mexican Pesos)
export const SUBSCRIPTION_PLANS = {
  basic: {
    name: "Básica",
    description: "Perfecto para empezar",
    monthly: 100,
    annual: 1100,
    features: [
      "Punto de venta básico",
      "Gestión de inventario",
      "1 sucursal",
      "Reportes básicos",
    ],
  },
  normal: {
    name: "Normal",
    description: "Para negocios en crecimiento",
    monthly: 189,
    annual: 1900,
    features: [
      "Todo de Básica",
      "Múltiples sucursales",
      "Reportes avanzados",
      "Sincronización offline",
      "Soporte prioritario",
    ],
  },
  premium: {
    name: "Premium",
    description: "Solución completa",
    monthly: 250,
    annual: 2500,
    features: [
      "Todo de Normal",
      "Sin límites de operación",
      "Solicitudes de features personalizadas",
      "API access",
      "Soporte 24/7",
    ],
  },
} as const;

// Contact Information - Will be populated dynamically from user data
export const getContactInfo = (userName?: string) => ({
  engineer: {
    name: userName || "Ing. David Farfán",
    title: "Propietario del Negocio",
    email: "contacto@cyberpiezas.com",
    phone: "+52 735 494 6224",
    description: `Contacta con ${userName || "el propietario"} para solicitudes de features personalizadas, soporte técnico avanzado o consultoría empresarial.`,
  },
});

// Fallback for static imports
export const CONTACT_INFO = getContactInfo();
