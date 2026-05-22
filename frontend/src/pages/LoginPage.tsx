import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

export function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? "/dashboard";

  const { register, handleSubmit, formState: { errors }, setError } = useForm<LoginPayload>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginPayload) => {
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Login failed";
      setError("root", { message: msg });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">IQ</div>
          <h1>Inventory IQ</h1>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
          </div>

          {errors.root && (
            <div className="form-error" role="alert">{errors.root.message}</div>
          )}

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f1117;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          background: #1a1d27;
          border: 1px solid #2a2d3a;
          border-radius: 16px;
          padding: 2.5rem;
        }
        .login-header { text-align: center; margin-bottom: 2rem; }
        .login-logo {
          width: 48px; height: 48px; border-radius: 12px;
          background: #3b82f6; color: white;
          display: inline-flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 18px; margin-bottom: 1rem;
        }
        .login-header h1 { color: #f8fafc; font-size: 1.5rem; margin: 0 0 0.25rem; }
        .login-header p { color: #94a3b8; font-size: 0.875rem; margin: 0; }
        .field { margin-bottom: 1.25rem; }
        .field label { display: block; font-size: 0.875rem; color: #cbd5e1; margin-bottom: 0.5rem; }
        .field input {
          width: 100%; box-sizing: border-box;
          background: #0f1117; border: 1px solid #2a2d3a; border-radius: 8px;
          color: #f8fafc; padding: 0.625rem 0.875rem; font-size: 0.9rem;
          outline: none; transition: border-color 0.15s;
        }
        .field input:focus { border-color: #3b82f6; }
        .field input[aria-invalid=true] { border-color: #ef4444; }
        .field-error { display: block; color: #f87171; font-size: 0.8rem; margin-top: 0.375rem; }
        .form-error {
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
          color: #f87171; padding: 0.75rem; border-radius: 8px;
          font-size: 0.875rem; margin-bottom: 1rem;
        }
        .btn-primary {
          width: 100%; padding: 0.75rem; border-radius: 8px; border: none;
          background: #3b82f6; color: white; font-size: 0.9rem; font-weight: 500;
          cursor: pointer; transition: background 0.15s;
        }
        .btn-primary:hover:not(:disabled) { background: #2563eb; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
