import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

export default function SignUp() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    setLoading(false);
    if (error) { setError(error.message); } else { setSuccess(true); }
  }

  async function handleResend() {
    setResending(true);
    setResent(false);
    await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-2">{t("checkYourEmail")}</h2>
          <p className="text-gray-500 text-center text-base mb-6">
            {t("weSentLink")}{" "}<span className="font-semibold text-gray-800">{email}</span>
          </p>
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-5 space-y-4">
            {[
              { num: "1", text: t("step1Email") },
              { num: "2", text: t("step2Email") },
              { num: "3", text: t("step3Email") },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{step.num}</span>
                </div>
                <p className="text-gray-700 text-sm font-medium">{step.text}</p>
              </div>
            ))}
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 mb-6 flex gap-3 items-start">
            <span className="text-yellow-500 text-lg leading-none mt-0.5">💡</span>
            <p className="text-yellow-800 text-sm">
              {t("checkSpam")} <span className="font-semibold">{t("spamFolder")}</span> {t("spamFolderEnd")}
            </p>
          </div>
          {resent ? (
            <div className="w-full bg-green-50 border border-green-200 rounded-2xl py-4 text-center text-green-600 font-semibold text-sm mb-4">
              {t("emailResent")}
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 rounded-2xl py-4 font-semibold text-base hover:bg-gray-50 transition-colors disabled:opacity-50 mb-4"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
              {resending ? t("resending") : t("resendEmail")}
            </button>
          )}
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-blue-500 text-white rounded-2xl py-5 text-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-600 transition-colors"
          >
            {t("goToSignIn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-6">
      <div className="mb-6 flex flex-col items-center">
        <img src="/src/assets/logo.png" alt="Printing 24/7 Logo" className="w-28 h-28 rounded-[24px] object-cover shadow-xl mb-5" />
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t("createAccount")}</h1>
        <p className="text-gray-500 text-base mt-1">{t("joinPrinting")}</p>
      </div>

      <form onSubmit={handleSignUp} className="w-full max-w-sm space-y-4 mt-2">
        <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-1 shadow-sm border border-gray-200 focus-within:border-blue-400 transition-colors">
          <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder={t("firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="flex-1 py-4 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base" />
        </div>
        <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-1 shadow-sm border border-gray-200 focus-within:border-blue-400 transition-colors">
          <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder={t("lastName")} value={lastName} onChange={(e) => setLastName(e.target.value)} required className="flex-1 py-4 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base" />
        </div>
        <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-1 shadow-sm border border-gray-200 focus-within:border-blue-400 transition-colors">
          <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input type="email" placeholder={t("emailAddress")} value={email} onChange={(e) => setEmail(e.target.value)} required className="flex-1 py-4 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base" />
        </div>
        <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-1 shadow-sm border border-gray-200 focus-within:border-blue-400 transition-colors">
          <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input type={showPassword ? "text" : "password"} placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="flex-1 py-4 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base" />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-gray-400 hover:text-gray-600 transition-colors">
            {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600 active:scale-[0.98] transition-all duration-150 text-white rounded-2xl py-5 text-xl font-bold shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2">
          {loading ? t("creatingAccount") : t("createAccount")}
        </button>
      </form>

      <p className="mt-8 text-gray-500 text-base">
        {t("alreadyHaveAccount")}{" "}
        <button onClick={() => navigate("/login")} className="text-blue-500 font-semibold hover:underline">{t("signIn")}</button>
      </p>
    </div>
  );
}
