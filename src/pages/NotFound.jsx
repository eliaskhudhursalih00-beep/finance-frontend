import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container" style={{ padding: "4rem 2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "4rem", color: "var(--primary)", marginBottom: "1rem" }}>404</h1>
      <h2>Page Not Found</h2>
      <p className="text-muted mt-2 mb-4">The page you are looking for doesn't exist or has been moved.</p>
      <Link to="/" className="btn" style={{ width: "auto", display: "inline-block", padding: "0.8rem 2rem" }}>
        Go to Dashboard
      </Link>
    </div>
  );
}
