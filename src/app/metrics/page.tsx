"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Calendar, Activity, Info, Save, Edit3, Target, TrendingDown } from "lucide-react";
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
    const [targetWeight, setTargetWeight] = useState<number>(99.0); // Dynamic from DB
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingWeight, setIsSavingWeight] = useState(false);

    // Inputs
    const [newWeight, setNewWeight] = useState("");
    const [showModal, setShowModal] = useState(false);

    // Blood Form States
    const [insulin, setInsulin] = useState("");
    const [glucose, setGlucose] = useState("");
    const [hba1c, setHba1c] = useState("");
    const [triglycerides, setTriglycerides] = useState("");
    const [hdl, setHdl] = useState("");
    const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);

    // Fetch metrics and user configuration
    async function fetchAllData() {
        // 1. Fetch Target Weight
        const { data: configData } = await supabase
            .from("user_configs")
            .select("config_value")
            .eq("config_key", "target_weight")
            .single();

        if (configData) {
            setTargetWeight(parseFloat(configData.config_value));
        }

        // 2. Fetch weight logs
        const { data: weightData } = await supabase
            .from("daily_logs")
            .select("log_date, weight_kg")
            .not("weight_kg", "is", null)
            .order("log_date", { ascending: true });

        // 3. Fetch blood tests
        const { data: bloodData } = await supabase
            .from("blood_tests")
            .select("*")
            .order("test_date", { ascending: false });

        if (weightData) setWeightHistory(weightData as WeightLog[]);
        if (bloodData) setBloodHistory(bloodData as BloodTest[]);
        setIsLoading(false);
    }

    useEffect(() => {
        fetchAllData();
    }, []);

    // --- DYNAMICALLY CHANGE GOAL WEIGHT ---
    const handleUpdateGoal = async () => {
        const newGoalStr = prompt("Set your new goal weight (kg):", targetWeight.toString());
        if (!newGoalStr) return;
        const newGoalVal = parseFloat(newGoalStr);
        if (isNaN(newGoalVal)) return alert("Please enter a valid number.");

        setIsLoading(true);
        const { error } = await supabase
            .from("user_configs")
            .upsert(
                { config_key: "target_weight", config_value: newGoalVal.toString() },
                { onConflict: "config_key" }
            );

        if (error) {
            alert("Failed to update goal weight.");
        } else {
            setTargetWeight(newGoalVal);
            await fetchAllData();
        }
        setIsLoading(false);
    };

    const handleSaveWeight = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWeight) return;

        setIsSavingWeight(true);
        const today = new Date().toISOString().split("T")[0];

        try {
            const { error } = await supabase
                .from("daily_logs")
                .upsert(
                    { log_date: today, weight_kg: parseFloat(newWeight) },
                    { onConflict: "log_date" }
                );

            if (error) throw error;
            setNewWeight("");
            await fetchAllData();
        } catch (err) {
            console.error(err);
            alert("Failed to save weight.");
        } finally {
            setIsSavingWeight(false);
        }
    };

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
            setInsulin(""); setGlucose(""); setHba1c(""); setTriglycerides(""); setHdl("");
        }
    };

    // --- LINEAR REGRESSION FORECAST ENGINE (Least Squares Method) ---
    const calculateForecast = () => {
        if (weightHistory.length < 3) return null; // We need at least 3 points to calculate a trend

        // To prevent ancient data from throwing off our current trend, let's take the last 15 weight entries
        const trendData = weightHistory.slice(-15);

        const startDate = new Date(trendData[0].log_date).getTime();
        const xValues = trendData.map((d) => (new Date(d.log_date).getTime() - startDate) / (1000 * 60 * 60 * 24));
        const yValues = trendData.map((d) => d.weight_kg);

        const n = trendData.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        for (let i = 0; i < n; i++) {
            sumX += xValues[i];
            sumY += yValues[i];
            sumXY += xValues[i] * yValues[i];
            sumXX += xValues[i] * xValues[i];
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

        // If you are gaining weight or stable, we cannot project a weight-loss target date
        if (slope >= 0) return { direction: "stable" };

        const intercept = (sumY - slope * sumX) / n;

        // Days required to reach target weight from the start of our trend slice
        // TargetWeight = slope * DaysToTarget + intercept -> DaysToTarget = (TargetWeight - intercept) / slope
        const targetDaysFromStart = (targetWeight - intercept) / slope;

        // Convert back to absolute timestamp and date
        const forecastTime = startDate + targetDaysFromStart * (1000 * 60 * 60 * 24);
        const forecastDate = new Date(forecastTime);

        // Weeks remaining from TODAY
        const remainingDays = Math.ceil((forecastTime - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const remainingWeeks = (remainingDays / 7).toFixed(1);

        // Calculate weekly rate of loss (slope is per day, so multiply by 7)
        const weeklyRate = Math.abs(slope * 7).toFixed(2);

        return {
            direction: "down",
            date: forecastDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            weeks: remainingWeeks,
            rate: weeklyRate
        };
    };

    const calculateHomaIR = (insulin: number, glucose: number) => {
        if (!insulin || !glucose) return null;
        return ((insulin * glucose) / 22.5).toFixed(2);
    };

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

    const latestWeight = weightHistory[weightHistory.length - 1]?.weight_kg || 110.0;
    const startWeight = 110.0;

    // Calculate relative progress bar percent based on start weight and dynamic target weight
    const progressPercent = Math.min(100, Math.max(0, ((startWeight - latestWeight) / (startWeight - targetWeight)) * 100));

    const forecast = calculateForecast();

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

                    {/* Quick Inline Weight Logger */}
                    <form onSubmit={handleSaveWeight} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
                        <div className="flex-grow">
                            <label className="block text-[10px] uppercase text-gray-500 tracking-wider mb-1 font-semibold">
                                Log Morning Weight
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={newWeight}
                                onChange={(e) => setNewWeight(e.target.value)}
                                placeholder="e.g. 108.5"
                                className="w-full bg-black border border-gray-800 rounded-lg py-2 px-3 text-white text-lg font-bold focus:border-[#00FFFF] focus:outline-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSavingWeight}
                            className="bg-[#00FFFF] text-black p-3.5 mt-4 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center justify-center min-w-[70px]"
                        >
                            {isSavingWeight ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        </button>
                    </form>

                    {/* Dynamic Milestone Target Card */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Current Weight</span>
                                <h2 className="text-3xl font-bold mt-1">{latestWeight} <span className="text-sm text-gray-500">kg</span></h2>
                            </div>
                            <div className="text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center justify-end gap-1">
                  Goal Weight
                </span>
                                {/* 💡 EDITABLE GOAL TRIGGER */}
                                <button
                                    onClick={handleUpdateGoal}
                                    className="flex items-center gap-1.5 mt-1 text-xl font-bold text-[#00FFFF] hover:underline focus:outline-none ml-auto"
                                >
                                    {targetWeight.toFixed(1)} kg <Edit3 size={14} className="text-gray-500" />
                                </button>
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
                            {progressPercent.toFixed(0)}% of the way to your target!
                        </p>
                    </div>

                    {/* 💡 NEW: Predictive Forecast Card */}
                    {forecast && forecast.direction === "down" && (
                        <div className="bg-gradient-to-r from-gray-900 to-black border border-[#00FFFF]/20 rounded-2xl p-5 shadow-lg flex gap-4 items-center">
                            <div className="bg-[#00FFFF]/10 border border-[#00FFFF]/20 p-3.5 rounded-xl">
                                <TrendingDown className="text-[#00FFFF]" size={24} />
                            </div>
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-[#00FFFF]">Trend Forecast</span>
                                <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                                    Losing an average of <strong className="text-white">{forecast.rate} kg/week</strong>. You are projected to hit your <span className="text-[#00FFFF] font-semibold">{targetWeight} kg</span> goal in <strong className="text-white">{forecast.weeks} weeks</strong>, around:
                                </p>
                                <h4 className="text-lg font-bold text-white mt-2 flex items-center gap-1.5">
                                    <Calendar size={16} className="text-[#00FFFF]" /> {forecast.date}
                                </h4>
                            </div>
                        </div>
                    )}

                    {/* Chart Card */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg">
                        <h3 className="text-sm font-semibold text-gray-400 mb-4">Weight Trend</h3>
                        <div className="h-64 w-full">
                            {weightHistory.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-600 italic">
                                    Log your morning weight to begin building trends
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
                    <div className="bg-[#00FFFF]/5 border border-[#00FFFF]/20 rounded-2xl p-4 flex gap-3 text-sm">
                        <Info className="text-[#00FFFF] shrink-0" size={20} />
                        <p className="text-gray-300 leading-relaxed">
                            Target a <strong className="text-white">Fasting Insulin &lt; 6.0 uIU/mL</strong> and a <strong className="text-white">HOMA-IR &lt; 1.0</strong> to indicate optimal metabolic flexibility and reversed resistance.
                        </p>
                    </div>

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
