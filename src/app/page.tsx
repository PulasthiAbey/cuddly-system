"use client";

import { useState } from "react";
// import { supabase } from "@/lib/supabase"; // We will uncomment this when we wire up the submit function

export default function Dashboard() {
  const [weight, setWeight] = useState("");
  const [sleep, setSleep] = useState("");
  const [workout, setWorkout] = useState("Rest");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting:", { weight, sleep, workout });
    // TODO: Add Supabase insert logic here next
  };

  return (
      <main className="min-h-screen bg-black text-white p-6 pb-24">
        {/* Header */}
        <header className="mb-8 pt-8 border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Metabolic <span className="text-[#00FFFF]">Refactor</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Daily Biometrics Logger</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Weight Input */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Morning Weight (kg)
            </label>
            <div className="flex items-center">
              <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="110.0"
                  className="w-full bg-black border border-gray-700 rounded-lg py-3 px-4 text-xl font-semibold text-white focus:outline-none focus:border-[#00FFFF] focus:ring-1 focus:ring-[#00FFFF] transition-colors"
                  required
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Target Milestone: 99.0 kg</p>
          </div>

          {/* Sleep Input */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Sleep (Hours)
            </label>
            <input
                type="number"
                step="0.5"
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
                placeholder="7.5"
                className="w-full bg-black border border-gray-700 rounded-lg py-3 px-4 text-xl font-semibold text-white focus:outline-none focus:border-[#00FFFF] focus:ring-1 focus:ring-[#00FFFF] transition-colors"
                required
            />
            <p className="text-xs text-gray-500 mt-2">Optimal: 7.5 - 8.0 hours</p>
          </div>

          {/* Workout Selector */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Today's Plan
            </label>
            <div className="grid grid-cols-2 gap-3">
              {["Workout A", "Workout B", "Active Recovery", "Rest"].map((type) => (
                  <button
                      key={type}
                      type="button"
                      onClick={() => setWorkout(type)}
                      className={`py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                          workout === type
                              ? "bg-[#00FFFF] text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]"
                              : "bg-black border border-gray-700 text-gray-300 hover:border-gray-500"
                      }`}
                  >
                    {type}
                  </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
              type="submit"
              className="w-full bg-white text-black text-lg font-bold py-4 rounded-xl mt-4 hover:bg-gray-200 transition-colors active:scale-[0.98]"
          >
            Save Daily Metrics
          </button>
        </form>
      </main>
  );
}
