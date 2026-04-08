import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SignUp() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
        <p className="text-gray-500 text-sm mb-6">Check your email to confirm your account, then sign in.</p>
        <button
          onClick={() => navigate("/login")}
          className="w-full max-w-sm bg-blue-500 text-white rounded-2xl py-5 text-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-600 transition-colors"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <div className="w-28 h-28 rounded-[24px] overflow-hidden shadow-xl mb-5">
          <div className="w-full h-full bg-black flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-black" />
            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-2">
              <span className="text-yellow-400 font-bold text-base leading-tight" style={{ fontFamily: "cursive" }}>
                Solutions
              </span>
              <span className="text-blue-500 font-extrabold text-xl tracking-widest leading-tight">PRINT</span>
              <div className="w-full bg-blue-600 rounded-lg px-2 py-0.5 my-0.5 flex flex-col items-center">
                <span className="text-yellow-400 font-bold text-[10px]">Printing</span>
                <span className="text-yellow-400 font-extrabold text-2xl leading-none">24/7</span>
              </div>
              <span className="text-blue-500 font-extrabold text-xl tracking-widest leading-tight">PHOTO</span>
              <span className="text-gray-400 text-[7px] tracking-wider mt-0.5">Global Printing Network</span>
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Account</h1>
        <p className="text-gray-500 text-base mt-1">Join Printing 24/7</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSignUp} className="w-full max-w-sm space-y-4 mt-2">
        {/* First Name */}
        <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-1 shadow-sm border border-gray-200 focus-within:border-blue-400 transition-colors">
          <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="flex-1 py-4 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base"
          />
        </div>

        {/* Last Name */}
        <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-1 shadow-sm border border-gray-200 focus-within:border-blue-400 transition-colors">
          <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="flex-1 py-4 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base"
          />
        </div>

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
            minLength={6}
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

        {/* Sign Up Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 active:scale-[0.98] transition-all duration-150 text-white rounded-2xl py-5 text-xl font-bold shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      {/* Sign In Link */}
      <p className="mt-8 text-gray-500 text-base">
        Already have an account?{" "}
        <button
          onClick={() => navigate("/login")}
          className="text-blue-500 font-semibold hover:underline"
        >
          Sign In
        </button>
      </p>
    </div>
  );
}
