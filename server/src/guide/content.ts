// Curated coaching content used by the rule-based guide.

export type Area = "fitness" | "nutrition" | "discipline" | "mindset" | "confidence" | "knowledge";

export interface Program {
  key: string;
  name: string;
  level: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  summary: string;
  days: { name: string; exercises: { name: string; sets: number; reps: string }[] }[];
}

export const PROGRAMS: Program[] = [
  {
    key: "home-beginner",
    name: "Home Foundations (no equipment)",
    level: "beginner",
    daysPerWeek: 3,
    summary: "Full-body bodyweight training three times a week, on non-consecutive days. Add reps every week. When you can do 15 clean reps, move to a harder variation.",
    days: [
      { name: "Full Body A", exercises: [
        { name: "Bodyweight Squat", sets: 3, reps: "10-15" },
        { name: "Push-up", sets: 3, reps: "6-12" },
        { name: "Inverted Row", sets: 3, reps: "6-12" },
        { name: "Walking Lunge", sets: 2, reps: "10/leg" },
        { name: "Plank", sets: 3, reps: "30-45s" },
      ] },
      { name: "Full Body B", exercises: [
        { name: "Bulgarian Split Squat", sets: 3, reps: "8-12/leg" },
        { name: "Pike Push-up", sets: 3, reps: "6-10" },
        { name: "Pull-up", sets: 3, reps: "max (or negatives)" },
        { name: "Hip Thrust", sets: 3, reps: "12-15" },
        { name: "Dead Bug", sets: 3, reps: "10/side" },
      ] },
    ],
  },
  {
    key: "gym-beginner",
    name: "Gym Starter Full Body",
    level: "beginner",
    daysPerWeek: 3,
    summary: "Alternate workouts A and B on three days a week. Use the double progression method: work within the rep range, and once every set hits the top of the range, add 2.5 kg.",
    days: [
      { name: "Workout A", exercises: [
        { name: "Barbell Back Squat", sets: 3, reps: "6-10" },
        { name: "Barbell Bench Press", sets: 3, reps: "6-10" },
        { name: "Barbell Row", sets: 3, reps: "8-12" },
        { name: "Plank", sets: 3, reps: "45s" },
      ] },
      { name: "Workout B", exercises: [
        { name: "Romanian Deadlift", sets: 3, reps: "8-10" },
        { name: "Overhead Press", sets: 3, reps: "6-10" },
        { name: "Lat Pulldown", sets: 3, reps: "8-12" },
        { name: "Goblet Squat", sets: 2, reps: "10-12" },
        { name: "Hanging Knee Raise", sets: 3, reps: "10-15" },
      ] },
    ],
  },
  {
    key: "upper-lower",
    name: "Upper / Lower Split",
    level: "intermediate",
    daysPerWeek: 4,
    summary: "Four days a week: Upper, Lower, rest, Upper, Lower. Each muscle gets trained twice a week, the most reliable frequency for growth.",
    days: [
      { name: "Upper 1", exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: "5-8" },
        { name: "Barbell Row", sets: 4, reps: "6-10" },
        { name: "Dumbbell Shoulder Press", sets: 3, reps: "8-12" },
        { name: "Dumbbell Curl", sets: 3, reps: "10-12" },
        { name: "Triceps Pushdown", sets: 3, reps: "10-12" },
      ] },
      { name: "Lower 1", exercises: [
        { name: "Barbell Back Squat", sets: 4, reps: "5-8" },
        { name: "Romanian Deadlift", sets: 3, reps: "8-10" },
        { name: "Walking Lunge", sets: 3, reps: "10/leg" },
        { name: "Calf Raise", sets: 4, reps: "12-15" },
      ] },
      { name: "Upper 2", exercises: [
        { name: "Overhead Press", sets: 4, reps: "6-8" },
        { name: "Pull-up", sets: 4, reps: "6-10" },
        { name: "Incline Dumbbell Press", sets: 3, reps: "8-12" },
        { name: "Lateral Raise", sets: 3, reps: "12-15" },
        { name: "Face Pull", sets: 3, reps: "15" },
      ] },
      { name: "Lower 2", exercises: [
        { name: "Deadlift", sets: 3, reps: "3-5" },
        { name: "Bulgarian Split Squat", sets: 3, reps: "8-10/leg" },
        { name: "Hip Thrust", sets: 3, reps: "8-12" },
        { name: "Hanging Knee Raise", sets: 3, reps: "12" },
      ] },
    ],
  },
  {
    key: "ppl",
    name: "Push / Pull / Legs",
    level: "advanced",
    daysPerWeek: 6,
    summary: "Run Push, Pull, Legs twice through, then take one rest day. High volume. Recovery (sleep, protein) has to be dialed in.",
    days: [
      { name: "Push", exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: "5-8" },
        { name: "Overhead Press", sets: 3, reps: "6-10" },
        { name: "Incline Dumbbell Press", sets: 3, reps: "8-12" },
        { name: "Lateral Raise", sets: 4, reps: "12-20" },
        { name: "Overhead Triceps Extension", sets: 3, reps: "10-12" },
      ] },
      { name: "Pull", exercises: [
        { name: "Deadlift", sets: 3, reps: "3-5" },
        { name: "Pull-up", sets: 4, reps: "6-10" },
        { name: "One-arm Dumbbell Row", sets: 3, reps: "8-12" },
        { name: "Face Pull", sets: 3, reps: "15" },
        { name: "Hammer Curl", sets: 3, reps: "10-12" },
      ] },
      { name: "Legs", exercises: [
        { name: "Barbell Back Squat", sets: 4, reps: "5-8" },
        { name: "Romanian Deadlift", sets: 3, reps: "8-10" },
        { name: "Bulgarian Split Squat", sets: 3, reps: "8-12/leg" },
        { name: "Calf Raise", sets: 4, reps: "12-15" },
        { name: "Hanging Knee Raise", sets: 3, reps: "12-15" },
      ] },
    ],
  },
];

