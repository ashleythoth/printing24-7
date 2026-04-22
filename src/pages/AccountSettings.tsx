import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Mail, Phone, CreditCard, Trash2,
  Loader2, Check, AlertCircle, Plus, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

declare global {
  interface Window { Square?: any; }
}

const SQUARE_APP_ID = "sandbox-sq0idb-REPLACE_ME";
const SQUARE_LOCATION_ID = "REPLACE_ME";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  square_customer_id: string | null;
  square_card_id: string | null;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
}

function cardBrandIcon(brand: string | null) {
  const b = (brand ?? "").toLowerCase();
  if (b.includes("visa")) return "💳 Visa";
  if (b.includes("mastercard")) return "💳 Mastercard";
  if (b.includes("amex") || b.includes("american")) return "💳 Amex";
  if (b.includes("discover")) return "💳 Discover";
  return "💳 Card";
}

export default function AccountSettings() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [showAddCard, setShowAddCard] = useState(false);
  const [squareCard, setSquareCard] = useState<any>(null);
  const [squareLoading, setSquareLoading] = useState(false);
  const [cardSaving, setCardSaving] = useState(false);
  const [cardError, setCardError] = useState("");
  const [removingCard, setRemovingCard] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data as Profile);
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setPhone(data.phone ?? "");
      }
      setProfileLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!showAddCard) { setSquareCard(null); return; }
    let card: any = null;
    async function initSquare() {
      setSquareLoading(true);
      setCardError("");
      if (!window.Square) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://sandbox.web.squarecdn.com/v1/square.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Square SDK"));
          document.head.appendChild(script);
        });
      }
      const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
      card = await payments.card();
      await card.attach(cardContainerRef.current!);
      setSquareCard(card);
      setSquareLoading(false);
    }
    initSquare().catch((err) => { setCardError(err.message ?? "Failed to load card form"); setSquareLoading(false); });
    return () => { card?.destroy?.(); };
  }, [showAddCard]);

  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileError("");
    setProfileSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    setProfileSaving(false);
    if (error) { setProfileError("Failed to save profile. Please try again."); }
    else { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); }
  }

  async function handleSaveCard() {
    if (!squareCard) return;
    setCardSaving(true);
    setCardError("");
    const result = await squareCard.tokenize();
    if (result.status !== "OK") {
      setCardError(result.errors?.[0]?.message ?? "Card tokenization failed");
      setCardSaving(false);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("https://studxxqaeilromdjayse.supabase.co/functions/v1/save-square-card", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ sourceId: result.token, existingCustomerId: profile?.square_customer_id ?? null }),
    });
    const data = await res.json();
    setCardSaving(false);
    if (!res.ok) { setCardError(data.error ?? "Failed to save card"); return; }
    setProfile((prev) => prev ? { ...prev, square_customer_id: data.customerId, square_card_id: data.cardId, card_brand: data.brand, card_last4: data.last4, card_exp_month: data.expMonth, card_exp_year: data.expYear } : prev);
    setShowAddCard(false);
  }

  async function handleRemoveCard() {
    if (!profile?.square_card_id) return;
    setRemovingCard(true);
    setCardError("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("https://studxxqaeilromdjayse.supabase.co/functions/v1/remove-square-card", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ cardId: profile.square_card_id }),
    });
    const data = await res.json();
    setRemovingCard(false);
    if (!res.ok) { setCardError(data.error ?? "Failed to remove card"); return; }
    setProfile((prev) => prev ? { ...prev, square_card_id: null, card_brand: null, card_last4: null, card_exp_month: null, card_exp_year: null } : prev);
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="px-5 pt-10 pb-4 bg-gray-100">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-blue-500 font-semibold mb-4 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          {t("back")}
        </button>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t("accountSettingsTitle")}</h1>
        <p className="text-gray-500 text-sm mt-1">{t("manageProfile")}</p>
      </div>

      <div className="px-4 pb-12 space-y-5">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-base font-bold text-gray-900">{t("personalInfo")}</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{t("emailAddress")}</label>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-500">{email}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{t("firstName")}</label>
              <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-1 border-2 border-gray-200 focus-within:border-blue-400 transition-colors">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t("firstName")} className="flex-1 py-3 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{t("lastName")}</label>
              <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-1 border-2 border-gray-200 focus-within:border-blue-400 transition-colors">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t("lastName")} className="flex-1 py-3 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{t("phone")}</label>
              <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-1 border-2 border-gray-200 focus-within:border-blue-400 transition-colors">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phoneNumber")} className="flex-1 py-3 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400" />
              </div>
            </div>
            {profileError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-red-600 text-sm">{profileError}</p>
              </div>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className={`w-full rounded-2xl py-4 font-semibold text-base flex items-center justify-center gap-2 transition-all ${profileSaved ? "bg-green-500 text-white" : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-100"} disabled:opacity-60`}
            >
              {profileSaving ? <><Loader2 className="w-5 h-5 animate-spin" />{t("saving")}</> : profileSaved ? <><Check className="w-5 h-5" />{t("saved")}</> : t("saveProfile")}
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-gray-900">{t("paymentMethod")}</h2>
              <p className="text-xs text-gray-400">{t("savedCardHint")}</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            {profile?.square_card_id ? (
              <div className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-4 border border-gray-200">
                <div className="w-12 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800">{cardBrandIcon(profile.card_brand)} •••• {profile.card_last4}</p>
                  <p className="text-xs text-gray-500">{t("expires")} {profile.card_exp_month?.toString().padStart(2, "0")}/{profile.card_exp_year}</p>
                </div>
                <button onClick={handleRemoveCard} disabled={removingCard} className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors flex-shrink-0">
                  {removingCard ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-400" />}
                </button>
              </div>
            ) : !showAddCard ? (
              <button onClick={() => setShowAddCard(true)} className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-5 flex items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50 transition-all group">
                <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                </div>
                <span className="text-sm font-semibold text-gray-500 group-hover:text-blue-600 transition-colors">{t("addPaymentCard")}</span>
              </button>
            ) : null}

            {showAddCard && !profile?.square_card_id && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">{t("enterCardDetails")}</p>
                {squareLoading && !squareCard && (
                  <div className="flex items-center justify-center py-8 gap-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    <span className="text-gray-500 text-sm">{t("loadingPayment")}</span>
                  </div>
                )}
                <div ref={cardContainerRef} className={`min-h-[100px] rounded-2xl border-2 border-gray-200 bg-white px-2 py-2 ${squareLoading && !squareCard ? "hidden" : ""}`} />
                {cardError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-600 text-sm">{cardError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => { setShowAddCard(false); setCardError(""); }} className="flex-1 border-2 border-gray-200 text-gray-600 rounded-2xl py-3.5 font-semibold text-sm hover:bg-gray-50 transition-colors">{t("cancel")}</button>
                  <button onClick={handleSaveCard} disabled={cardSaving || !squareCard} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
                    {cardSaving ? <><Loader2 className="w-4 h-4 animate-spin" />{t("saving")}</> : t("saveCard")}
                  </button>
                </div>
              </div>
            )}

            {cardError && !showAddCard && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{cardError}</p>
              </div>
            )}

            <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-4 py-3">
              <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">
                {t("cardSecurityNote")} <span className="font-semibold">Square</span>{t("cardSecurityNote2")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}