import React, { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const Skeleton = ({ className, style }) => <div className={`skeleton ${className}`} style={style}></div>;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card text-center" style={{ padding: '2rem' }}>
          <p className="text-danger">Something went wrong with the chart.</p>
          <button className="btn btn-outline mt-2" onClick={() => this.setState({ hasError: false })}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Dashboard({ token, setToken }) {
  const navigate = useNavigate();
  const [balanceData, setBalanceData] = useState({ balance: 0, income: 0, expenses: 0 });
  const [transactions, setTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [recurringTransactions, setRecurringTransactions] = useState([]);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("expense");
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCategoryId, setBudgetCategoryId] = useState("");

  const [recAmount, setRecAmount] = useState("");
  const [recCategoryId, setRecCategoryId] = useState("");
  const [recType, setRecType] = useState("expense");
  const [recFrequency, setRecFrequency] = useState("monthly");
  const [recNextDate, setRecNextDate] = useState("");
  const [recDescription, setRecDescription] = useState("");

  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchInitialData();
  }, [token, navigate]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, filterMonth]);

  const fetchInitialData = async () => {
    try {
      const catRes = await api.get("/api/categories");
      setCategories(catRes.data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchData = async () => {
    setLoadingData(true);
    setGlobalError("");
    try {
      const currentMonth = filterMonth || new Date().toISOString().substring(0, 7);
      const queryParam = `?month=${currentMonth}`;

      const [balanceRes, transRes, analyticsRes, budgetRes, recurringRes] = await Promise.all([
        api.get(`/api/balance${queryParam}`),
        api.get(`/api/transactions${queryParam}`),
        api.get(`/api/analytics/categories${queryParam}`),
        api.get(`/api/budgets${queryParam}`),
        api.get("/api/recurring"),
      ]);

      setBalanceData(balanceRes.data);
      setTransactions(transRes.data.transactions || transRes.data);
      setCategoryData(analyticsRes.data);
      setBudgets(budgetRes.data.budgets || budgetRes.data);
      setRecurringTransactions(recurringRes.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        logout();
      } else {
        setGlobalError("Failed to load data. Please check your connection and try again.");
      }
    } finally {
      setLoadingData(false);
    }
  };

  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!budgetAmount || !budgetCategoryId) return;
    setSubmitting(true);
    try {
      await api.post("/api/budgets", {
        category_id: parseInt(budgetCategoryId),
        amount: parseFloat(budgetAmount),
        month: filterMonth || new Date().toISOString().substring(0, 7)
      });
      setBudgetAmount("");
      setBudgetCategoryId("");
      fetchData();
    } catch (err) {
      setFormError("Failed to set budget.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRecurring = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/recurring", {
        category_id: parseInt(recCategoryId),
        amount: parseFloat(recAmount),
        type: recType,
        frequency: recFrequency,
        next_date: recNextDate,
        description: recDescription
      });
      setRecAmount("");
      setRecCategoryId("");
      setRecNextDate("");
      setRecDescription("");
      fetchData();
    } catch (err) {
      setFormError("Failed to create recurring transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecurring = async (id) => {
    try {
      await api.delete(`/api/recurring/${id}`);
      fetchData();
    } catch (err) {
      setGlobalError("Failed to delete recurring transaction.");
    }
  };

  const saveTransaction = async (e) => {
    e.preventDefault();
    if (!amount || !categoryId) {
      setFormError("Please provide amount and select a category.");
      return;
    }
    setFormError("");
    setSubmitting(true);

    try {
      const payload = { 
        amount: parseFloat(amount), 
        category_id: parseInt(categoryId), 
        type, 
        description 
      };

      if (editingId) {
        await api.put(`/api/transactions/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post("/api/transactions", payload);
      }

      setAmount("");
      setCategoryId("");
      setDescription("");
      setType("expense");
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to save transaction. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/transactions/${id}`);
      fetchData();
    } catch (err) {
      setGlobalError(err.response?.data?.error || "Failed to delete transaction.");
    }
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setAmount(t.amount);
    setCategoryId(t.category_id || "");
    setDescription(t.description || "");
    setType(t.type);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ["Date", "Type", "Amount", "Category", "Description"];
    const rows = transactions.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.type,
      t.amount,
      t.category_name || t.category,
      `"${(t.description || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finance_report_${filterMonth || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAmount("");
    setCategoryId("");
    setDescription("");
    setType("expense");
    setFormError("");
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      if (refreshToken) {
        await api.post("/api/logout", { refreshToken });
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setToken(null);
      navigate("/login");
    }
  };

  const chartData = {
    labels: categoryData?.length > 0 ? categoryData.map((i) => i.category) : ["No data"],
    datasets: [
      {
        data: categoryData?.length > 0 ? categoryData.map((i) => i.total) : [1],
        backgroundColor: categoryData?.length > 0 ? categoryData.map(i => i.color || "#4F46E5") : ["#E5E7EB"],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Finance Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ marginBottom: 2, fontSize: '0.75rem' }}>Filter Month:</label>
            <input 
              type="month" 
              className="input-field" 
              style={{ padding: '0.4rem 0.6rem', width: 'auto' }}
              value={filterMonth} 
              onChange={(e) => setFilterMonth(e.target.value)} 
            />
          </div>
          <button onClick={handleExportCSV} className="btn btn-secondary" style={{ width: 'auto' }}>Export CSV</button>
          <button onClick={logout} className="btn btn-outline" style={{ width: 'auto' }}>Logout</button>
        </div>
      </div>

      {globalError && (
        <div className="card text-center" style={{ borderColor: 'var(--danger)', background: '#FEF2F2' }}>
          <p className="text-danger">{globalError}</p>
          <button className="btn btn-secondary mt-4" onClick={fetchData} style={{ width: 'auto' }}>Retry</button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Balance</div>
          <div className="stat-value">
            {loadingData ? <Skeleton className="skeleton-text" style={{ width: '80%' }} /> : `💰 $${balanceData.balance.toFixed(2)}`}
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="stat-label">Total Income</div>
          <div className="stat-value text-success">
            {loadingData ? <Skeleton className="skeleton-text" style={{ width: '80%' }} /> : `📈 $${balanceData.income.toFixed(2)}`}
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value text-danger">
            {loadingData ? <Skeleton className="skeleton-text" style={{ width: '80%' }} /> : `📉 $${balanceData.expenses.toFixed(2)}`}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3 className="card-title">Monthly Budgets</h3>
          {loadingData ? (
             <>
               <Skeleton className="skeleton-text" style={{ marginBottom: '1rem' }} />
               <Skeleton className="skeleton-text" style={{ marginBottom: '1rem' }} />
             </>
          ) : budgets.length === 0 ? (
            <p className="text-muted text-center" style={{ padding: '2rem' }}>No budgets set for this month.</p>
          ) : (
            <div>
              {budgets.map(b => {
                const percent = Math.min((b.current_spent / b.limit_amount) * 100, 100);
                const isOver = b.current_spent > b.limit_amount;
                return (
                  <div key={b.id} style={{ marginBottom: '1.5rem' }}>
                    <div className="flex justify-between items-center mb-1">
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.category_name}</span>
                      <span style={{ fontSize: '0.85rem' }}>
                        <span className={isOver ? 'text-danger font-bold' : ''}>${parseFloat(b.current_spent).toFixed(0)}</span>
                        <span className="text-muted"> / ${parseFloat(b.limit_amount).toFixed(0)}</span>
                      </span>
                    </div>
                    <div className="progress-container">
                      <div 
                        className={`progress-fill ${isOver ? 'progress-over' : ''}`}
                        style={{ 
                          width: `${percent}%`, 
                          backgroundColor: isOver ? 'var(--danger)' : (b.category_color || 'var(--primary)') 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
             <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Set Category Budget</h4>
             <form onSubmit={handleSetBudget} className="flex gap-2">
                <select 
                  className="input-field" 
                  style={{ flex: 1, padding: '0.5rem' }}
                  value={budgetCategoryId} 
                  onChange={(e) => setBudgetCategoryId(e.target.value)}
                  required
                >
                  <option value="">Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input 
                  type="number" 
                  className="input-field" 
                  style={{ flex: 1, padding: '0.5rem' }}
                  placeholder="Limit $" 
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  required
                />
                <button type="submit" className="btn" style={{ width: 'auto', padding: '0.5rem 1rem' }} disabled={submitting}>Set</button>
             </form>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Recurring Transactions</h3>
          {loadingData ? (
             <Skeleton className="skeleton-text" />
          ) : recurringTransactions.length === 0 ? (
            <p className="text-muted text-center" style={{ padding: '2rem' }}>No recurring transactions set.</p>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
              {recurringTransactions.map(r => (
                <div key={r.id} className="flex justify-between items-center mb-2 p-2" style={{ background: 'var(--bg-color)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.category_name} - ${parseFloat(r.amount).toFixed(0)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.frequency} • Next: {new Date(r.next_date).toLocaleDateString()}</div>
                  </div>
                  <button className="btn-danger btn" style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => handleDeleteRecurring(r.id)}>Stop</button>
                </div>
              ))}
            </div>
          )}
          
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Add Recurring</h4>
            <form onSubmit={handleCreateRecurring}>
              <div className="flex gap-2 mb-2">
                <select className="input-field" style={{ padding: '0.4rem', flex: 1 }} value={recCategoryId} onChange={e => setRecCategoryId(e.target.value)} required>
                  <option value="">Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" className="input-field" style={{ padding: '0.4rem', flex: 1 }} placeholder="Amount" value={recAmount} onChange={e => setRecAmount(e.target.value)} required />
              </div>
              <div className="flex gap-2 mb-2">
                <select className="input-field" style={{ padding: '0.4rem', flex: 1 }} value={recFrequency} onChange={e => setRecFrequency(e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <input type="date" className="input-field" style={{ padding: '0.4rem', flex: 1 }} value={recNextDate} onChange={e => setRecNextDate(e.target.value)} required />
              </div>
              <button type="submit" className="btn" style={{ padding: '0.5rem' }} disabled={submitting}>Start Recurring</button>
            </form>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Expense Breakdown</h3>
          <div style={{ height: "300px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            {loadingData ? (
              <Skeleton className="skeleton-chart" />
            ) : (
              <ErrorBoundary>
                <Pie data={chartData} options={{ maintainAspectRatio: false }} />
              </ErrorBoundary>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
         <div className="card">
          <h3 className="card-title">{editingId ? "Edit Transaction" : "Add Transaction"}</h3>
          <form onSubmit={saveTransaction}>
            <div className="flex gap-4">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Type</label>
                <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>

            <div className="form-group">
                <label>Category</label>
                <select 
                  className="input-field" 
                  value={categoryId} 
                  onChange={(e) => setCategoryId(e.target.value)} 
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Lunch with team"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

            {formError && <p className="text-danger mb-4" style={{ fontSize: '0.875rem' }}>{formError}</p>}

            <div className="flex gap-2">
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Saving..." : editingId ? "Update Transaction" : "Add Transaction"}
              </button>
              {editingId && (
                <button type="button" className="btn btn-outline" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Recent Transactions</h3>
        {loadingData ? (
          <>
            <Skeleton className="skeleton-list-item" />
            <Skeleton className="skeleton-list-item" />
            <Skeleton className="skeleton-list-item" />
          </>
        ) : transactions.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '2rem' }}>No transactions found for this period.</p>
        ) : (
          <div>
            {transactions.map((t) => (
              <div key={t.id} className="transaction-item">
                <div className="flex items-center gap-4" style={{ width: "100%" }}>
                  <div 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      backgroundColor: t.category_color || '#4F46E5' 
                    }} 
                  />
                  <div className="flex justify-between items-center" style={{ width: "100%" }}>
                    <div>
                        <h4>{t.category_name || t.category}</h4>
                        {t.description && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                            {t.description}
                          </p>
                        )}
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`transaction-amount ${t.type === "income" ? "text-success" : "text-danger"}`}>
                        {t.type === "income" ? "+" : "-"}${parseFloat(t.amount).toFixed(2)}
                      </span>
                      <div className="flex gap-2">
                        <button className="btn-outline btn" style={{ padding: '0.4rem', width: 'auto' }} onClick={() => handleEdit(t)}>Edit</button>
                        <button className="btn-danger btn" style={{ padding: '0.4rem', width: 'auto' }} onClick={() => handleDelete(t.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