export interface Challenge {
  key: string;
  area: Area;
  title: string;
  how: string;
  level: 1 | 2 | 3;
}

export const CHALLENGES: Challenge[] = [
  // Confidence & communication
  { key: "eye-contact", area: "confidence", level: 1, title: "Hold eye contact", how: "In every conversation today, hold eye contact while the other person is speaking. Look away naturally every few seconds instead of darting your eyes." },
  { key: "compliment", area: "confidence", level: 1, title: "Give 3 genuine compliments", how: "Compliment something specific about a choice someone made, like their idea or effort, not just their looks." },
  { key: "ask-question", area: "confidence", level: 1, title: "Ask a follow-up question", how: "When someone shares something, ask \"What made you choose that?\" or \"How did that feel?\" and really listen to the answer." },
  { key: "name-use", area: "confidence", level: 1, title: "Use people's names", how: "Learn the name of someone you meet (a barista, a colleague) and use it once in the conversation." },
  { key: "power-posture", area: "confidence", level: 1, title: "Posture check", how: "Set 3 reminders today. Each time one goes off: shoulders back and down, chin level, chest open, slow breath." },
  { key: "speak-first", area: "confidence", level: 2, title: "Speak first in a group", how: "In a meeting, class or group chat, give your opinion within the first 5 minutes." },
  { key: "stranger-chat", area: "confidence", level: 2, title: "Start a small talk", how: "Start a short conversation with a stranger. Comment on something you both share, such as the weather, a queue or an event." },
  { key: "record-talk", area: "confidence", level: 2, title: "Record a 2-minute talk", how: "Pick any topic and record yourself on video. Watch it back and note one strength and one filler word to cut." },
  { key: "no-fillers", area: "confidence", level: 2, title: "Pause instead of \"um\"", how: "Replace filler words with a silent pause today. Pauses sound confident. Fillers sound unsure." },
  { key: "say-no", area: "confidence", level: 2, title: "Say a polite \"no\"", how: "Decline one request that doesn't serve you, kindly and without over-explaining." },
  { key: "ask-feedback", area: "confidence", level: 3, title: "Ask for honest feedback", how: "Ask someone you trust: \"What's one thing I could do better in how I communicate?\" Thank them and don't argue." },
  { key: "tell-story", area: "confidence", level: 3, title: "Tell a story with structure", how: "Share a story using Situation, then Problem, then Action, then Result. Keep it under 90 seconds." },
  { key: "public-voice", area: "confidence", level: 3, title: "Speak up publicly", how: "Ask a question at an event or class, post an opinion publicly, or volunteer to present." },
  // Discipline & productivity
  { key: "frog", area: "discipline", level: 1, title: "Eat the frog", how: "Do your hardest, most important task first, before you check messages or social media." },
  { key: "phone-away", area: "discipline", level: 1, title: "Phone in another room", how: "Do one 50-minute deep-work block with your phone physically out of reach." },
  { key: "two-minute", area: "discipline", level: 1, title: "The 2-minute rule", how: "Any task that takes under 2 minutes, do it right away. Clear 5 of them today." },
  { key: "plan-tomorrow", area: "discipline", level: 1, title: "Plan tomorrow tonight", how: "Before bed, write tomorrow's top 3 priorities and when you'll do each one." },
  { key: "cold-start", area: "discipline", level: 2, title: "Start before you're ready", how: "Pick a task you've been avoiding and commit to just 5 minutes of it. Starting is the hardest part." },
  { key: "no-snooze", area: "discipline", level: 2, title: "No snooze", how: "Get up on the first alarm and put your feet on the floor right away. Win the first decision of the day." },
  { key: "dopamine-fast", area: "discipline", level: 3, title: "Low-dopamine evening", how: "No social media, games or YouTube after 7 pm. Read, walk, journal or talk to someone instead." },
  // Mindset & emotional health
  { key: "gratitude-3", area: "mindset", level: 1, title: "3 gratitudes", how: "Write down 3 specific things you're grateful for, and why each one matters." },
  { key: "box-breath", area: "mindset", level: 1, title: "Box breathing", how: "Breathe in for 4s, hold for 4s, breathe out for 4s, hold for 4s. Do 4 rounds whenever you feel stressed today." },
  { key: "walk-no-phone", area: "mindset", level: 1, title: "Mindful walk", how: "Take a 15-minute walk with no phone or music. Notice 5 things you see, hear and feel." },
  { key: "reframe", area: "mindset", level: 2, title: "Reframe a setback", how: "Write down one problem. Then answer: \"What is this teaching me? What would I tell a friend in this situation?\"" },
  { key: "self-talk", area: "mindset", level: 2, title: "Catch your inner critic", how: "Each time you think something harsh about yourself, rewrite it the way a supportive coach would say it." },
  { key: "kindness", area: "mindset", level: 2, title: "Random act of kindness", how: "Do something kind for someone without expecting anything back." },
  { key: "fear-list", area: "mindset", level: 3, title: "Fear setting", how: "Write down: the worst case, how you'd prevent it, and how you'd repair it. Fears shrink once they're on paper." },
  // Knowledge & skills
  { key: "read-20", area: "knowledge", level: 1, title: "Read 20 pages", how: "Read 20 pages of a non-fiction book. Write down one idea you'll apply." },
  { key: "teach-back", area: "knowledge", level: 2, title: "Feynman technique", how: "Explain something you learned recently in simple words, as if to a 12-year-old. Gaps in your explanation show you what to revise." },
  { key: "deliberate", area: "knowledge", level: 2, title: "Deliberate practice", how: "Spend 25 minutes on the hardest part of a skill you're learning, not the parts you already find easy." },
  { key: "new-word", area: "knowledge", level: 1, title: "Learn 3 new words", how: "Learn 3 new words and use each one in a sentence today. A bigger vocabulary helps you express yourself clearly." },
  { key: "summarize", area: "knowledge", level: 2, title: "One-page summary", how: "Summarize a chapter, video or course module on one page from memory." },
];

