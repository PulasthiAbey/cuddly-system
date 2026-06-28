"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, Plus, Save, Loader2, Play, Square, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type WorkoutTemplate = {
    id: string;
    name: string;
    exercises: string[];
};

export default function GymTracker() {
    const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
    const [activeTemplateId, setActiveTemplateId] = useState<string>("");
    const [setsData, setSetsData] = useState<Record<string, { weight: string; reps: string; checked: boolean }[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- REST TIMER STATE ---
    const [timerTime, setTimerTime] = useState(90); // Default 90 seconds
    const [timerActive, setTimerActive] = useState(false);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        async function fetchTemplates() {
            const { data, error } = await supabase
                .from("workout_templates")
                .select("*")
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error fetching templates:", error);
            } else if (data && data.length > 0) {
                setTemplates(data);
                setActiveTemplateId(data[0].id);
            }
            setIsLoading(false);
        }
        fetchTemplates();
    }, []);

    // Timer Countdown Logic
    useEffect(() => {
        if (timerActive && timerTime > 0) {
            timerIntervalRef.current = setInterval(() => {
                setTimerTime((prev) => prev - 1);
            }, 1000);
        } else if (timerTime === 0) {
            setTimerActive(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            // Play a native-sounding double vibration/beep if supported by mobile browser
            if (typeof window !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate([200, 100, 200]);
            }
        }

        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [timerActive, timerTime]);

    const startTimer = (seconds = 90) => {
        setTimerTime(seconds);
        setTimerActive(true);
    };

    const toggleTimer = () => {
        setTimerActive(!timerActive);
    };

    const resetTimer = () => {
        setTimerActive(false);
        setTimerTime(90);
    };

    // Create/Update Logic
    const handleCreateNewRoutine = async () => {
        const routineName = prompt("Enter new routine name (e.g., Pull Day):");
        if (!routineName) return;

        const { data, error } = await supabase
            .from("workout_templates")
            .insert([{ name: routineName, exercises: [] }])
            .select()
            .single();

        if (error) {
            alert("Failed to create routine!");
            return;
        }

        setTemplates([...templates, data]);
        setActiveTemplateId(data.id);
        setSetsData({});
    };

    const handleAddNewExercise = async () => {
        const exerciseName = prompt("Enter new exercise name:");
        const activeTemplate = templates.find((t) => t.id === activeTemplateId);

        if (!exerciseName || !activeTemplate) return;
        if (activeTemplate.exercises.includes(exerciseName)) return alert("Exercise already exists!");

        const newExercises = [...activeTemplate.exercises, exerciseName];

        const { error } = await supabase
            .from("workout_templates")
            .update({ exercises: newExercises })
            .eq("id", activeTemplateId);

        if (error) return alert("Failed to add exercise!");

        setTemplates((prev) =>
            prev.map((t) => (t.id === activeTemplateId ? { ...t, exercises: newExercises } : t))
        );
    };

    const handleSaveWorkout = async () => {
        const activeTemplate = templates.find((t) => t.id === activeTemplateId);
        if (!activeTemplate) return;

        setIsSaving(true);

        try {
            const { data: sessionData, error: sessionError } = await supabase
                .from("gym_sessions")
                .insert([{ workout_type: activeTemplate.name }])
                .select()
                .single();

            if (sessionError) throw sessionError;

            const setsToInsert: any[] = [];
            Object.entries(setsData).forEach(([exercise, sets]) => {
                sets.forEach((set, index) => {
                    if (set.weight && set.reps) {
                        setsToInsert.push({
                            session_id: sessionData.id,
                            exercise_name: exercise,
                            set_number: index + 1,
                            weight_kg: parseFloat(set.weight),
                            reps: parseInt(set.reps, 10),
                        });
                    }
                });
            });

            if (setsToInsert.length > 0) {
                const { error: setsError } = await supabase.from("gym_sets").insert(setsToInsert);
                if (setsError) throw setsError;
            }

            alert("Workout Completed & Saved to Cloud! 🚀");
            setSetsData({});
            setTimerActive(false);
        } catch (err) {
            console.error(err);
            alert("Error saving workout.");
        } finally {
            setIsSaving(false);
        }
    };

    // Set updates
    const addSet = (exercise: string) => {
        const currentSets = setsData[exercise] || [];
        setSetsData({ ...setsData, [exercise]: [...currentSets, { weight: "", reps: "", checked: false }] });
    };

    const updateSet = (exercise: string, index: number, field: "weight" | "reps", value: string) => {
        const currentSets = [...(setsData[exercise] || [])];
        currentSets[index] = { ...currentSets[index], [field]: value };
        setSetsData({ ...setsData, [exercise]: currentSets });
    };

    const toggleCheckSet = (exercise: string, index: number) => {
        const currentSets = [...(setsData[exercise] || [])];
        const newCheckedState = !currentSets[index].checked;
        currentSets[index].checked = newCheckedState;
        setSetsData({ ...setsData, [exercise]: currentSets });

        // 💡 MAGIC RULE: Auto-start a 90-second rest timer when checking off a set!
        if (newCheckedState) {
            startTimer(90);
        }
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-[#00FFFF]">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    const activeTemplate = templates.find((t) => t.id === activeTemplateId);

    return (
        <main className="min-h-screen p-4 pb-44 text-white bg-black">
            <header className="mb-6 mt-4 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Iron & <span className="text-[#00FFFF]">Output</span></h1>
                </div>
                <Link
                    href="/gym/history"
                    className="text-sm font-medium text-gray-400 bg-gray-900 border border-gray-800 px-4 py-2 rounded-lg hover:text-[#00FFFF] transition-all"
                >
                    History
                </Link>
            </header>

            {/* Routine Tabs */}
            <div className="flex overflow-x-auto gap-2 pb-2 mb-4 scrollbar-hide">
                {templates.map((template) => (
                    <button
                        key={template.id}
                        onClick={() => {
                            setActiveTemplateId(template.id);
                            setSetsData({});
                        }}
                        className={`whitespace-nowrap px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                            activeTemplateId === template.id
                                ? "bg-[#00FFFF] text-black shadow-md"
                                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                        }`}
                    >
                        {template.name}
                    </button>
                ))}
                <button
                    onClick={handleCreateNewRoutine}
                    className="whitespace-nowrap px-4 py-2 text-sm font-bold rounded-lg bg-gray-900 border border-dashed border-gray-600 text-gray-400 hover:text-[#00FFFF] transition-all flex items-center gap-1"
                >
                    <Plus size={16} /> New
                </button>
            </div>

            {/* Exercises */}
            {activeTemplate && (
                <div className="space-y-4">
                    {activeTemplate.exercises.map((exercise) => (
                        <div key={exercise} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">{exercise}</h2>
                                <button
                                    onClick={() => addSet(exercise)}
                                    className="text-[#00FFFF] bg-[#00FFFF]/10 p-2 rounded-full hover:bg-[#00FFFF]/20"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {(setsData[exercise] || []).map((set, index) => (
                                    <div key={index} className="flex gap-3 items-center">
                                        <span className="text-gray-500 font-mono text-sm w-6">S{index + 1}</span>
                                        <input
                                            type="number"
                                            value={set.weight}
                                            onChange={(e) => updateSet(exercise, index, "weight", e.target.value)}
                                            className="flex-1 bg-black border border-gray-700 rounded-lg py-2 px-3 text-center focus:border-[#00FFFF] focus:outline-none"
                                            placeholder="kg"
                                        />
                                        <span className="text-gray-600">x</span>
                                        <input
                                            type="number"
                                            value={set.reps}
                                            onChange={(e) => updateSet(exercise, index, "reps", e.target.value)}
                                            className="flex-1 bg-black border border-gray-700 rounded-lg py-2 px-3 text-center focus:border-[#00FFFF] focus:outline-none"
                                            placeholder="reps"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleCheckSet(exercise, index)}
                                            className="focus:outline-none"
                                        >
                                            <CheckCircle
                                                size={24}
                                                className={`transition-colors ${set.checked ? "text-[#00FFFF]" : "text-gray-700 hover:text-gray-500"}`}
                                            />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleAddNewExercise}
                        className="w-full py-4 rounded-xl border border-dashed border-gray-600 text-gray-400 hover:text-[#00FFFF] hover:border-[#00FFFF] flex justify-center items-center gap-2 transition-colors"
                    >
                        <Plus size={20} /> Add Exercise to {activeTemplate.name}
                    </button>
                </div>
            )}

            {/* Save Button */}
            <button
                onClick={handleSaveWorkout}
                disabled={isSaving}
                className="w-full mt-8 bg-white text-black font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 disabled:opacity-50 transition-all"
            >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {isSaving ? "Saving..." : "Complete Workout"}
            </button>

            {/* Floating Rest Timer UI */}
            {timerActive || timerTime < 90 ? (
                <div className="fixed bottom-24 left-4 right-4 bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-[0_-5px_25px_rgba(0,0,0,0.5)] z-40">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-400">Rest Timer:</span>
                        <span className="text-2xl font-mono font-bold text-[#00FFFF] tracking-wider">
              {formatTime(timerTime)}
            </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={toggleTimer}
                            className="p-2 bg-black border border-gray-700 rounded-lg hover:border-gray-500 text-white"
                        >
                            {timerActive ? <Square size={16} /> : <Play size={16} />}
                        </button>
                        <button
                            onClick={resetTimer}
                            className="p-2 bg-black border border-gray-700 rounded-lg hover:border-gray-500 text-gray-400 hover:text-white"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </div>
            ) : null}
        </main>
    );
}
