import { useState } from "react";
import api from "../api";
import { useNavigate, Link } from "react-router-dom";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await api.post("/api/register", { email, password });
      setSuccess("Account created! Redirecting to login…");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {

      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p>Start managing your expenses today</p>

        {error && <div className="text-danger text-center mb-4">{error}</div>}
        {success && <div className="text-success text-center mb-4">{success}</div>}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              className="input-field"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password <span className="text-muted" style={{fontSize:'0.8rem'}}>(min. 6 characters)</span></label>
            <input
              className="input-field"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}

              required
            />
          </div>

          <button type="submit" className="btn mt-4" disabled={loading}>
            {loading ? "Creating account…" : "Sign Up"}
          </button>
        </form>

        <div className="text-center mt-4">
          <span className="text-muted">Already have an account? </span>
          <Link to="/login" className="text-success font-bold" style={{textDecoration: 'none'}}>Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
