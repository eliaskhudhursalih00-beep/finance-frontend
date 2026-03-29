import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";

// Custom hook for debouncing fast keyboard inputs
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const page = parseInt(searchParams.get("page") || "1", 10);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Filter Bar state derived directly from URL exactly as the Lead Dev requested
  const category_id = searchParams.get("category_id") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  
  // Local state for the debounced input so typing doesn't feel laggy
  const [minAmountInput, setMinAmountInput] = useState(searchParams.get("minAmount") || "");
  const debouncedMinAmount = useDebounce(minAmountInput, 300);

  // 1. Initial Data Load (Categories)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.get("/api/categories");
        setCategories(res.data || []);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    loadCategories();
  }, []);

  // 2. Sync debounced input to the URL when it settles
  useEffect(() => {
    if (debouncedMinAmount !== (searchParams.get("minAmount") || "")) {
      handleFilterChange("minAmount", debouncedMinAmount);
    }
  }, [debouncedMinAmount]);

  // 3. The true API Fetcher (Bound to the URL)
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams(searchParams);
        if (!q.has("page")) q.set("page", "1");
        q.set("limit", limit.toString());
        
        const res = await api.get(`/api/transactions?${q.toString()}`);
        setTransactions(res.data.transactions || res.data);
        if (res.data.totalPages !== undefined) setTotalPages(res.data.totalPages);
      } catch (err) {
        console.error("Failed to load transactions", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [searchParams]);

  // Central Router Dispatcher
  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // "Page One Reset" Rule: Reset to page 1 if ANY filter changes (other than page itself)
    if (key !== 'page') newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams({ page: "1" }));
    setMinAmountInput("");
  };

  return (
    <div className="container" style={{ padding: "2rem" }}>
      <h1>Transactions History</h1>
      
      {/* 🛡️ The Advanced Filter Bar */}
      <div className="card mt-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--surface)' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Category</label>
          <select 
            className="input-field" 
            value={category_id} 
            onChange={(e) => handleFilterChange("category_id", e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Start Date</label>
          <input 
            type="date" 
            className="input-field" 
            value={startDate} 
            onChange={(e) => handleFilterChange("startDate", e.target.value)} 
          />
        </div>

        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>End Date</label>
          <input 
            type="date" 
            className="input-field" 
            value={endDate} 
            onChange={(e) => handleFilterChange("endDate", e.target.value)} 
          />
        </div>

        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Min Amount ($)</label>
          <input 
            type="number" 
            className="input-field" 
            placeholder="e.g. 50" 
            value={minAmountInput} 
            onChange={(e) => setMinAmountInput(e.target.value)} 
          />
        </div>

        <div>
          <button className="btn btn-outline" style={{ height: '42px', width: 'auto' }} onClick={handleClearFilters}>
            Clear All
          </button>
        </div>
      </div>

      <div className="card mt-4">
        {loading ? (
          <p>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p>No transactions found matching these filters.</p>
        ) : (
          <>
            <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: "1px solid var(--border)", padding: "8px" }}>Date</th>
                  <th style={{ borderBottom: "1px solid var(--border)", padding: "8px" }}>Category</th>
                  <th style={{ borderBottom: "1px solid var(--border)", padding: "8px" }}>Description</th>
                  <th style={{ borderBottom: "1px solid var(--border)", padding: "8px" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td style={{ padding: "8px", borderBottom: "1px solid var(--border)" }}>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid var(--border)" }}>{t.category_name}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid var(--border)" }}>{t.description}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid var(--border)", color: t.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                      {t.type === 'income' ? '+' : '-'}${parseFloat(t.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="flex justify-between items-center mt-4">
              <button 
                className="btn btn-outline" 
                disabled={page <= 1} 
                onClick={() => handleFilterChange('page', (page - 1).toString())}
                style={{ width: 'auto' }}
              >Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button 
                className="btn btn-outline" 
                disabled={page >= totalPages || totalPages === 0} 
                onClick={() => handleFilterChange('page', (page + 1).toString())}
                style={{ width: 'auto' }}
              >Next</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
