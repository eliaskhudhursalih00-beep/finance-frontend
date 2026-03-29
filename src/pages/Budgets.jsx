import { useState, useEffect } from "react";
import api from "../api";

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));

  useEffect(() => {
    fetchBudgets();
  }, [filterMonth]);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/budgets?month=${filterMonth}`);
      setBudgets(res.data.budgets || res.data);
    } catch (err) {
      console.error("Failed to load budgets", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: "2rem" }}>
      <div className="flex justify-between items-center">
        <h1>Monthly Budgets</h1>
        <input 
          type="month" 
          className="input-field" 
          style={{ width: 'auto' }}
          value={filterMonth} 
          onChange={(e) => setFilterMonth(e.target.value)} 
        />
      </div>
      
      <div className="dashboard-grid mt-4">
        {loading ? (
          <p>Loading budgets...</p>
        ) : budgets.length === 0 ? (
          <div className="card"><p>No budgets found for this month.</p></div>
        ) : (
          budgets.map(b => {
             const percent = Math.min((b.current_spent / b.limit_amount) * 100, 100);
             const isOver = b.current_spent > b.limit_amount;
             return (
               <div className="card" key={b.id}>
                 <h3 className="card-title">{b.category_name}</h3>
                 <div className="flex justify-between items-center mb-2">
                   <span className={isOver ? 'text-danger font-bold' : ''}>${parseFloat(b.current_spent).toFixed(0)} spent</span>
                   <span className="text-muted">${parseFloat(b.limit_amount).toFixed(0)} limit</span>
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
          })
        )}
      </div>
    </div>
  );
}
