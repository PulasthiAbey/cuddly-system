"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Play, Square, Check, Flame, Info, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function NutritionTracker() {
    const [isFasting, setIsFasting] = useState(false);
    const [fastId, setFastId] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Nutrient Sequencing checklist states
    const [meal1Fiber, setMeal1Fiber] = useState(false);
    const [meal1Protein, setMeal1Protein] = useState(false);
    const [meal1Carbs, setMeal1Carbs] = useState(false);

    const [meal2Fiber, setMeal2Fiber] = useState(false);
    const [meal2Protein, setMeal2Protein] = useState(false);
    const [meal2Carbs, setMeal2Carbs] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const TARGET_FAST_HOURS = 16;
    const TARGET_FAST_SECONDS = TARGET_FAST_HOURS * 3600;

    // 1. FETCH ACTIVE FAST AND CHECKLIST ON MOUNT
    useEffect(() => {
        async function initData() {
            const today = new Date().toISOString().split("T")[0];

            const { data: fastData } = await supabase
                .from("fasting_logs")
                .select("*")
                .eq("is_active", true)
                .maybeSingle();

            if (fastData) {
                setIsFasting(true);
                setFastId(fastData.id);
                const start = new Date(fastData.start_time);
                setStartTime(start);
                setElapsedSeconds(Math.floor((new Date().getTime() - start.getTime()) / 1000));
            }

            const { data: logData } = await supabase
                .from("daily_logs")
                .select("notes")
                .eq("log_date", today)
                .maybeSingle();

            if (logData && logData.notes) {
                try {
                    const parsed = JSON.parse(logData.notes);
                    if (parsed.sequencing) {
                        setMeal1Fiber(parsed.sequencing.m1_fiber || false);
                        setMeal1Protein(parsed.sequencing.m1_protein || false);
                        setMeal1Carbs(parsed.sequencing.m1_carbs || false);
                        setMeal2Fiber(parsed.sequencing.m2_fiber || false);
                        setMeal2Protein(parsed.sequencing.m2_protein || false);
                        setMeal2Carbs(parsed.sequencing.m2_carbs || false);
                    }
                } catch (_) {}
            }
            setIsLoading(false);
        }
        initData();
    }, []);

    // 2. LIVE COUNTDOWN TIMER EFFECT
    useEffect(() => {
        if (isFasting && startTime) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isFasting, startTime]);

    // 3. START FASTING
    const handleStartFast = async () => {
        const now = new Date();
        const { data, error } = await supabase
            .from("fasting_logs")
            .insert([{ start_time: now.toISOString(), is_active: true }])
            .select()
            .single();

        if (error) {
            alert("Failed to start fast.");
            return;
        }

        setFastId(data.id);
        setStartTime(now);
        setIsFasting(true);
        setElapsedSeconds(0);
    };

    // 4. STOP FASTING
    const handleStopFast = async () => {
        if (!fastId || !startTime) return;

        const now = new Date();
        const totalHours = parseFloat((Math.floor((now.getTime() - startTime.getTime()) / 1000) / 3600).toFixed(2));

        const { error } = await supabase
            .from("fasting_logs")
            .update({
                end_time: now.toISOString(),
                is_active: false,
                total_hours: totalHours,
            })
            .eq("id", fastId);

        if (error) {
            alert("Failed to save fasting session.");
            return;
        }

        alert(`Fasting Completed! Total hours: ${totalHours}h 🥳`);
        setIsFasting(false);
        setFastId(null);
        setStartTime(null);
        setElapsedSeconds(0);
    };

    // 5. UPDATE CHECKLIST
    const handleToggleCheck = async (meal: 1 | 2, type: "fiber" | "protein" | "carbs", currentVal: boolean) => {
        const today = new Date().toISOString().split("T")[0];
        const newVal = !currentVal;

        let m1f = meal1Fiber, m1p = meal1Protein, m1c = meal1Carbs;
        let m2f = meal2Fiber, m2p = meal2Protein, m2c = meal2Carbs;

        if (meal === 1) {
            if (type === "fiber") { setMeal1Fiber(newVal); m1f = newVal; }
            if (type === "protein") { setMeal1Protein(newVal); m1p = newVal; }
            if (type === "carbs") { setMeal1Carbs(newVal); m1c = newVal; }
        } else {
            if (type === "fiber") { setMeal2Fiber(newVal); m2f = newVal; }
            if (type === "protein") { setMeal2Protein(newVal); m2p = newVal; }
            if (type === "carbs") { setMeal2Carbs(newVal); m2c = newVal; }
        }

        const sequencingPayload = {
            sequencing: {
                m1_fiber: m1f, m1_protein: m1p, m1_carbs: m1c,
                m2_fiber: m2f, m2_protein: m2p, m2_carbs: m2c
            }
        };

        await supabase
            .from("daily_logs")
            .upsert({ log_date: today, notes: JSON.stringify(sequencingPayload) }, { onConflict: "log_date" });
    };

    // 💡 NEW: CALCUATE LIVE METABOLIC STAGES
    const getMetabolicStage = (seconds: number) => {
        if (!isFasting) return { name: "Not Fasting", color: "text-gray-500", desc: "Start fasting to trigger a metabolic refactor." };

        const hours = seconds / 3600;
        if (hours < 4) {
            return {
                name: "Anabolic Stage",
                color: "text-blue-400",
                desc: "Digesting food. Blood sugar is elevated and insulin is storing glycogen."
            };
        } else if (hours < 8) {
            return {
                name: "Catabolic Stage",
                color: "text-yellow-400",
                desc: "Blood sugar returning to normal. Liver is breaking down stored glycogen."
            };
        } else if (hours < 12) {
            return {
                name: "Fat Burning Switch",
                color: "text-orange-400",
                desc: "Glycogen running low. Insulin drops to baseline, allowing fat mobilize."
            };
        } else if (hours < 16) {
            return {
                name: "Active Ketosis",
                color: "text-[#00FFFF] drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]",
                desc: "Optimal insulin sensitivity. Cells are burning stored body fat for fuel!"
            };
        } else {
            return {
                name: "Autophagy & Cleansing",
                color: "text-purple-400",
                desc: "Cellular rejuvenation active. Body is clearing out old protein fragments."
            };
        }
    };

    const currentStage = getMetabolicStage(elapsedSeconds);

    // Circular math
    const radius = 80;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const progressPercent = Math.min(100, (elapsedSeconds / TARGET_FAST_SECONDS) * 100);
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    const formatElapsedTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${h < 10 ? "0" : ""}${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-[#00FFFF]">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    return (
        <main className="min-h-screen p-4 pb-28 text-white bg-black">
            <header className="mb-6 mt-4">
                <h1 className="text-3xl font-bold tracking-tight">Intake & <span className="text-[#00FFFF]">Fasting</span></h1>
                <p className="text-gray-400 text-sm mt-1">Control your metabolic entry points</p>
            </header>

            {/* --- FASTING TIMER CARD --- */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col items-center mb-6">

                {/* Dynamic Stage Indicator Badge */}
                <div className="mb-4">
          <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-black border border-gray-850 ${currentStage.color}`}>
            {currentStage.name}
          </span>
                </div>

                {/* Circular Progress Wheel */}
                <div className="relative flex items-center justify-center h-48 w-48 mb-4">
                    <svg className="absolute transform -rotate-90 w-full h-full">
                        <circle cx="96" cy="96" r={radius} className="stroke-gray-800" strokeWidth={strokeWidth} fill="transparent" />
                        <circle
                            cx="96" cy="96" r={radius}
                            className="stroke-[#00FFFF] transition-all duration-300"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="text-center z-10">
                        <p className="text-3xl font-mono font-bold tracking-widest text-white">{formatElapsedTime(elapsedSeconds)}</p>
                        <p className="text-[10px] text-gray-500 mt-1">Goal: {TARGET_FAST_HOURS}h ({(progressPercent).toFixed(0)}%)</p>
                    </div>
                </div>

                {/* Dynamic Stage Description */}
                <p className="text-center text-xs text-gray-400 max-w-sm mb-6 px-4 leading-relaxed italic">
                    "{currentStage.desc}"
                </p>

                {/* Start / Stop Button */}
                <button
                    onClick={isFasting ? handleStopFast : handleStartFast}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                        isFasting
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-[#00FFFF] hover:bg-cyan-400 text-black shadow-[0_4px_15px_rgba(0,255,255,0.3)]"
                    }`}
                >
                    {isFasting ? <><Square size={20} /> Stop Fasting Session</> : <><Play size={20} /> Start Fasting Window</>}
                </button>
            </div>

            {/* --- NUTRIENT SEQUENCING CHECKLIST --- */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg space-y-4">
                <h2 className="text-sm font-semibold uppercase text-gray-400 tracking-wider border-b border-gray-800 pb-3 flex items-center gap-1.5">
                    <Flame className="text-[#00FFFF]" size={18} /> Nutrient Sequencing (Checklist)
                </h2>

                <div className="bg-[#00FFFF]/5 border border-[#00FFFF]/20 rounded-xl p-3.5 flex gap-2 text-xs text-gray-300">
                    <Info className="text-[#00FFFF] shrink-0" size={16} />
                    <p>Always eat your fiber first to coat your gut, protein second to trigger satiety, and carbohydrates last to blunt glucose spikes.</p>
                </div>

                {/* Meal 1 */}
                <div className="space-y-2 pt-2">
                    <h3 className="text-sm font-bold text-white">Meal 1: Break-Fast (11:00 AM)</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: "1. Fiber", key: "fiber", state: meal1Fiber },
                            { label: "2. Protein", key: "protein", state: meal1Protein },
                            { label: "3. Carbs", key: "carbs", state: meal1Carbs }
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => handleToggleCheck(1, item.key as any, item.state)}
                                className={`py-2.5 px-1 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                                    item.state
                                        ? "bg-[#00FFFF]/10 border-[#00FFFF] text-[#00FFFF]"
                                        : "bg-black border-gray-800 text-gray-500 hover:border-gray-600"
                                }`}
                            >
                                {item.state && <Check size={12} />} {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Meal 2 */}
                <div className="space-y-2 pt-4">
                    <h3 className="text-sm font-bold text-white">Meal 2: Dinner (6:30 PM)</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: "1. Fiber", key: "fiber", state: meal2Fiber },
                            { label: "2. Protein", key: "protein", state: meal2Protein },
                            { label: "3. Carbs", key: "carbs", state: meal2Carbs }
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => handleToggleCheck(2, item.key as any, item.state)}
                                className={`py-2.5 px-1 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                                    item.state
                                        ? "bg-[#00FFFF]/10 border-[#00FFFF] text-[#00FFFF]"
                                        : "bg-black border-gray-800 text-gray-500 hover:border-gray-600"
                                }`}
                            >
                                {item.state && <Check size={12} />} {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
