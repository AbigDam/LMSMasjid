// data/mockData.js
// -----------------------------------------------------------------------------
// MOCK DATA ONLY — Phase I has no backend.
//
// Content is modelled on Al-Hidaya Center's real programs, Iqama prayer times,
// and announcements (source: al-hidaya.org) so the portal feels authentic.
// Later this is replaced by the Django REST API, e.g.
//   GET /api/teacher/courses/ , GET /api/prayer-times/ , GET /api/announcements/
// Keeping the shapes realistic now means the screens won't change much later.
// -----------------------------------------------------------------------------

// The signed-in teacher (mock). Real value will come from the auth/profile endpoint.
export const mockTeacher = {
  name: 'Teacher',
  email: 'teacher@al-hidaya.org',
};

// Classes this teacher is teaching — mapped to Al-Hidaya's actual programs.
// The slim sidebar renders this list; the dashboard renders a CourseCard each.
//
// Fields we DON'T actually know yet use the placeholder "TBD" so it's obvious
// what still needs filling in:
//   - room:     the physical room / location (e.g. "Hifdh Hall A", "Room 3")
// Student counts and schedules below are illustrative mock values — replace with
// real data when the backend / roster is available.
export const mockCourses = [
  {
    id: 'hifdh-1',
    title: 'Hifdh — Level 1',
    program: 'Full-Time Hifdh Program',
    students: 12,
    schedule: '5:00 PM - 7:00 PM',
    room: 'TBD', // location unknown — fill in the actual room
    status: 'active',
    attendance: 94, // % present (mock)
    needsReview: 3, // students flagged for review (mock)
    nextClass: 'Mon 5:00 PM', // next session (mock)
  },
  {
    id: 'maqraa-quran',
    title: "Maqraa Adult Qur'an",
    program: 'Maqraa Adult Quran Program',
    students: 18,
    schedule: '7:15 PM - 8:15 PM',
    room: 'TBD', // location unknown — fill in the actual room
    status: 'active',
    attendance: 88,
    needsReview: 5,
    nextClass: 'Tue 7:15 PM',
  },
  {
    id: 'weekend-learning',
    title: 'Weekend Learning Program',
    program: 'Part-Time Islamic School',
    students: 24,
    schedule: 'Sat 10:00 AM - 1:00 PM',
    room: 'TBD', // location unknown — fill in the actual room
    status: 'active',
    attendance: 91,
    needsReview: 2,
    nextClass: 'Sat 10:00 AM',
  },
];

// Today's Iqama (congregation) times — from al-hidaya.org.
export const mockPrayerTimes = [
  { name: 'Fajr', iqama: '4:15 AM' },
  { name: 'Dhuhr', iqama: '1:15 PM' },
  { name: 'Asr', iqama: '5:30 PM' },
  { name: 'Maghrib', iqama: 'On time' },
  { name: 'Isha', iqama: '10:15 PM' },
];

// Community announcements — modelled on Al-Hidaya's posted notices.
export const mockAnnouncements = [
  {
    id: 'a1',
    title: 'Open House',
    detail: 'Saturday, 8:00 AM – 1:00 PM. All families welcome.',
    icon: 'megaphone-outline',
    date: 'This Saturday',
  },
  {
    id: 'a2',
    title: 'Parent Orientation — 2026/27',
    detail: 'Orientation for the upcoming academic year.',
    icon: 'people-outline',
    date: 'Next week',
  },
  {
    id: 'a3',
    title: 'Reminder: The Best Days of the Year',
    detail: 'Special reminder after Maghrib in the main hall.',
    icon: 'moon-outline',
    date: 'Friday',
  },
];

export default { mockTeacher, mockCourses, mockPrayerTimes, mockAnnouncements };