export const LESSONS: { area: Area; title: string; body: string }[] = [
  { area: "discipline", title: "Systems beat goals", body: "Winners and losers often have the same goals. The difference is the system: the daily habits that move you forward. Focus on the process and the results follow." },
  { area: "discipline", title: "Never miss twice", body: "Missing one day is an accident. Missing two is the start of a new habit. When you slip, make the next day a must-win." },
  { area: "fitness", title: "Progressive overload", body: "Muscles adapt only when challenged a little more over time: more reps, more weight or better form. Log every session so you know what to beat." },
  { area: "fitness", title: "Recovery is training", body: "Muscle is built while you rest. Aim for 7–9 hours of sleep and at least one full rest day each week." },
  { area: "nutrition", title: "Protein first", body: "Build each meal around a protein source (eggs, dal, paneer, chicken, fish, tofu, Greek yogurt). It keeps you full and protects muscle." },
  { area: "nutrition", title: "The 80/20 plate", body: "Make 80% of your food whole and minimally processed, and enjoy the other 20% guilt-free. Being consistent matters more than being perfect." },
  { area: "confidence", title: "Confidence follows action", body: "You don't wait to feel confident before you act. You act, survive it, and confidence builds from the evidence." },
  { area: "confidence", title: "Listen to understand", body: "Most people listen just to reply. Ask questions, summarize what you heard, and people will feel deeply respected." },
  { area: "confidence", title: "Slow down", body: "Speaking slightly slower with deliberate pauses comes across as calm and authoritative. Rushing signals nervousness." },
  { area: "mindset", title: "Name it to tame it", body: "Labeling an emotion (\"I feel anxious\") reduces its intensity. Journaling is one of the most effective mental-health tools there is." },
  { area: "mindset", title: "Growth mindset", body: "Add the word \"yet\" to your thoughts: \"I'm not good at this yet.\" Abilities grow with effort and good strategy." },
  { area: "knowledge", title: "Spaced repetition", body: "Review new material after 1 day, 3 days, 1 week and 1 month. Spacing out reviews beats cramming for long-term memory." },
  { area: "knowledge", title: "Learn by doing", body: "Every 30 minutes of input (reading, videos) should be followed by output: practice, notes or teaching someone." },
];

