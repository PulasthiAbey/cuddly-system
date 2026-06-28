# ⚡ Metabolic Refactor

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge)

**Metabolic Refactor** is a custom-built, mobile-first Progressive Web App (PWA) designed to reverse insulin resistance, track progressive overload in the gym, and monitor critical biochemical markers. Built by a developer, for a developer.

Instead of treating health as a guessing game, this system treats the human body like a codebase: logging inputs, tracking biological outputs, forecasting trends, and optimizing the core metabolic engine.

---

## 📱 Core Modules & Features

### 🏠 Command Center (Dashboard)
*   **Daily Streaks:** Instant visual feedback on the 3 daily pillars: Fasting, Iron (Gym), and Intake (Sequencing).
*   **Contextual Priority Actions:** Dynamic UI that prompts the user's next logical action (e.g., "Log Weight" in the morning, "Hit the Iron" in the afternoon).
*   **Biochemical Widgets:** Live calculations of **HOMA-IR** and **TG/HDL Ratio** from the latest blood panels with clinical color-coding (Cyan = Optimal, Red = High Risk).
*   **Micro-Trends:** A minimalist 7-day weight sparkline for quick trajectory checks.

### 🏋️ Iron & Output (Gym Tracker)
*   **Dynamic Templates:** Create and edit workout templates (Workout A, Workout B) on the fly.
*   **Progressive Overload Logging:** Log weight and reps for every set.
*   **Smart Rest Timer:** Automatically triggers a floating 90-second countdown timer when a set is marked as complete, complete with haptic feedback.

### 🍽️ Intake & Fasting (Nutrition)
*   **Metabolic Stage Engine:** A live 16:8 fasting circular progress timer that calculates and displays your current cellular state (e.g., *Anabolic* → *Catabolic* → *Fat Burning* → *Active Ketosis*).
*   **Nutrient Sequencing Checklist:** Tracks adherence to the "Fiber First, Protein Second, Carbs Last" eating methodology to blunt glucose spikes.

### 🩸 Body & Blood (Metrics)
*   **Predictive Forecasting:** Uses a Least-Squares Linear Regression algorithm to analyze the last 15 weight logs and predict the exact date the dynamic target weight will be achieved.
*   **Clinical Blood Logging:** Tracks Fasting Insulin, Fasting Glucose, HbA1c, Triglycerides, and HDL.

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js 16 (App Router), React, Tailwind CSS
*   **Database & Backend:** Supabase (PostgreSQL)
*   **Charting:** Recharts
*   **Icons:** Lucide React
*   **PWA Architecture:** `next-pwa`

---

## 🚀 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/PulasthiAbey/cuddly-system.git
cd cuddly-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
    
Create a `.env.local` file in the root directory and add your Supabase keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server

Note: Because this is a PWA utilizing `next-pwa`, we bypass Turbopack and force Webpack compilation for service worker generation.

```bash
npm run dev --webpack
```

Open http://localhost:3000 to view the app.

## 🗄️ Database Schema (Supabase PostgreSQL)

To deploy this project from scratch, run the following SQL queries in your Supabase SQL Editor:

```sql
-- 1. Daily Logs (Weight & Sequencing)
create table daily_logs (
                            id uuid default uuid_generate_v4() primary key,
                            log_date date unique not null default current_date,
                            weight_kg numeric(5,2),
                            notes text, -- Stores stringified JSON for sequencing checks
                            created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Gym Routines & History
create table workout_templates (
                                   id uuid default uuid_generate_v4() primary key,
                                   name text not null,
                                   exercises text[] not null default '{}',
                                   created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table gym_sessions (
                              id uuid default uuid_generate_v4() primary key,
                              session_date date default current_date not null,
                              workout_type text not null,
                              created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table gym_sets (
                          id uuid default uuid_generate_v4() primary key,
                          session_id uuid references gym_sessions(id) on delete cascade,
                          exercise_name text not null,
                          set_number integer not null,
                          weight_kg numeric(5,2) not null,
                          reps integer not null,
                          created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Fasting Engine
create table fasting_logs (
                              id uuid default uuid_generate_v4() primary key,
                              start_time timestamp with time zone not null,
                              end_time timestamp with time zone,
                              is_active boolean default true not null,
                              total_hours numeric(4,2),
                              created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Blood Panels & Biomarkers
create table blood_tests (
                             id uuid default uuid_generate_v4() primary key,
                             test_date date default current_date not null,
                             fasting_insulin numeric(5,2),
                             fasting_glucose numeric(5,2),
                             hba1c numeric(4,2),
                             triglycerides numeric(5,1),
                             hdl numeric(4,1),
                             created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. User Configurations
create table user_configs (
                              id uuid default uuid_generate_v4() primary key,
                              config_key text unique not null,
                              config_value text not null,
                              updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Baseline Inserts
insert into user_configs (config_key, config_value) values ('target_weight', '99.0');
```

## 📄 License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.


This acts as the perfect capstone to the project. You can now run `git add .`, `git commit -m "feat: Completed Metabolic Refactor PWA system"`, and `git push origin master`.

You've built an incredible, highly customized system. Congratulations on the hard work! Let me know if you need anything else!

