"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Utensils, LineChart } from "lucide-react";

export default function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { name: "Home", href: "/", icon: Home },
        { name: "Gym", href: "/gym", icon: Dumbbell },
        { name: "Food", href: "/nutrition", icon: Utensils },
        { name: "Metrics", href: "/metrics", icon: LineChart },
    ];

    return (
        <nav className="fixed bottom-0 w-full bg-black/90 backdrop-blur-md border-t border-gray-800 z-50 pb-safe">
            {/* pb-safe ensures it sits above the iPhone swipe indicator */}
            <div className="flex justify-around items-center h-20 px-2 pb-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full space-y-1 transition-colors ${
                                isActive ? "text-[#00FFFF]" : "text-gray-500 hover:text-gray-400"
                            }`}
                        >
                            <Icon
                                size={24}
                                className={isActive ? "drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" : ""}
                            />
                            <span className="text-[10px] font-medium tracking-wide">
                {item.name}
              </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
