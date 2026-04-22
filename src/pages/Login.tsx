import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Login() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
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

      {/* Language Toggle — top right */}
      <div className="absolute top-6 right-6">
        <div className="flex items-center gap-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-1">
          <Globe className="w-4 h-4 text-gray-400 ml-2" />
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
              language === "en"
                ? "bg-blue-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("es")}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
              language === "es"
                ? "bg-blue-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            ES
          </button>
        </div>
      </div>

      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <img
          src="/src/assets/logo.png"
          alt="Printing 24/7 Logo"
          className="w-36 h-36 rounded-[28px] object-cover shadow-xl mb-6"
        />
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{t("appName")}</h1>
        <p className="text-gray-500 text-base mt-1">{t("signInToContinue")}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSignIn} className="w-full max-w-sm space-y-4 mt-4">
        {/* Email */}
        <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-1 shadow-sm border border-gray-200 focus-within:border-blue-400 transition-colors">
          <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type="email"
            placeholder={t("emailAddress")}
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
            placeholder={t("password")}
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
          {loading ? t("signingIn") : t("signIn")}
        </button>
      </form>

      {/* Create Account */}
      <p className="mt-8 text-gray-500 text-base">
        {t("noAccount")}{" "}
        <button
          onClick={() => navigate("/signup")}
          className="text-blue-500 font-semibold hover:underline"
        >
          {t("createAccount")}
        </button>
      </p>
    </div>
  );
}
