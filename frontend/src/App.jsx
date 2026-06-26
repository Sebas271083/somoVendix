import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminPanel from './pages/admin/AdminPanel.jsx';
import Home from './pages/Home.jsx';
import POS from './pages/POS.jsx';
import Products from './pages/Products.jsx';
import Stock from './pages/Stock.jsx';
import Customers from './pages/Customers.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Sales from './pages/Sales.jsx';
import CashRegister from './pages/CashRegister.jsx';
import Reports from './pages/Reports.jsx';
import Receivables from './pages/Receivables.jsx';
import Expenses from './pages/Expenses.jsx';
import CashFlow from './pages/CashFlow.jsx';
import Settings from './pages/Settings.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';
import Users from './pages/Users.jsx';
import BillingResult from './pages/BillingResult.jsx';
import Stocktaking from './pages/Stocktaking.jsx';
import Campaigns from './pages/Campaigns.jsx';
import Quotes from './pages/Quotes.jsx';
import CreditNotes from './pages/CreditNotes.jsx';
import Installments from './pages/Installments.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/billing/success" element={<BillingResult status="success" />} />
      <Route path="/billing/failure" element={<BillingResult status="failure" />} />
      <Route path="/billing/pending" element={<BillingResult status="pending" />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <CartProvider>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/pos" element={<POS />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/stock" element={<Stock />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/receivables" element={<Receivables />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/purchase-orders" element={<PurchaseOrders />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/cash-register" element={<CashRegister />} />
                  <Route path="/cash-flow" element={<CashFlow />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/stocktaking" element={<Stocktaking />} />
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/quotes" element={<Quotes />} />
                  <Route path="/credit-notes" element={<CreditNotes />} />
                  <Route path="/installments" element={<Installments />} />
                  <Route path="/users" element={
                    <AdminRoute><Users /></AdminRoute>
                  } />
                  <Route path="/settings" element={
                    <AdminRoute><Settings /></AdminRoute>
                  } />
                </Routes>
              </Layout>
            </CartProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
