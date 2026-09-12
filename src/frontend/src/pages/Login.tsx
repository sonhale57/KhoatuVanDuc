import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    const user = localStorage.getItem("user");
    if (user) {
      navigate("/");
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await apiService.auth.login(username, password);
      localStorage.setItem("user", JSON.stringify(user));
      if (user.token) {
        localStorage.setItem("token", user.token);
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Tên đăng nhập hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8 bg-cover bg-center bg-no-repeat bg-top"
      style={{ backgroundImage: "url('/images/bg_KTPT.PNG')" }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-slate-950/50 -z-10" />

      {/* Decorative blurred background shapes */}
      <div className="absolute top-1/4 left-1/4 -z-20 h-72 w-72 rounded-full bg-yellow-500/15 blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 -z-20 h-72 w-72 rounded-full bg-yellow-500/15 blur-[80px]" />

      <div className="mb-6 flex flex-col items-center justify-center text-center">
        <img src="/images/logo_KTPT.png" alt="Logo" className="h-32" />
      </div>

      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-slate-50">Đăng nhập</CardTitle>
          <CardDescription className="text-slate-400">
            Nhập tài khoản quản trị để truy cập hệ thống
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-400">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">Tên đăng nhập</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500 focus-visible:ring-offset-slate-900"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">Mật khẩu</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500 focus-visible:ring-offset-slate-900"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400 active:scale-[0.98] transition-all"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}


