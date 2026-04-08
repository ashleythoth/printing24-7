import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <div className="w-36 h-36 rounded-[28px] overflow-hidden shadow-xl mb-6">
          <div className="w-full h-full bg-black flex flex-col items-center justify-center relative">
            {/* Logo recreation */}
            <div className="absolute inset-0 bg-black" />
            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-2">
              <span
                className="text-yellow-400 font-bold text-lg leading-tight"
                style={{ fontFamily: "cursive", textShadow: "0 0 8px rgba(255,200,0,0.5)" }}
              >
                Solutions
              </span>
              <span className="text-blue-500 font-extrabold text-2xl tracking-widest leading-tight">
                PRINT
              </span>
              <div className="w-full bg-blue-600 rounded-lg px-2 py-1 my-1 flex flex-col items-center">
                <span className="text-yellow-400 font-bold text-xs">Printing</span>
                <span className="text-yellow-400 font-extrabold text-3xl leading-none">24/7</span>
              </div>
              <span className="text-blue-500 font-extrabold text-2xl tracking-widest leading-tight">
                PHOTO
              </span>
              <span className="text-gray-400 text-[8px] tracking-wider mt-0.5">Global Printing Network</span>
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Printing 24/7</h1>
        <p className="text-gray-500 text-base mt-1">Sign in to continue</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSignIn} className="w-full max-w-sm space-y-4 mt-4">
        {/* Email */}
        <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-1 shadow-sm border border-gray-200 focus-within:border-blue-400 transition-colors">
          <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 py-4 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base"
          />
        </div>

        {/* Password */}
        <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-1 shadow-sm border border-gray-200 focus-within:border-blue-400 transition-colors">
          <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="flex-1 py-4 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl px-4 py-2">{error}</p>
        )}

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 active:scale-[0.98] transition-all duration-150 text-white rounded-2xl py-5 text-xl font-bold shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      {/* Create Account */}
      <p className="mt-8 text-gray-500 text-base">
        Don't have an account?{" "}
        <button
          onClick={() => navigate("/signup")}
          className="text-blue-500 font-semibold hover:underline"
        >
          Create Account
        </button>
      </p>
    </div>
  );
}
