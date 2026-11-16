/*
 * DEFAULTS: the starter content and layout settings. No personal data lives
 * here; anything you edit in the app is saved to your own database instead.
 * To add a new kind of content later, add it here first, then render it.
 */
window.DD_DEFAULTS = {
  // The five Morning Mindset prompts (editable in Settings).
  prompts: {
    morning: [
      'How do I want to feel today?',
      'One thing I can get excited about today is...',
      'Someone who needs me to be on my A-game today is...',
      'A situation that might trip me up today could be...',
      'A way my best self would deal with that is...'
    ],
    ferriss: 'What would make everything else easier or unnecessary today?'
  },

  // Habit stacking. days: 0=Sun..6=Sat. perWeek: "any N days a week".
  // These are starter anchors; reword them in the database/Settings later.
  habits: [
    { id: 'gym',      name: 'Gym',            days: [1, 3, 5], strava: ['WeightTraining', 'Workout', 'Crossfit', 'HighIntensityIntervalTraining'], anchor: 'After morning drop-off', full: 'Gym session', mini: '10 minutes of movement' },
    { id: 'journal',  name: 'Journalling',    days: [0,1,2,3,4,5,6], anchor: 'After I get into bed', full: 'Journal, phone out of bed', mini: 'One sentence' },
    { id: 'shower',   name: 'Night shower',   days: [0,1,2,3,4,5,6], anchor: 'After the kids are settled', full: 'Night shower', mini: 'Quick rinse' },
    { id: 'laundry',  name: 'Laundry',        days: [0,1,2,3,4,5,6], anchor: 'After dinner is cleared up', full: 'Load on with overnight timer; hang in the morning', mini: 'Just set the timer' },
    { id: 'winddown', name: 'Wind-down',      days: [0,1,2,3,4,5,6], anchor: 'When the 9pm alarm goes', full: 'Wind-down routine, in bed for 9:30', mini: 'Phone on charger away from bed' },
    { id: 'parkrun',  name: 'Parkrun',        days: [6], strava: ['Run'], anchor: 'After I wake on Saturday', full: 'Parkrun', mini: 'A walk around the block' },
    { id: 'runs',     name: 'Run (2 a week)', perWeek: 2, strava: ['Run', 'TrailRun', 'VirtualRun'], anchor: 'After a calm morning cuppa', full: 'A run', mini: '10 minute walk or jog' }
  ],

  // The four Huberman-style body ticks.
  bodyChecks: [
    { id: 'sun',      label: 'Morning sunlight within an hour of waking' },
    { id: 'caffeine', label: 'Delayed my caffeine' },
    { id: 'protein',  label: 'Protein with my first meal' },
    { id: 'screens',  label: 'Screens off to wind down' }
  ],

  // 1-5 ratings.
  morningRatings: [
    { id: 'energy', label: 'Energy' },
    { id: 'mood',   label: 'Mood' },
    { id: 'sleep',  label: 'Sleep quality' }
  ],
  eveningRatings: [
    { id: 'clarity',      label: 'Clarity' },
    { id: 'eEnergy',      label: 'Energy' },
    { id: 'productivity', label: 'Productivity' }
  ],

  // Time strip shows these hours (24h clock).
  schedule: { startHour: 6, endHour: 21 },

  // Task categories for the matrix (edit freely).
  categories: ['Formclad', 'TAFE', 'Family', 'Health', 'Study', 'Home', 'Personal'],

  // A task is "urgent" when it is due within this many days (or overdue).
  urgentDays: 2,

  // Shown in Settings so you can tell which copy of the app you are running.
  appVersion: 'v16',

  // Remind to back up after this many days.
  backupReminderDays: 7
};
