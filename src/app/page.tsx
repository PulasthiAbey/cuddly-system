"use client";

import { useState, useEffect } from "react";
import { Loader2, Flame, Dumbbell, Clock, ChevronRight, Activity, Target, Droplet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

type BloodTest = {
  test_date: string;
  fasting_insulin: number;
  fasting_glucose: number;
  hba1c: number;
  triglycerides: number; // Added to compute the ratio
  hdl: number;           // Added to compute the ratio
};

type DashboardData = {
  todayWeight: number | null;
  latestWeight: number;
  targetWeight: number;
  workoutDone: string | null;
  fastingActive: boolean;
  sequencingDone: boolean;
  recentWeights: { log_date: string; weight_kg: number }[];
  latestBloodTest: BloodTest | null;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    todayWeight: null,
    latestWeight: 110.0,
    targetWeight: 99.0,
    workoutDone: null,
    fastingActive: false,
    sequencingDone: false,
    recentWeights: [],
    latestBloodTest: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      const todayStr = new Date().toISOString().split("T")[0];

      // 1. Fetch Target Weight Config
      const { data: configData } = await supabase
          .from("user_configs")
          .select("config_value")
          .eq("config_key", "target_weight")
          .maybeSingle();
      const targetWeight = configData ? parseFloat(configData.config_value) : 99.0;

      // 2. Fetch last 7 days of daily_logs
      const { data: logs } = await supabase
          .from("daily_logs")
          .select("log_date, weight_kg, notes")
          .order("log_date", { ascending: false })
          .limit(7);

      let todayWeight = null;
      let latestWeight = 110.0;
      let sequencingDone = false;
      let recentWeights: any[] = [];

      if (logs && logs.length > 0) {
        recentWeights = [...logs].reverse().filter(l => l.weight_kg !== null);
        const mostRecentLogWithWeight = logs.find(l => l.weight_kg !== null);
        if (mostRecentLogWithWeight) latestWeight = mostRecentLogWithWeight.weight_kg;

        const todayLog = logs.find((l) => l.log_date === todayStr);
        if (todayLog) {
          todayWeight = todayLog.weight_kg;
          if (todayLog.notes) {
            try {
              const parsed = JSON.parse(todayLog.notes);
              const seq = parsed.sequencing;
              if (seq && seq.m1_fiber && seq.m1_protein && seq.m1_carbs && seq.m2_fiber && seq.m2_protein && seq.m2_carbs) {
                sequencingDone = true;
              }
            } catch (e) {}
          }
        }
      }

      // 3. Fetch today's gym session
      const { data: gym } = await supabase
          .from("gym_sessions")
          .select("workout_type")
          .eq("session_date", todayStr)
          .maybeSingle();

      // 4. Fetch active fast
      const { data: fast } = await supabase
          .from("fasting_logs")
          .select("id")
          .eq("is_active", true)
          .maybeSingle();

      // 5. Fetch Latest Blood Panel
      const { data: bloodData } = await supabase
          .from("blood_tests")
          .select("test_date, fasting_insulin, fasting_glucose, hba1c, triglycerides, hdl")
          .order("test_date", { ascending: false })
          .limit(1)
          .maybeSingle();

      setData({
        todayWeight,
        latestWeight,
        targetWeight,
        workoutDone: gym ? gym.workout_type : null,
        fastingActive: !!fast,
        sequencingDone,
        recentWeights,
        latestBloodTest: bloodData,
      });

      setIsLoading(false);
    }

    fetchDashboardData();
  }, []);

  // --- HEALTH COLOR LOGIC & RATIOS ---
  const calculateHomaIR = (insulin: number, glucose: number) => ((insulin * glucose) / 22.5).toFixed(2);
  const getHomaColor = (val: number) => val < 1.0 ? "text-[#00FFFF]" : val > 1.9 ? "text-red-500" : "text-yellow-500";

  // Triglyceride to HDL ratio calculations
  const calculateTgHdlRatio = (tg: number, hdl: number) => (tg / hdl).toFixed(1);
  const getTgHdlColor = (ratio: number) => {
    if (ratio < 2.0) return "text-[#00FFFF]"; // Optimal
    if (ratio <= 3.0) return "text-yellow-500"; // Borderline Insulin Resistance
    return "text-red-500"; // High Risk
  };

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center text-[#00FFFF] bg-black">
          <Loader2 className="animate-spin" size={48} />
        </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  const startWeight = 110.0;
  const progressPercent = Math.min(100, Math.max(0, ((startWeight - data.latestWeight) / (startWeight - data.targetWeight)) * 100));

  const tgHdlVal = data.latestBloodTest ? parseFloat(calculateTgHdlRatio(data.latestBloodTest.triglycerides, data.latestBloodTest.hdl)) : null;

  return (
      <main className="min-h-screen p-4 pb-28 text-white bg-black flex flex-col gap-5">

        {/* --- HEADER --- */}
        <header className="mt-4">
          <p className="text-[#00FFFF] text-sm font-bold tracking-widest uppercase mb-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{greeting}.</h1>
          <p className="text-gray-400 text-sm mt-1">Ready to refactor your metabolism?</p>
        </header>

        {/* --- QUICK ACTION HERO CARD --- */}
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,255,255,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FFFF] opacity-5 blur-[60px] rounded-full"></div>
          <h2 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-2">Priority Action</h2>

          {!data.todayWeight ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-white">Log Morning Weight</p>
                  <p className="text-xs text-gray-400 mt-1">Step on the scale to track trends.</p>
                </div>
                <Link href="/metrics" className="bg-[#00FFFF] text-black p-3 rounded-xl hover:scale-105 transition-transform">
                  <ChevronRight size={20} />
                </Link>
              </div>
          ) : !data.workoutDone && (hour < 10 || hour > 16) ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-white">Hit The Iron</p>
                  <p className="text-xs text-gray-400 mt-1">Build your glucose sink today.</p>
                </div>
                <Link href="/gym" className="bg-[#00FFFF] text-black p-3 rounded-xl hover:scale-105 transition-transform">
                  <Dumbbell size={20} />
                </Link>
              </div>
          ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-[#00FFFF]">On Track</p>
                  <p className="text-xs text-gray-400 mt-1">You are crushing today's milestones.</p>
                </div>
                <div className="bg-[#00FFFF]/20 text-[#00FFFF] p-3 rounded-xl">
                  <CheckCircleIcon />
                </div>
              </div>
          )}
        </div>

        {/* --- DAILY STREAKS (3 PILLARS) --- */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/nutrition" className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${data.fastingActive ? "bg-[#00FFFF]/10 border-[#00FFFF]/50 shadow-[0_0_10px_rgba(0,255,255,0.2)]" : "bg-gray-900 border-gray-800"}`}>
            <Clock size={24} className={data.fastingActive ? "text-[#00FFFF]" : "text-gray-500"} />
            <span className="text-[10px] font-bold uppercase mt-2 text-gray-300">Fasting</span>
          </Link>
          <Link href="/gym" className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${data.workoutDone ? "bg-[#00FFFF]/10 border-[#00FFFF]/50 shadow-[0_0_10px_rgba(0,255,255,0.2)]" : "bg-gray-900 border-gray-800"}`}>
            <Dumbbell size={24} className={data.workoutDone ? "text-[#00FFFF]" : "text-gray-500"} />
            <span className="text-[10px] font-bold uppercase mt-2 text-gray-300">Iron</span>
          </Link>
          <Link href="/nutrition" className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${data.sequencingDone ? "bg-[#00FFFF]/10 border-[#00FFFF]/50 shadow-[0_0_10px_rgba(0,255,255,0.2)]" : "bg-gray-900 border-gray-800"}`}>
            <Flame size={24} className={data.sequencingDone ? "text-[#00FFFF]" : "text-gray-500"} />
            <span className="text-[10px] font-bold uppercase mt-2 text-gray-300">Intake</span>
          </Link>
        </div>

        {/* --- WIDGETS GRID --- */}
        <div className="grid grid-cols-2 gap-3">

          {/* Widget 1: Overall Progress */}
          <Link href="/metrics" className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-1.5 mb-2">
              <Target size={16} className="text-[#00FFFF]" />
              <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Goal Progress</h3>
            </div>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-2xl font-bold">{data.latestWeight}</span>
              <span className="text-xs text-gray-500 mb-1">kg</span>
            </div>
            <div className="w-full bg-black rounded-full h-1.5 border border-gray-800 overflow-hidden">
              <div className="bg-[#00FFFF] h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">{progressPercent.toFixed(0)}% to {data.targetWeight} kg</p>
          </Link>

          {/* Widget 2: Latest Blood Panel Summary (Calculates TG/HDL and HOMA-IR) */}
          <Link href="/metrics" className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-1.5 mb-2">
              <Droplet size={16} className="text-[#00FFFF]" />
              <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Latest Labs</h3>
            </div>

            {data.latestBloodTest ? (
                <div className="space-y-1 mt-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">HOMA-IR:</span>
                    <span className={`font-mono font-bold ${getHomaColor(parseFloat(calculateHomaIR(data.latestBloodTest.fasting_insulin, data.latestBloodTest.fasting_glucose)))}`}>
                  {calculateHomaIR(data.latestBloodTest.fasting_insulin, data.latestBloodTest.fasting_glucose)}
                </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    {/* 💡 NEW: TG/HDL Ratio Tracker & Health Parameters */}
                    <span className="text-gray-500">TG/HDL:</span>
                    <span className={`font-mono font-bold ${tgHdlVal ? getTgHdlColor(tgHdlVal) : "text-white"}`}>
                  {tgHdlVal ? tgHdlVal.toFixed(1) : "N/A"}
                </span>
                  </div>
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center">
                  <p className="text-[10px] text-gray-500 text-center italic">No labs logged yet.</p>
                </div>
            )}
          </Link>
        </div>

        {/* --- 7-DAY MINI TREND CHART --- */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
              <Activity size={16} className="text-[#00FFFF]" /> 7-Day Trend
            </h2>
            {data.todayWeight && (
                <span className="text-sm font-bold text-[#00FFFF] bg-[#00FFFF]/10 px-2 py-1 rounded-lg">Today logged</span>
            )}
          </div>

          <div className="h-28 w-full">
            {data.recentWeights.length < 2 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-600 italic text-center px-4">
                  Log your weight for at least two days to see your micro trend line.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.recentWeights}>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Line
                        type="monotone"
                        dataKey="weight_kg"
                        stroke="#00FFFF"
                        strokeWidth={4}
                        dot={false}
                        activeDot={{ r: 6, fill: "#00FFFF" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
            )}
          </div>
        </div>

      </main>
  );
}

function CheckCircleIcon() {
  return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
  )
}
