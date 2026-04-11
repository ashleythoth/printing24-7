import { useState, useRef, useEffect } from "react";
import {
  X, Upload, MapPin, CheckSquare, ChevronRight, FileText,
  Check, Loader2, AlertCircle, CreditCard, DollarSign,
  Phone, Mail, Camera, FileType,
} from "lucide-react";
import { getPageCount } from "@/utils/pageCount";
import { calculatePriceFromTiers, getApplicableTier, formatPrice, formatUnitPrice } from "@/utils/pricing";
import { supabase } from "@/integrations/supabase/client";
import type { PrintShop, ShopProduct } from "@/integrations/supabase/types";

declare global {
  interface Window { Square?: any; }
}

type Step = "upload" | "location" | "product" | "options" | "payment" | "submit";
const STEPS: Step[] = ["upload", "location", "product", "options", "payment", "submit"];
const STEP_LABELS: Record<Step, string> = {
  upload: "Upload", location: "Location", product: "Product",
  options: "Options", payment: "Payment", submit: "Submit",
};

const SQUARE_APP_ID = "sandbox-sq0idb-REPLACE_ME";
const SQUARE_LOCATION_ID = "REPLACE_ME";

interface FileWithPages {
  file: File;
  pages: number | null;
  loading: boolean;
}

export default function NewPrintOrderModal({
  onClose, onOrderCreated,
}: {
  onClose: () => void;
  onOrderCreated?: () => void;
}) {
  const [step, setStep] = useState<Step>("upload");

  // Upload
  const [files, setFiles] = useState<FileWithPages[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location
  const [shops, setShops] = useState<PrintShop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [selectedShop, setSelectedShop] = useState<PrintShop | null>(null);

  // Product
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [shopProductsLoading, setShopProductsLoading] = useState(false);
  const [selectedShopProduct, setSelectedShopProduct] = useState<ShopProduct | null>(null);

  // Options
  const [colorMode, setColorMode] = useState("");
  const [sides, setSides] = useState("");
  const [size, setSize] = useState("");
  const [finish, setFinish] = useState("");
  const [copies, setCopies] = useState(1);

  // Payment
  const [squareCard, setSquareCard] = useState<any>(null);
  const [squareLoading, setSquareLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // Submit
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const stepIndex = STEPS.indexOf(step);
  const totalPages = files.reduce((sum, f) => sum + (f.pages ?? 0), 0);
  const anyLoading = files.some((f) => f.loading);

  // Quantity = pages * copies for docs, copies for photos (per print)
  const isPhoto = selectedShopProduct?.products?.print_type === "photo";
  const quantity = isPhoto ? copies : totalPages * copies;
  const tiers = selectedShopProduct?.pricing_tiers ?? [];
  const totalPrice = calculatePriceFromTiers(quantity, tiers);
  const applicableTier = getApplicableTier(quantity, tiers);

  // Load shops
  useEffect(() => {
    setShopsLoading(true);
    supabase.from("print_shops").select("*").eq("status", "active").order("name")
      .then(({ data }) => { setShops(data as PrintShop[] ?? []); setShopsLoading(false); });
  }, []);

  // Load shop's enabled products when shop is selected
  useEffect(() => {
    if (!selectedShop) return;
    setShopProductsLoading(true);
    setSelectedShopProduct(null);
    supabase
      .from("shop_products")
      .select("*, products(*), pricing_tiers(*)")
      .eq("shop_id", selectedShop.id)
      .eq("enabled", true)
      .then(({ data }) => {
        setShopProducts((data as ShopProduct[]) ?? []);
        setShopProductsLoading(false);
      });
  }, [selectedShop]);

  // Reset options when product changes
  useEffect(() => {
    if (!selectedShopProduct) return;
    const p = selectedShopProduct.products;
    setColorMode(p.color_modes[0] ?? "");
    setSides(p.sides[0] ?? "");
    setSize(p.sizes[0] ?? "");
    setFinish(p.finishes[0] ?? "");
    setCopies(1);
  }, [selectedShopProduct]);

  // Square SDK
  useEffect(() => {
    if (step !== "payment" || paymentToken) return;
    let card: any = null;
    async function initSquare() {
      setSquareLoading(true);
      setPaymentError("");
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
    initSquare().catch((err) => { setPaymentError(err.message ?? "Failed to load payment form"); setSquareLoading(false); });
    return () => { card?.destroy?.(); };
  }, [step]);

  async function handleTokenize() {
    if (!squareCard) return;
    setPaymentError("");
    setSquareLoading(true);
    const result = await squareCard.tokenize();
    setSquareLoading(false);
    if (result.status === "OK") {
      setPaymentToken(result.token);
    } else {
      setPaymentError(result.errors?.[0]?.message ?? "Card tokenization failed");
    }
  }

  function nextStep() {
    if (step === "payment" && !paymentToken) { handleTokenize(); return; }
    if (step === "submit") { handleSubmitOrder(); return; }
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  function prevStep() {
    if (step === "submit") { setPaymentToken(null); setStep("payment"); return; }
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }

  async function handleSubmitOrder() {
    setSubmitting(true);
    setSubmitError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitError("You must be logged in."); setSubmitting(false); return; }

    // 1. Charge via Square
    setUploadProgress("Processing payment…");
    const amountCents = Math.round(totalPrice * 100);
    const { data: { session } } = await supabase.auth.getSession();
    const paymentRes = await fetch(
      "https://studxxqaeilromdjayse.supabase.co/functions/v1/create-square-payment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          sourceId: paymentToken,
          amountCents,
          idempotencyKey: crypto.randomUUID(),
          note: `${selectedShopProduct?.products?.name} — ${files.length} file(s), ${quantity} ${isPhoto ? "prints" : "pages"}`,
        }),
      }
    );
    const paymentData = await paymentRes.json();
    if (!paymentRes.ok) { setSubmitError(paymentData.error ?? "Payment failed."); setSubmitting(false); setUploadProgress(""); return; }

    // 2. Upload files
    const orderId = crypto.randomUUID();
    const filePaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const path = `${user.id}/${orderId}/${i + 1}_${f.file.name}`;
      setUploadProgress(`Uploading file ${i + 1} of ${files.length}…`);
      const { error } = await supabase.storage.from("print-orders").upload(path, f.file, { upsert: false });
      if (error) { setSubmitError(`Failed to upload ${f.file.name}: ${error.message}`); setSubmitting(false); setUploadProgress(""); return; }
      filePaths.push(path);
    }

    // 3. Save order
    setUploadProgress("Saving order…");
    const { error: dbError } = await supabase.from("print_orders").insert({
      id: orderId,
      user_id: user.id,
      shop_id: selectedShop!.id,
      shop_product_id: selectedShopProduct!.id,
      copies,
      color_mode: colorMode,
      sides,
      size,
      finish,
      total_quantity: quantity,
      total_price: totalPrice,
      file_paths: filePaths,
      status: "SUBMITTED",
    });
    setSubmitting(false);
    setUploadProgress("");
    if (dbError) { setSubmitError(`Failed to save order: ${dbError.message}`); return; }
    setSubmitted(true);
    onOrderCreated?.();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const newFiles: FileWithPages[] = Array.from(e.target.files).map((file) => ({ file, pages: null, loading: true }));
    setFiles((prev) => [...prev, ...newFiles]);
    for (const fw of newFiles) {
      const pages = await getPageCount(fw.file);
      setFiles((prev) => prev.map((f) => f.file === fw.file ? { ...f, pages, loading: false } : f));
    }
    e.target.value = "";
  }

  function removeFile(index: number) { setFiles((prev) => prev.filter((_, i) => i !== index)); }

  const canProceed =
    (step === "upload" && files.length > 0 && !anyLoading) ||
    (step === "location" && selectedShop !== null) ||
    (step === "product" && selectedShopProduct !== null) ||
    (step === "options" && (isPhoto ? (size !== "" && finish !== "") : true) && colorMode !== "" && sides !== "") ||
    (step === "payment" && (!!squareCard || !!paymentToken) && !squareLoading) ||
    (step === "submit" && !submitting);

  // ── SUCCESS ──
  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
        <div className="bg-white w-full max-w-md rounded-t-3xl p-8 flex flex-col items-center gap-4 animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-2">
            <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Order Submitted!</h2>
          <p className="text-gray-500 text-center text-sm">Your payment was successful and your print order has been submitted.</p>
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3 w-full text-center">
            <p className="text-green-700 font-bold text-lg">{formatPrice(totalPrice)} charged</p>
          </div>
          <button onClick={onClose} className="w-full bg-blue-500 text-white rounded-2xl py-4 font-semibold text-base mt-2 hover:bg-blue-600 transition-colors">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-xl font-bold text-gray-900">New Print Order</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center px-5 pb-4 gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors duration-300 ${i <= stepIndex ? "bg-blue-500" : "bg-gray-200"}`} />
            </div>
          ))}
        </div>

        <div className="px-5 pb-2">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest">
            Step {stepIndex + 1} of {STEPS.length} — {STEP_LABELS[step]}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">

          {/* ── UPLOAD ── */}
          {step === "upload" && (
            <>
              <h3 className="text-lg font-bold text-gray-800">Upload Your Files</h3>
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-blue-300 rounded-2xl py-10 flex flex-col items-center gap-3 bg-blue-50 hover:bg-blue-100 transition-colors">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-blue-500" />
                </div>
                <span className="text-blue-600 font-semibold">Tap to upload files</span>
                <span className="text-gray-400 text-xs">PDF, DOCX, JPG, PNG supported</span>
              </button>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate font-medium">{f.file.name}</p>
                        <p className="text-xs text-gray-400">
                          {(f.file.size / 1024).toFixed(0)} KB · {f.loading ? (
                            <span className="inline-flex items-center gap-1 text-blue-400"><Loader2 className="w-3 h-3 animate-spin" />Detecting pages…</span>
                          ) : (
                            <span className="text-gray-500 font-medium">{f.pages} {f.pages === 1 ? "page" : "pages"}</span>
                          )}
                        </p>
                      </div>
                      <button onClick={() => removeFile(i)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {!anyLoading && totalPages > 0 && (
                    <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                      <span className="text-sm font-semibold text-blue-700">Total pages</span>
                      <span className="text-sm font-bold text-blue-700">{totalPages}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── LOCATION ── */}
          {step === "location" && (
            <>
              <h3 className="text-lg font-bold text-gray-800">Choose a Location</h3>
              {shopsLoading ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  <span className="text-gray-500 text-sm">Loading locations…</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {shops.map((shop) => {
                    const selected = selectedShop?.id === shop.id;
                    return (
                      <button key={shop.id} onClick={() => setSelectedShop(shop)}
                        className={`w-full flex items-start gap-3 rounded-2xl px-4 py-4 border-2 transition-all text-left ${selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? "bg-blue-100" : "bg-gray-100"}`}>
                          <MapPin className={`w-5 h-5 ${selected ? "text-blue-500" : "text-gray-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${selected ? "text-blue-700" : "text-gray-800"}`}>{shop.name}</p>
                          {shop.address && <p className="text-xs text-gray-500 mt-0.5">{shop.address}</p>}
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            {shop.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{shop.phone}</span>}
                            {shop.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail className="w-3 h-3" />{shop.email}</span>}
                          </div>
                        </div>
                        {selected && <Check className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── PRODUCT ── */}
          {step === "product" && (
            <>
              <h3 className="text-lg font-bold text-gray-800">Choose a Product</h3>
              {shopProductsLoading ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  <span className="text-gray-500 text-sm">Loading products…</span>
                </div>
              ) : shopProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No products available at this location.</div>
              ) : (
                <>
                  {/* Group by type */}
                  {(["document", "photo"] as const).map((type) => {
                    const group = shopProducts.filter((sp) => sp.products?.print_type === type);
                    if (group.length === 0) return null;
                    return (
                      <div key={type}>
                        <div className="flex items-center gap-2 mb-2">
                          {type === "document" ? <FileType className="w-4 h-4 text-blue-500" /> : <Camera className="w-4 h-4 text-purple-500" />}
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{type === "document" ? "Documents" : "Photos"}</p>
                        </div>
                        <div className="space-y-2 mb-4">
                          {group.map((sp) => {
                            const selected = selectedShopProduct?.id === sp.id;
                            const p = sp.products;
                            const lowestTier = sp.pricing_tiers?.sort((a, b) => a.min_quantity - b.min_quantity)[0];
                            return (
                              <button key={sp.id} onClick={() => setSelectedShopProduct(sp)}
                                className={`w-full flex items-start gap-3 rounded-2xl px-4 py-4 border-2 transition-all text-left ${selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? (type === "photo" ? "bg-purple-100" : "bg-blue-100") : "bg-gray-100"}`}>
                                  {type === "document"
                                    ? <FileType className={`w-5 h-5 ${selected ? "text-blue-500" : "text-gray-400"}`} />
                                    : <Camera className={`w-5 h-5 ${selected ? "text-purple-500" : "text-gray-400"}`} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-bold ${selected ? "text-blue-700" : "text-gray-800"}`}>{p?.name}</p>
                                  {p?.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {p?.color_modes?.map((c) => <span key={c} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c}</span>)}
                                    {p?.sizes?.slice(0, 3).map((s) => <span key={s} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{s}</span>)}
                                    {p?.finishes?.map((f) => <span key={f} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{f}</span>)}
                                  </div>
                                  {lowestTier && (
                                    <p className="text-xs text-blue-600 font-semibold mt-1.5">
                                      From {formatUnitPrice(lowestTier.unit_price)}/{type === "photo" ? "print" : "page"}
                                    </p>
                                  )}
                                </div>
                                {selected && <Check className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* ── OPTIONS ── */}
          {step === "options" && selectedShopProduct && (
            <>
              <h3 className="text-lg font-bold text-gray-800">Print Options</h3>
              <p className="text-sm text-gray-500 -mt-2">{selectedShopProduct.products?.name}</p>

              {/* Color Mode */}
              {selectedShopProduct.products?.color_modes?.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedShopProduct.products.color_modes.map((c) => (
                      <button key={c} onClick={() => setColorMode(c)}
                        className={`rounded-xl px-4 py-2.5 text-sm font-medium border-2 transition-all ${colorMode === c ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sides */}
              {selectedShopProduct.products?.sides?.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Sides</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedShopProduct.products.sides.map((s) => (
                      <button key={s} onClick={() => setSides(s)}
                        className={`rounded-xl px-4 py-2.5 text-sm font-medium border-2 transition-all ${sides === s ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo Size */}
              {isPhoto && selectedShopProduct.products?.sizes?.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Print Size</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedShopProduct.products.sizes.map((s) => (
                      <button key={s} onClick={() => setSize(s)}
                        className={`rounded-xl px-4 py-2.5 text-sm font-medium border-2 transition-all ${size === s ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Finish */}
              {isPhoto && selectedShopProduct.products?.finishes?.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Finish</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedShopProduct.products.finishes.map((f) => (
                      <button key={f} onClick={() => setFinish(f)}
                        className={`rounded-xl px-4 py-2.5 text-sm font-medium border-2 transition-all ${finish === f ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Copies */}
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 block">
                  {isPhoto ? "Number of Prints" : "Copies"}
                </label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setCopies((c) => Math.max(1, c - 1))}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">−</button>
                  <span className="text-2xl font-bold text-gray-900 w-8 text-center">{copies}</span>
                  <button onClick={() => setCopies((c) => c + 1)}
                    className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold text-white hover:bg-blue-600 transition-colors">+</button>
                </div>
              </div>

              {/* Pricing breakdown */}
              {tiers.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 space-y-2">
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Pricing</p>
                  {[...tiers].sort((a, b) => a.min_quantity - b.min_quantity).map((tier) => {
                    const isActive = applicableTier?.id === tier.id;
                    return (
                      <div key={tier.id} className={`flex justify-between text-sm rounded-lg px-2 py-1 transition-colors ${isActive ? "bg-blue-200/50 font-bold text-blue-800" : "text-blue-700"}`}>
                        <span>
                          {tier.min_quantity}{tier.max_quantity ? `–${tier.max_quantity}` : "+"} {isPhoto ? "prints" : "pages"}
                          {isActive && <span className="ml-2 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">current</span>}
                        </span>
                        <span>{formatUnitPrice(tier.unit_price)}/{isPhoto ? "print" : "page"}</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-blue-200 pt-2 flex justify-between font-bold text-blue-800 text-base">
                    <span>
                      {isPhoto ? `${copies} prints` : `${totalPages} pages × ${copies} ${copies === 1 ? "copy" : "copies"}`}
                    </span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── PAYMENT ── */}
          {step === "payment" && (
            <>
              <h3 className="text-lg font-bold text-gray-800">Payment</h3>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-semibold text-blue-700">Amount due</span>
                </div>
                <span className="text-xl font-extrabold text-blue-800">{formatPrice(totalPrice)}</span>
              </div>
              {paymentToken ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-4">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-green-700 font-semibold text-sm">Card saved</p>
                    <p className="text-green-600 text-xs">Your card details are ready. Click Next to review and submit.</p>
                  </div>
                </div>
              ) : (
                <>
                  {squareLoading && !squareCard && (
                    <div className="flex items-center justify-center py-10 gap-3">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                      <span className="text-gray-500 text-sm">Loading payment form…</span>
                    </div>
                  )}
                  <div ref={cardContainerRef} className={`min-h-[100px] rounded-2xl border-2 border-gray-200 overflow-hidden bg-white px-2 py-2 ${squareLoading && !squareCard ? "hidden" : ""}`} />
                  {paymentError && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-red-600 text-sm">{paymentError}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 text-center">🔒 Payments are securely processed by Square</p>
                </>
              )}
            </>
          )}

          {/* ── SUBMIT ── */}
          {step === "submit" && (
            <>
              <h3 className="text-lg font-bold text-gray-800">Review & Submit</h3>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                {[
                  ["Product", selectedShopProduct?.products?.name],
                  ["Location", selectedShop?.name],
                  ["Files", `${files.length} ${files.length === 1 ? "file" : "files"}`],
                  ...(!isPhoto ? [["Total Pages", String(totalPages)]] : []),
                  ["Color", colorMode],
                  ["Sides", sides],
                  ...(isPhoto ? [["Size", size], ["Finish", finish]] : []),
                  ["Copies", String(copies)],
                  ...(isPhoto ? [["Total Prints", String(quantity)]] : []),
                ].map(([label, value], i, arr) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">{label}</span>
                      <span className="text-gray-800 font-semibold text-right max-w-[60%]">{value}</span>
                    </div>
                    {i < arr.length - 1 && <div className="h-px bg-gray-200 mt-3" />}
                  </div>
                ))}
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-gray-700">Total</span>
                  <span className="text-blue-600 text-lg">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              {submitError && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{submitError}</p>
                </div>
              )}
              {submitting && uploadProgress && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                  <p className="text-blue-600 text-sm font-medium">{uploadProgress}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 flex gap-3 border-t border-gray-100">
          {stepIndex > 0 && !submitting && (
            <button onClick={prevStep} className="flex-1 border-2 border-gray-200 text-gray-600 rounded-2xl py-4 font-semibold text-base hover:bg-gray-50 transition-colors">
              Back
            </button>
          )}
          <button onClick={nextStep} disabled={!canProceed}
            className={`flex-1 rounded-2xl py-4 font-semibold text-base transition-all flex items-center justify-center gap-2 ${canProceed ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
            {step === "payment" && !paymentToken ? (
              squareLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</> : <><CreditCard className="w-5 h-5" /> Save Card</>
            ) : step === "submit" ? (
              submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</> : <><CheckSquare className="w-5 h-5" /> Pay & Submit</>
            ) : (
              <>Next <ChevronRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
