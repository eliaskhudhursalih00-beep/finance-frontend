import { useState, useEffect } from "react";
import api from "../api";

export default function Recurring() {
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecurring();
  }, []);

  const fetchRecurring = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/recurring");
      setRecurringTransactions(res.data);
    } catch (err) {
      console.error("Failed to load recurring transations", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: "2rem" }}>
      <h1>Recurring Transactions</h1>
      <div className="card mt-4">
        {loading ? (
          <p>Loading recurring transactions...</p>
        ) : recurringTransactions.length === 0 ? (
          <p>No active recurring transactions.</p>
        ) : (
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid var(--border)", padding: "8px" }}>Category</th>
                <th style={{ borderBottom: "1px solid var(--border)", padding: "8px" }}>Frequency</th>
                <th style={{ borderBottom: "1px solid var(--border)", padding: "8px" }}>Next Date</th>
                <th style={{ borderBottom: "1px solid var(--border)", padding: "8px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recurringTransactions.map(r => (
                <tr key={r.id}>
                  <td style={{ padding: "8px", borderBottom: "1px solid var(--border)" }}>{r.category_name}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid var(--border)" }}>{r.frequency}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid var(--border)" }}>{new Date(r.next_date).toLocaleDateString()}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid var(--border)", color: r.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                    {r.type === 'income' ? '+' : '-'}${parseFloat(r.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
