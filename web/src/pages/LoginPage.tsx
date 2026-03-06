import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Card, Spinner } from "../components/ui";
import { useToast } from "../components/ui/Toast";
import { authApi } from "../api/auth";

type Mode = "login" | "register";

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast("Please fill in all required fields", "warning");
      return;
    }
    if (mode === "register") {
      if (!form.email) { toast("Email is required", "warning"); return; }
      if (form.password !== form.confirmPassword) {
        toast("Passwords do not match", "error");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const res = await authApi.login({
          username: form.username,
          password: form.password,
        });
        localStorage.setItem("prism-token", res.token);
        localStorage.setItem("prism-refresh", res.refreshToken);
        toast(`Welcome, ${res.user.username}`, "success");
        navigate("/sfc");
      } else {
        const res = await authApi.register({
          username: form.username,
          email: form.email,
          password: form.password,
        });
        localStorage.setItem("prism-token", res.token);
        localStorage.setItem("prism-refresh", res.refreshToken);
        toast("Account created successfully", "success");
        navigate("/sfc");
      }
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Authentication failed",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface
      p-4 dark:bg-surface-dark">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl font-bold text-primary-600">P</span>
          <h1 className="mt-2 text-xl font-bold text-slate-800
            dark:text-slate-100">
            PRISM v9
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manufacturing Intelligence Platform
          </p>
        </div>

        <Card>
          <div className="mb-4 flex rounded-md bg-slate-100
            dark:bg-slate-700 p-0.5">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-2 text-sm font-medium
                transition-colors ${
                mode === "login"
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-md py-2 text-sm font-medium
                transition-colors ${
                mode === "register"
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              autoComplete="username"
            />
            {mode === "register" && (
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                autoComplete="email"
              />
            )}
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {mode === "register" && (
              <Input
                label="Confirm Password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                autoComplete="new-password"
              />
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Spinner size="sm" />
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
