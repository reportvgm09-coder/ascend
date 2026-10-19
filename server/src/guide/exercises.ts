export interface ExerciseSeed {
  name: string;
  muscle: string;
  equipment: string;
  category: "strength" | "cardio" | "mobility";
  instructions: string;
}

const s = (
  name: string,
  muscle: string,
  equipment: string,
  instructions: string,
  category: ExerciseSeed["category"] = "strength",
): ExerciseSeed => ({ name, muscle, equipment, category, instructions });

export const MUSCLE_GROUPS = ["chest", "back", "legs", "shoulders", "arms", "core"] as const;

export const EXERCISE_LIBRARY: ExerciseSeed[] = [
  // Chest
  s("Push-up", "chest", "bodyweight", "Hands under shoulders, body in a straight line. Lower until your chest nearly touches the floor, then press up. Keep elbows about 45° from your body."),
  s("Barbell Bench Press", "chest", "barbell", "Shoulder blades squeezed and feet planted. Lower the bar to mid-chest under control, then press up and slightly back."),
  s("Dumbbell Bench Press", "chest", "dumbbell", "Press the dumbbells from chest level until your arms are straight. Lower slowly and feel the stretch in your chest."),
  s("Incline Dumbbell Press", "chest", "dumbbell", "Bench at 30–45°. Press up over your upper chest. Control the way down."),
  s("Dips", "chest", "bodyweight", "Lean forward slightly to work the chest. Lower until your shoulders are just below your elbows, then press up."),
  // Back
  s("Pull-up", "back", "bodyweight", "Start from a dead hang with an overhand grip. Pull your chest toward the bar while driving your elbows down. Lower all the way."),
  s("Inverted Row", "back", "bodyweight", "Hang under a bar or table with a straight body. Pull your chest to the bar and squeeze your shoulder blades together."),
  s("Barbell Row", "back", "barbell", "Hinge until your torso is about 45° with a flat back. Row the bar to your lower ribs and lower it under control."),
  s("One-arm Dumbbell Row", "back", "dumbbell", "Brace one hand on a bench. Row the dumbbell to your hip while keeping your torso still."),
  s("Lat Pulldown", "back", "machine", "Pull the bar to your upper chest, leading with your elbows. Don't lean far back."),
  s("Deadlift", "back", "barbell", "Bar over mid-foot, flat back, hips hinged. Push the floor away and stand tall. Lower by hinging at the hips first."),
  // Legs
  s("Bodyweight Squat", "legs", "bodyweight", "Feet shoulder-width apart. Sit down between your heels with your chest up, go as deep as you can with good form, then drive up."),
  s("Barbell Back Squat", "legs", "barbell", "Bar on your upper back and core braced. Squat to at least parallel with your knees tracking over your toes."),
  s("Goblet Squat", "legs", "dumbbell", "Hold a dumbbell at your chest. Squat deep with your elbows inside your knees."),
  s("Romanian Deadlift", "legs", "barbell", "Soft knees. Hinge back until you feel a hamstring stretch, with the bar close to your legs. Squeeze your glutes to stand."),
  s("Walking Lunge", "legs", "bodyweight", "Take long steps and lower your back knee toward the floor. Keep your torso upright."),
  s("Bulgarian Split Squat", "legs", "dumbbell", "Rear foot on a bench. Lower straight down on the front leg."),
  s("Hip Thrust", "legs", "barbell", "Upper back on a bench. Drive your hips up until your body is straight from knees to shoulders, and pause at the top."),
  s("Calf Raise", "legs", "bodyweight", "Rise onto the balls of your feet, pause, then lower below the step for a full stretch."),
  // Shoulders
  s("Overhead Press", "shoulders", "barbell", "Brace your glutes and core. Press the bar straight overhead and move your head through once it passes your face."),
  s("Dumbbell Shoulder Press", "shoulders", "dumbbell", "Press the dumbbells overhead from shoulder height without arching your lower back."),
  s("Lateral Raise", "shoulders", "dumbbell", "Raise your arms out to the sides to shoulder height with a slight bend in the elbows. Go slowly and control the way down."),
  s("Pike Push-up", "shoulders", "bodyweight", "Hips high in an inverted V. Lower the top of your head toward the floor, then press up."),
  s("Face Pull", "shoulders", "cable", "Pull the rope toward your face with your elbows high, rotating your hands back. Great for posture."),
  // Arms
  s("Dumbbell Curl", "arms", "dumbbell", "Keep your elbows pinned at your sides. Curl up, squeeze, and lower slowly."),
  s("Hammer Curl", "arms", "dumbbell", "Use a neutral grip (palms facing each other). Curl without swinging."),
  s("Triceps Pushdown", "arms", "cable", "Elbows tucked. Push down until your arms are fully straight."),
  s("Close-grip Push-up", "arms", "bodyweight", "Hands narrower than your shoulders and elbows close to your body. This targets the triceps."),
  s("Overhead Triceps Extension", "arms", "dumbbell", "Lower the dumbbell behind your head with your elbows pointing up, then extend."),
  // Core
  s("Plank", "core", "bodyweight", "Forearms under your shoulders and body in a straight line. Squeeze your glutes and brace as if expecting a punch.", "strength"),
  s("Dead Bug", "core", "bodyweight", "Lie on your back and press your lower back into the floor. Extend the opposite arm and leg slowly."),
  s("Hanging Knee Raise", "core", "bodyweight", "Hang from a bar and raise your knees to your chest without swinging."),
  s("Russian Twist", "core", "bodyweight", "Lean back slightly and rotate your torso side to side under control."),
  s("Mountain Climber", "core", "bodyweight", "From a high plank, drive your knees toward your chest one at a time, quickly."),
  // Cardio
  s("Running", "cardio", "none", "Keep an easy, conversational pace for base fitness. Land under your hips with a quick cadence.", "cardio"),
  s("Brisk Walking", "cardio", "none", "Walk fast enough to raise your breathing. It's great for recovery days and fat loss.", "cardio"),
  s("Cycling", "cardio", "bike", "Steady effort, or intervals: 30s hard / 90s easy.", "cardio"),
  s("Jump Rope", "cardio", "rope", "Small, quick hops on the balls of your feet with relaxed shoulders.", "cardio"),
  s("Burpees", "cardio", "bodyweight", "Squat, kick back to a plank, do a push-up, jump forward, then jump up. Keep a steady rhythm.", "cardio"),
  // Mobility
  s("Hip Flexor Stretch", "mobility", "none", "Half-kneeling. Tuck your pelvis and shift forward gently. Hold 30–60s per side.", "mobility"),
  s("Cat-Cow", "mobility", "none", "On all fours, alternate between arching and rounding your spine slowly with your breath.", "mobility"),
  s("World's Greatest Stretch", "mobility", "none", "Lunge, place your hand inside your front foot, rotate and reach to the ceiling. Repeat on both sides.", "mobility"),
  s("Yoga Flow", "mobility", "none", "10–20 minutes of gentle flow for flexibility and stress relief.", "mobility"),
];
