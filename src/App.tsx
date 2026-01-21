import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/ui/spinner";

// Pages
import Login from "./pages/Login";
import OwnerDashboard from "./pages/owner/Dashboard";
import BukaBooth from "./pages/owner/BukaBooth";
import RiwayatBooth from "./pages/owner/RiwayatBooth";
import Transaksi from "./pages/owner/Transaksi";
import InputBelanja from "./pages/owner/InputBelanja";
import Items from "./pages/owner/Items";
import Laporan from "./pages/owner/Laporan";
import ClosingPeriode from "./pages/owner/ClosingPeriode";
import KaryawanHome from "./pages/karyawan/Home";
import KaryawanClosing from "./pages/karyawan/Closing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ('owner' | 'karyawan')[] }) {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === 'owner' ? '/owner' : '/karyawan'} replace />;
  }

  return <>{children}</>;
}

function RoleBasedRedirect() {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role === 'owner') return <Navigate to="/owner" replace />;
  return <Navigate to="/karyawan" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleBasedRedirect />} />
      <Route path="/login" element={<Login />} />
      
      {/* Owner Routes */}
      <Route path="/owner" element={<ProtectedRoute allowedRoles={['owner']}><OwnerDashboard /></ProtectedRoute>} />
      <Route path="/owner/booth" element={<ProtectedRoute allowedRoles={['owner']}><RiwayatBooth /></ProtectedRoute>} />
      <Route path="/owner/booth/buka" element={<ProtectedRoute allowedRoles={['owner']}><BukaBooth /></ProtectedRoute>} />
      <Route path="/owner/transaksi" element={<ProtectedRoute allowedRoles={['owner']}><Transaksi /></ProtectedRoute>} />
      <Route path="/owner/transaksi/input" element={<ProtectedRoute allowedRoles={['owner']}><InputBelanja /></ProtectedRoute>} />
      <Route path="/owner/laporan" element={<ProtectedRoute allowedRoles={['owner']}><Laporan /></ProtectedRoute>} />
      <Route path="/owner/laporan/closing" element={<ProtectedRoute allowedRoles={['owner']}><ClosingPeriode /></ProtectedRoute>} />
      <Route path="/owner/items" element={<ProtectedRoute allowedRoles={['owner']}><Items /></ProtectedRoute>} />
      
      {/* Karyawan Routes */}
      <Route path="/karyawan" element={<ProtectedRoute allowedRoles={['karyawan']}><KaryawanHome /></ProtectedRoute>} />
      <Route path="/karyawan/closing" element={<ProtectedRoute allowedRoles={['karyawan']}><KaryawanClosing /></ProtectedRoute>} />
      <Route path="/karyawan/riwayat" element={<ProtectedRoute allowedRoles={['karyawan']}><KaryawanHome /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
