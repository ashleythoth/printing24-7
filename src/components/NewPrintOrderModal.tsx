import { useState, useRef } from "react";
import { X, Upload, MapPin, SlidersHorizontal, CheckSquare, ChevronRight, FileText, Check } from "lucide-react";

type Step = "upload" | "location" | "options" | "submit" | "done";

const STEPS: Step[] = ["upload", "location", "options", "submit"];

const STEP_LABELS: Record<Step, string> = {
  upload: "Upload",
  location: "Location",
  options: "Options",
  submit: "Submit",
  done: "Done",
};

const LOCATIONS = [
  "Staples Print & Marketing — 123 Main St",
  "Staples Print & Marketing — 456 Oak Ave",
  "FedEx Office — 789 Elm Blvd",
  "UPS Store — 321 Pine Rd",
];

interface OrderOptions {
  copies: number;
  size: string;
  color: string;
  sides: string;
}

export default function NewPrintOrderModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [location, setLocation] = useState("");
  const [options, setOptions] = useState<OrderOptions>({
    copies: 1,
    size: 'Letter (8.5" x 11")',
    color: "Color",
    sides: "One-sided",
  });
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEPS.indexOf(step);

  function nextStep() {
    if (step === "submit") {
      setSubmitted(true);
      return;
    }
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  function prevStep() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  }

  const canProceed =
    (step === "upload" && files.length > 0) ||
    (step === "location" && location !== "") ||
    step === "options" ||
    step === "submit";

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
        <div
          className="bg-white w-full max-w-md rounded-t-3xl p-8 flex flex-col items-center gap-4 animate-in slide-in-from-bottom duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-2">
            <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Order Submitted!</h2>
          <p className="text-gray-500 text-center text-sm">
            Your print order has been submitted successfully. You'll be notified when it's ready.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-blue-500 text-white rounded-2xl py-4 font-semibold text-base mt-2 hover:bg-blue-600 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-xl font-bold text-gray-900">New Print Order</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center px-5 pb-4 gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${
                  i <= stepIndex ? "bg-blue-500" : "bg-gray-200"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Step Label */}
        <div className="px-5 pb-2">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest">
            Step {stepIndex + 1} of {STEPS.length} — {STEP_LABELS[step]}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {step === "upload" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Upload Your Files</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-blue-300 rounded-2xl py-10 flex flex-col items-center gap-3 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-blue-500" />
                </div>
                <span className="text-blue-600 font-semibold">Tap to upload files</span>
                <span className="text-gray-400 text-xs">PDF, DOCX, JPG, PNG supported</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileChange}
              />
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate flex-1">{f.name}</span>
                      <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "location" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Choose a Location</h3>
              <div className="space-y-2">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocation(loc)}
                    className={`w-full flex items-center gap-3 rounded-2xl px-4 py-4 border-2 transition-all text-left ${
                      location === loc
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${location === loc ? "bg-blue-100" : "bg-gray-100"}`}>
                      <MapPin className={`w-5 h-5 ${location === loc ? "text-blue-500" : "text-gray-400"}`} />
                    </div>
                    <span className={`text-sm font-medium ${location === loc ? "text-blue-700" : "text-gray-700"}`}>{loc}</span>
                    {location === loc && <Check className="w-5 h-5 text-blue-500 ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "options" && (
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-gray-800">Print Options</h3>

              {/* Copies */}
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 block">Copies</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setOptions((o) => ({ ...o, copies: Math.max(1, o.copies - 1) }))}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    −
                  </button>
                  <span className="text-2xl font-bold text-gray-900 w-8 text-center">{options.copies}</span>
                  <button
                    onClick={() => setOptions((o) => ({ ...o, copies: o.copies + 1 }))}
                    className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold text-white hover:bg-blue-600 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Paper Size */}
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 block">Paper Size</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Letter (8.5" x 11")', 'Legal (8.5" x 14")', 'A4 (8.3" x 11.7")', 'Tabloid (11" x 17")'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setOptions((o) => ({ ...o, size: s }))}
                      className={`rounded-xl px-3 py-3 text-sm font-medium border-2 transition-all ${
                        options.size === s ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 block">Color</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Color", "Black & White"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setOptions((o) => ({ ...o, color: c }))}
                      className={`rounded-xl px-3 py-3 text-sm font-medium border-2 transition-all ${
                        options.color === c ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sides */}
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 block">Sides</label>
                <div className="grid grid-cols-2 gap-2">
                  {["One-sided", "Two-sided"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setOptions((o) => ({ ...o, sides: s }))}
                      className={`rounded-xl px-3 py-3 text-sm font-medium border-2 transition-all ${
                        options.sides === s ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "submit" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Review & Submit</h3>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Files</span>
                  <span className="text-gray-800 font-semibold">{files.length} {files.length === 1 ? "file" : "files"}</span>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Location</span>
                  <span className="text-gray-800 font-semibold text-right max-w-[60%]">{location}</span>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Copies</span>
                  <span className="text-gray-800 font-semibold">{options.copies}</span>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Paper Size</span>
                  <span className="text-gray-800 font-semibold">{options.size}</span>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Color</span>
                  <span className="text-gray-800 font-semibold">{options.color}</span>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Sides</span>
                  <span className="text-gray-800 font-semibold">{options.sides}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-5 pb-8 pt-3 flex gap-3 border-t border-gray-100">
          {stepIndex > 0 && (
            <button
              onClick={prevStep}
              className="flex-1 border-2 border-gray-200 text-gray-600 rounded-2xl py-4 font-semibold text-base hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={nextStep}
            disabled={!canProceed}
            className={`flex-1 rounded-2xl py-4 font-semibold text-base transition-all flex items-center justify-center gap-2 ${
              canProceed
                ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {step === "submit" ? (
              <>
                <CheckSquare className="w-5 h-5" />
                Submit Order
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
