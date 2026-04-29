import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { postJson } from "../api/client";
import { redirectForRole, saveSession } from "../auth/session";

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await postJson("/api/users/login", {
        email: email.trim(),
        password,
      });
      saveSession(data);
      setMessage(`Welcome back, ${data.user.fullName}!`);
      window.history.pushState({}, "", redirectForRole(data.user.role));
      window.setTimeout(() => onLogin(data.user), 250);
    } catch (err) {
      setMessage(err.message || "Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-label="Authentication">
        <div className="app-icon" aria-hidden="true">
          <GraduationCap />
        </div>
        <header className="auth-header">
          <h1>Tutoring Center</h1>
          <p>Secure access for staff, students, and parents</p>
        </header>

        <form className="auth-card auth-form" onSubmit={submit}>
          <label className="field">
            Email Address
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Enter your email" required />
          </label>
          <label className="field">
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Enter your password" required />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <p className={`message ${message.toLowerCase().includes("welcome") ? "success" : message ? "error" : ""}`}>{message}</p>
        </form>
      </section>
    </main>
  );
}
