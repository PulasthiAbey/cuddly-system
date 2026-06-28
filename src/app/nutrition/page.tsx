"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Calendar, Activity, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

type WeightLog = {
    log_date: string;
    weight_kg: number;
};

type BloodTest = {
    id: string;
    test_date: string;
    fasting_insulin: number;
    fasting_glucose: number;
    hba1c: number;
    triglycerides: number;
    hdl: number;
};

export default function MetricsTracker() {
    const [activeTab, setActiveTab] = useState<"weight" | "blood">("weight");
    const [weightHistory, setWeightHistory] = useState<WeightLog[]>([]);
    const [bloodHistory, setBloodHistory] = useState<BloodTest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Blood Input Modal State
    const [showModal, setShowModal] = useState(false);
    const [insulin, setInsulin] = useState("");
    const [glucose, setGlucose] = useState("");
    const [hba1c, setHba1c] = useState("");
    const [triglycerides, setTriglycerides] = useState("");
    const [hdl, setHdl] = useState("");
    const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);

    useEffect(() => {
        async function fetchMetrics() {
            // 1. Fetch weight logs
            const { data: weightData } = await supabase
                .from("daily_logs")
                .select("log_date, weight_kg")
                .not("weight_kg", "is", null)
                .order("log_date", { ascending: true });

            // 2. Fetch blood tests
            const { data: bloodData } = await supabase
                .from("blood_tests")
                .select("*")
                .order("test_date", { ascending: false });

            if (weightData) setWeightHistory(weightData as WeightLog[]);
            if (bloodData) setBloodHistory(bloodData as BloodTest[]);
            setIsLoading(false);
        }
        fetchMetrics();
    }, []);

    const handleSaveBlood = async (e: React.FormEvent) => {
        e.preventDefault();
        const newTest = {
            test_date: testDate,
            fasting_insulin: parseFloat(insulin),
            fasting_glucose: parseFloat(glucose),
            hba1c: parseFloat(hba1c),
            triglycerides: parseFloat(triglycerides),
            hdl: parseFloat(hdl),
        };

        const { data, error } = await supabase.from("blood_tests").insert([newTest]).select().single();

        if (error) {
            alert("Failed to save blood panel!");
        } else if (data) {
            setBloodHistory([data, ...bloodHistory]);
            setShowModal(false);
            // Reset fields
            setInsulin(""); setGlucose(""); setHba1c(""); setTriglycerides(""); setHdl("");
        }
    };

    // Helper: Calculate HOMA-IR (Fasting Insulin * Fasting Glucose / 22.5)
    const calculateHomaIR = (insulin: number, glucose: number) => {
        if (!insulin || !glucose) return null;
        return ((insulin * glucose) / 22.5).toFixed(2);
    };

    // Helper: Optimal Marker Checks
    const getMarkerStatus = (val: number, type: "insulin" | "homa" | "hba1c") => {
        if (type === "insulin") return val < 6.0 ? "text-[#00FFFF]" : "text-yellow-500";
        if (type === "homa") return val < 1.0 ? "text-[#00FFFF]" : val > 1.9 ? "text-red-500" : "text-yellow-500";
        if (type === "hba1c") return val < 5.7 ? "text-[#00FFFF]" : val >= 6.5 ? "text-red-500" : "text-yellow-500";
        return "text-white";
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-[#00FFFF]">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    // Calculate latest weight metrics
    const latestWeight = weightHistory[weightHistory.length - 1]?.weight_kg || 110.0;
    const startWeight = 110.0;
    const progressPercent = Math.min(100, Math.max(0, ((startWeight - latestWeight) / (startWeight - 99.0)) * 100));

    return (
        <main className="min-h-screen p-4 pb-28 text-white bg-black">
            <header className="mb-6 mt-4">
                <h1 className="text-3xl font-bold tracking-tight">Body & <span className="text-[#00FFFF]">Blood</span></h1>
                <p className="text-gray-400 text-sm mt-1">Track your biochemical transformation</p>
            </header>

            {/* Sub Tabs */}
            <div className="flex bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800">
                <button
                    onClick={() => setActiveTab("weight")}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                        activeTab === "weight" ? "bg-[#00FFFF] text-black" : "text-gray-400"
                    }`}
                >
                    Scale Progress
                </button>
                <button
                    onClick={() => setActiveTab("blood")}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                        activeTab === "blood" ? "bg-[#00FFFF] text-black" : "text-gray-400"
                    }`}
                >
                    Lab Panels
                </button>
            </div>

            {/* --- SCALE WEIGHT PANEL --- */}
            {activeTab === "weight" && (
                <div className="space-y-6">
                    {/* Milestone Target Card */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Current Weight</span>
                                <h2 className="text-3xl font-bold mt-1">{latestWeight} <span className="text-sm text-gray-500">kg</span></h2>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">First Goal</span>
                                <h2 className="text-xl font-bold mt-1 text-[#00FFFF]">99.0 kg</h2>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-black rounded-full h-3 border border-gray-800 overflow-hidden">
                            <div
                                className="bg-[#00FFFF] h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,255,255,0.5)]"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 text-right">
                            {progressPercent.toFixed(0)}% of the way to double digits!
                        </p>
                    </div>

                    {/* Chart Card */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg">
                        <h3 className="text-sm font-semibold text-gray-400 mb-4">Weight Trend</h3>
                        <div className="h-64 w-full">
                            {weightHistory.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-600 italic">
                                    Log your morning weight on the dashboard to build trends
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={weightHistory}>
                                        <XAxis dataKey="log_date" stroke="#4b5563" fontSize={11} tickLine={false} />
                                        <YAxis domain={['auto', 'auto']} stroke="#4b5563" fontSize={11} tickLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "#1f2937", borderRadius: "10px" }} />
                                        <Line
                                            type="monotone"
                                            dataKey="weight_kg"
                                            stroke="#00FFFF"
                                            strokeWidth={3}
                                            dot={{ fill: "#00FFFF", r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- BLOOD PANELS --- */}
            {activeTab === "blood" && (
                <div className="space-y-6">
                    {/* Info Card */}
                    <div className="bg-[#00FFFF]/5 border border-[#00FFFF]/20 rounded-2xl p-4 flex gap-3 text-sm">
                        <Info className="text-[#00FFFF] shrink-0" size={20} />
                        <p className="text-gray-300 leading-relaxed">
                            Target a <strong className="text-white">Fasting Insulin &lt; 6.0 uIU/mL</strong> and a <strong className="text-white">HOMA-IR &lt; 1.0</strong> to indicate optimal metabolic flexibility and reversed resistance.
                        </p>
                    </div>

                    {/* Log List */}
                    <div className="space-y-4">
                        {bloodHistory.map((test) => {
                            const homa = calculateHomaIR(test.fasting_insulin, test.fasting_glucose);
                            return (
                                <div key={test.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg">
                                    <div className="flex items-center gap-3 border-b border-gray-800 pb-3 mb-4">
                                        <Calendar size={18} className="text-[#00FFFF]" />
                                        <span className="font-bold text-sm">
                      {new Date(test.test_date).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                    </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3">
                                            <span className="text-[10px] uppercase text-gray-500 tracking-wider">Fasting Insulin</span>
                                            <p className={`text-xl font-mono font-bold mt-1 ${getMarkerStatus(test.fasting_insulin, "insulin")}`}>
                                                {test.fasting_insulin} <span className="text-xs font-sans text-gray-500">uIU/mL</span>
                                            </p>
                                        </div>

                                        <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3">
                                            <span className="text-[10px] uppercase text-gray-500 tracking-wider">HOMA-IR</span>
                                            <p className={`text-xl font-mono font-bold mt-1 ${homa ? getMarkerStatus(parseFloat(homa), "homa") : "text-white"}`}>
                                                {homa || "N/A"}
                                            </p>
                                        </div>

                                        <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3">
                                            <span className="text-[10px] uppercase text-gray-500 tracking-wider">HbA1c</span>
                                            <p className={`text-xl font-mono font-bold mt-1 ${getMarkerStatus(test.hba1c, "hba1c")}`}>
                                                {test.hba1c}%
                                            </p>
                                        </div>

                                        <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3">
                                            <span className="text-[10px] uppercase text-gray-500 tracking-wider">TG / HDL Ratio</span>
                                            <p className="text-xl font-mono font-bold mt-1 text-white">
                                                {(test.triglycerides / test.hdl).toFixed(1)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {bloodHistory.length === 0 && (
                            <div className="text-center py-10 bg-gray-900 rounded-2xl border border-gray-800">
                                <p className="text-gray-500">No blood panels logged yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Floating action button to open Input Form Modal */}
                    <button
                        onClick={() => setShowModal(true)}
                        className="fixed bottom-24 right-4 bg-[#00FFFF] text-black p-4 rounded-full shadow-[0_4px_20px_rgba(0,255,255,0.4)] z-40 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            )}

            {/* --- LOG BLOOD INPUT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">Log Blood Results</h3>

                        <form onSubmit={handleSaveBlood} className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Test Date</label>
                                <input
                                    type="date"
                                    value={testDate}
                                    onChange={(e) => setTestDate(e.target.value)}
                                    className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-[#00FFFF] focus:outline-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Fasting Insulin (uIU/mL)</label>
                                    <input
                                        type="number" step="0.1" value={insulin} onChange={(e) => setInsulin(e.target.value)}
                                        placeholder="e.g. 5.5" className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-[#00FFFF] focus:outline-none" required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Fasting Glucose (mg/dL)</label>
                                    <input
                                        type="number" step="1" value={glucose} onChange={(e) => setGlucose(e.target.value)}
                                        placeholder="e.g. 85" className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-[#00FFFF] focus:outline-none" required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">HbA1c (%)</label>
                                    <input
                                        type="number" step="0.1" value={hba1c} onChange={(e) => setHba1c(e.target.value)}
                                        placeholder="5.4" className="w-full bg-black border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-[#00FFFF] focus:outline-none" required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">Triglycerides</label>
                                    <input
                                        type="number" step="1" value={triglycerides} onChange={(e) => setTriglycerides(e.target.value)}
                                        placeholder="110" className="w-full bg-black border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-[#00FFFF] focus:outline-none" required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">HDL</label>
                                    <input
                                        type="number" step="1" value={hdl} onChange={(e) => setHdl(e.target.value)}
                                        placeholder="45" className="w-full bg-black border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-[#00FFFF] focus:outline-none" required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 bg-gray-800 text-white p-3 rounded-xl hover:bg-gray-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-[#00FFFF] text-black p-3 rounded-xl font-bold shadow-[0_4px_15px_rgba(0,255,255,0.3)] hover:bg-cyan-400 transition"
                                >
                                    Save Panel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
