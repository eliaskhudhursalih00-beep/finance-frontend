import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import Recurring from "./pages/Recurring";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import "./index.css";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={token ? <Navigate to="/" /> : <Login setToken={setToken} />} 
        />
        <Route 
          path="/register" 
          element={token ? <Navigate to="/" /> : <Register />} 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard token={token} setToken={setToken} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/transactions" 
          element={<ProtectedRoute><Transactions /></ProtectedRoute>} 
        />
        <Route 
          path="/budgets" 
          element={<ProtectedRoute><Budgets /></ProtectedRoute>} 
        />
        <Route 
          path="/recurring" 
          element={<ProtectedRoute><Recurring /></ProtectedRoute>} 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;