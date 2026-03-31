import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { CustomerProvider } from "./contexts/CustomerContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Produtos from "./pages/Produtos";
import PDV from "./pages/PDV";
import Relatorios from "./pages/Relatorios";
import Login from "./pages/Login";
import MeusPedidos from "./pages/MeusPedidos";
import NotFound from "./pages/NotFound";
import TestBarcode from "./pages/TestBarcode";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CustomerProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/meus-pedidos" element={<MeusPedidos />} />
              <Route path="/login" element={<Login />} />
              <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
              <Route path="/pdv" element={<ProtectedRoute><PDV /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
              <Route path="/test-barcode" element={<TestBarcode />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CustomerProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