export const MEAL_IDEAS: { name: string; type: string; calories: number; protein: number; carbs: number; fat: number; veg: boolean }[] = [
  { name: "Oats with milk, banana & peanut butter", type: "breakfast", calories: 480, protein: 18, carbs: 65, fat: 16, veg: true },
  { name: "3-egg omelette with veggies + 2 toast", type: "breakfast", calories: 450, protein: 26, carbs: 32, fat: 22, veg: false },
  { name: "Greek yogurt, berries & granola", type: "breakfast", calories: 350, protein: 22, carbs: 45, fat: 8, veg: true },
  { name: "Moong dal chilla (3) with mint chutney", type: "breakfast", calories: 380, protein: 21, carbs: 48, fat: 10, veg: true },
  { name: "Paneer bhurji + 2 roti", type: "lunch", calories: 560, protein: 30, carbs: 50, fat: 25, veg: true },
  { name: "Grilled chicken, rice & salad", type: "lunch", calories: 600, protein: 45, carbs: 65, fat: 14, veg: false },
  { name: "Rajma / chole with rice & curd", type: "lunch", calories: 620, protein: 24, carbs: 95, fat: 14, veg: true },
  { name: "Tofu stir-fry with noodles", type: "dinner", calories: 520, protein: 28, carbs: 60, fat: 18, veg: true },
  { name: "Fish curry with rice", type: "dinner", calories: 550, protein: 38, carbs: 60, fat: 15, veg: false },
  { name: "Dal, sabzi, 2 roti & salad", type: "dinner", calories: 500, protein: 20, carbs: 70, fat: 14, veg: true },
  { name: "Roasted chana (50 g)", type: "snack", calories: 180, protein: 10, carbs: 28, fat: 3, veg: true },
  { name: "Protein shake with milk", type: "snack", calories: 250, protein: 32, carbs: 15, fat: 6, veg: true },
  { name: "Apple + 15 almonds", type: "snack", calories: 200, protein: 5, carbs: 25, fat: 10, veg: true },
  { name: "Boiled eggs (2) & fruit", type: "snack", calories: 220, protein: 13, carbs: 20, fat: 10, veg: false },
];
