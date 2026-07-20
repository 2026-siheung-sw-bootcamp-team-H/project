import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { LoadingState } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";

const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage }))
);
const DeploymentsPage = lazy(() =>
  import("@/pages/DeploymentsPage").then((module) => ({ default: module.DeploymentsPage }))
);
const LogDetailPage = lazy(() =>
  import("@/pages/LogDetailPage").then((module) => ({ default: module.LogDetailPage }))
);
const LoginPage = lazy(() =>
  import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const LogsPage = lazy(() =>
  import("@/pages/LogsPage").then((module) => ({ default: module.LogsPage }))
);
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage }))
);
const ReportPage = lazy(() =>
  import("@/pages/ReportPage").then((module) => ({ default: module.ReportPage }))
);
const RuleDetailPage = lazy(() =>
  import("@/pages/RuleDetailPage").then((module) => ({ default: module.RuleDetailPage }))
);
const RulesPage = lazy(() =>
  import("@/pages/RulesPage").then((module) => ({ default: module.RulesPage }))
);
const ServicesPage = lazy(() =>
  import("@/pages/ServicesPage").then((module) => ({ default: module.ServicesPage }))
);
const ValidationPage = lazy(() =>
  import("@/pages/ValidationPage").then((module) => ({ default: module.ValidationPage }))
);
const InsightsPage = lazy(() =>
  import("@/pages/InsightsPage").then((module) => ({ default: module.InsightsPage }))
);
const OnboardingPage = lazy(() =>
  import("@/pages/OnboardingPage").then((module) => ({ default: module.OnboardingPage }))
);
const ShopLayout = lazy(() =>
  import("@/shop/components/ShopLayout").then((module) => ({ default: module.ShopLayout }))
);
const ShopHomePage = lazy(() =>
  import("@/shop/pages/ShopHomePage").then((module) => ({ default: module.ShopHomePage }))
);
const ProductDetailPage = lazy(() =>
  import("@/shop/pages/ProductDetailPage").then((module) => ({
    default: module.ProductDetailPage
  }))
);
const ShopSearchPage = lazy(() =>
  import("@/shop/pages/ShopSearchPage").then((module) => ({ default: module.ShopSearchPage }))
);
const ShopCartPage = lazy(() =>
  import("@/shop/pages/ShopCartPage").then((module) => ({ default: module.ShopCartPage }))
);
const ShopLoginPage = lazy(() =>
  import("@/shop/pages/ShopLoginPage").then((module) => ({ default: module.ShopLoginPage }))
);

function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  return token ? (
    <Outlet />
  ) : (
    <Navigate to="/onboarding" replace state={{ from: location.pathname }} />
  );
}

export function App() {
  return (
    <Suspense fallback={<LoadingState label="화면을 준비하는 중입니다." />}>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/demo-shop" element={<ShopLayout />}>
          <Route index element={<ShopHomePage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="search" element={<ShopSearchPage />} />
          <Route path="cart" element={<ShopCartPage />} />
          <Route path="login" element={<ShopLoginPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="logs/:id" element={<LogDetailPage />} />
            <Route path="rules" element={<RulesPage />} />
            <Route path="rules/:id" element={<RuleDetailPage />} />
            <Route path="validation/:id" element={<ValidationPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="deployments" element={<DeploymentsPage />} />
            <Route path="reports/:id" element={<ReportPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
