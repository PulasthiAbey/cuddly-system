"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import Link from "next/link";

// Define our types based on the Supabase schema
type GymSet = {
    id: string;
    exercise_name: string;
    set_number: number;
    weight_kg: number;
    reps: number;
};

type GymSession = {
    id: string;
    session_date: string;
    workout_type: string;
    created_at: string;
    gym_sets: GymSet[]; // Relational data!
};

export default function GymHistory() {
    const [sessions, setSessions] = useState<GymSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchHistory() {
            // The magic of Supabase: '*, gym_sets(*)' fetches the session AND all its sets!
            const { data, error } = await supabase
                .from("gym_sessions")
                .select("*, gym_sets(*)")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching history:", error);
            } else if (data) {
                setSessions(data as GymSession[]);
            }
            setIsLoading(false);
        }

        fetchHistory();
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedSessionId(expandedSessionId === id ? null : id);
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
            {/* Header with Back Button */}
            <header className="mb-6 mt-4 flex items-center gap-3">
                <Link href="/gym" className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition">
                    <ArrowLeft size={20} className="text-[#00FFFF]" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Workout <span className="text-[#00FFFF]">History</span></h1>
                </div>
            </header>

            {/* History List */}
            <div className="space-y-4">
                {sessions.length === 0 ? (
                    <div className="text-center py-10 bg-gray-900 rounded-2xl border border-gray-800">
                        <p className="text-gray-500">No past workouts found. Go lift!</p>
                    </div>
                ) : (
                    sessions.map((session) => {
                        // Group sets by exercise name for a cleaner display
                        const groupedSets: Record<string, GymSet[]> = {};
                        session.gym_sets.forEach((set) => {
                            if (!groupedSets[set.exercise_name]) groupedSets[set.exercise_name] = [];
                            groupedSets[set.exercise_name].push(set);
                        });

                        const isExpanded = expandedSessionId === session.id;

                        return (
                            <div key={session.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-lg transition-all">
                                {/* Clickable Card Header */}
                                <button
                                    onClick={() => toggleExpand(session.id)}
                                    className="w-full flex items-center justify-between p-5 bg-gray-900 hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-black p-3 rounded-xl border border-gray-800">
                                            <Calendar size={20} className="text-[#00FFFF]" />
                                        </div>
                                        <div className="text-left">
                                            <h2 className="text-lg font-bold text-white">{session.workout_type}</h2>
                                            <p className="text-sm text-gray-400">
                                                {new Date(session.session_date).toLocaleDateString('en-GB', {
                                                    weekday: 'short', month: 'short', day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                </button>

                                {/* Expandable Details */}
                                {isExpanded && (
                                    <div className="p-5 pt-0 border-t border-gray-800 bg-black/30">
                                        {Object.entries(groupedSets).map(([exercise, sets]) => (
                                            <div key={exercise} className="mt-4">
                                                <h3 className="text-sm font-semibold text-[#00FFFF] mb-2">{exercise}</h3>
                                                <div className="space-y-1">
                                                    {sets.sort((a, b) => a.set_number - b.set_number).map((set) => (
                                                        <div key={set.id} className="flex justify-between items-center text-sm bg-black rounded-lg px-3 py-2 border border-gray-800">
                                                            <span className="text-gray-500 font-mono">Set {set.set_number}</span>
                                                            <div className="flex gap-4 font-mono font-medium">
                                                                <span>{set.weight_kg} kg</span>
                                                                <span className="text-gray-600">x</span>
                                                                <span>{set.reps} reps</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </main>
    );
}
