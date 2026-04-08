import { useState } from "react";
import { Settings, Plus, FileText, Clock, MapPin, SlidersHorizontal, CheckSquare, ChevronRight } from "lucide-react";
import NewPrintOrderModal from "@/components/NewPrintOrderModal";

const orders = [
  {
    id: 1,
    files: 2,
    status: "SUBMITTED",
    location: "Staples Print & Marketing",
    copies: 1,
    size: 'Letter (8.5" x 11")',
    color: "Color",
    date: "Mar 11, 11:45 PM",
  },
  {
    id: 2,
    files: 1,
    status: "SUBMITTED",
    location: "Staples Print & Marketing",
    copies: 1,
    size: 'Letter (8.5" x 11")',
    color: "Color",
    date: "Mar 6, 9:04 PM",
  },
];

const steps = [
  { label: "Upload", icon: "upload", color: "bg-blue-100", iconColor: "text-blue-500" },
  { label: "Location", icon: "location", color: "bg-green-100", iconColor: "text-green-500" },
  { label: "Options", icon: "options", color: "bg-orange-100", iconColor: "text-orange-400" },
  { label: "Submit", icon: "submit", color: "bg-purple-100", iconColor: "text-purple-500" },
];

function StepIcon({ icon, color, iconColor }: { icon: string; color: string; iconColor: string }) {
  const cls = `w-14 h-14 rounded-full ${color} flex items-center justify-center`;
  if (icon === "upload")
    return (
      <div className={cls}>
        <svg className={`w-7 h-7 ${iconColor}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
    );
  if (icon === "location")
    return (
      <div className={cls}>
        <MapPin className={`w-7 h-7 ${iconColor}`} />
      </div>
    );
  if (icon === "options")
    return (
      <div className={cls}>
        <SlidersHorizontal className={`w-7 h-7 ${iconColor}`} />
      </div>
    );
  if (icon === "submit")
    return (
      <div className={cls}>
        <CheckSquare className={`w-7 h-7 ${iconColor}`} />
      </div>
    );
  return null;
}

export default function Index() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header */}
      <div className="px-5 pt-10 pb-4 bg-gray-100">
        <p className="text-gray-500 text-sm font-medium mb-1">Hello, Test</p>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Printing 24/7</h1>
          <button className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-50 transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-5 pb-10">
        {/* New Print Order Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-blue-500 hover:bg-blue-600 active:scale-[0.98] transition-all duration-150 text-white rounded-2xl py-5 flex items-center justify-center gap-3 shadow-lg shadow-blue-200"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" strokeWidth={3} />
          </div>
          <span className="text-xl font-semibold">New Print Order</span>
        </button>

        {/* How It Works */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">How It Works</h2>
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <StepIcon icon={step.icon} color={step.color} iconColor={step.iconColor} />
                  <span className="text-xs font-medium text-gray-600">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 mx-1 mb-5 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Your Orders */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Your Orders</h2>
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500 font-medium">
                      {order.files} {order.files === 1 ? "file" : "files"}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 bg-orange-50 text-orange-500 text-xs font-bold px-3 py-1 rounded-full border border-orange-200">
                    <Clock className="w-3.5 h-3.5" />
                    {order.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">{order.location}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>{order.copies} copy</span>
                  <span>•</span>
                  <span>{order.size}</span>
                  <span>•</span>
                  <span>{order.color}</span>
                  <span className="ml-auto text-gray-400 text-xs">{order.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && <NewPrintOrderModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
