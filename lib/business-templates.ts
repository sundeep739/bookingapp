// Predefined business structures shown during onboarding. Each maps onto
// features the app already supports (services, availability, group capacity,
// configurable intervals, teams/round-robin, default reminder workflow).
// Resource-heavy archetypes (restaurant tables, coworking desks, rentals) are
// intentionally omitted until the Resource engine lands.

export type TemplateService = {
  title: string;
  duration: number;     // minutes
  price: number;
  color: string;
  capacity?: number;    // >1 = group/class event
};

export type TemplateAvailability = {
  fromDay: number;      // 0=Sun .. 6=Sat
  toDay: number;
  start: string;        // "09:00"
  end: string;          // "17:00"
};

export type BusinessTemplate = {
  id: string;
  name: string;
  icon: string;         // emoji
  category: string;
  description: string;
  color: string;
  bg: string;
  isOrg: boolean;            // creates an Organization + invite step
  hasPrices: boolean;       // show/collect prices
  hasDepartments: boolean;  // departments step (e.g. clinic specialties)
  slotInterval: number;     // minutes between start times; 0 = step by duration
  defaultReminderHours: number; // default workflow timing before the booking
  availability: TemplateAvailability;
  departments?: { name: string; color: string }[];
  services: TemplateService[];
};

const C = {
  blue: "#3b82f6", green: "#10b981", amber: "#f59e0b", red: "#ef4444",
  violet: "#8b5cf6", pink: "#ec4899", teal: "#14b8a6", orange: "#f97316", indigo: "#4F46E5",
};

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: "individual", name: "Just me", icon: "🙋", category: "Solo",
    description: "A personal booking page for meetings, calls or sessions.",
    color: C.indigo, bg: "#EEF2FF",
    isOrg: false, hasPrices: false, hasDepartments: false, slotInterval: 0, defaultReminderHours: 24,
    availability: { fromDay: 1, toDay: 5, start: "09:00", end: "17:00" },
    services: [
      { title: "15 Minute Meeting", duration: 15, price: 0, color: C.blue },
      { title: "30 Minute Meeting", duration: 30, price: 0, color: C.green },
      { title: "60 Minute Consultation", duration: 60, price: 0, color: C.violet },
    ],
  },
  {
    id: "fitness_studio", name: "Fitness / Yoga Studio", icon: "🏋️", category: "Fitness & Sports",
    description: "Members book a spot in group classes up to a capacity.",
    color: C.green, bg: "#ecfdf5",
    isOrg: false, hasPrices: true, hasDepartments: false, slotInterval: 15, defaultReminderHours: 2,
    availability: { fromDay: 1, toDay: 6, start: "06:00", end: "21:00" },
    services: [
      { title: "Yoga Class", duration: 60, price: 15, color: C.teal, capacity: 20 },
      { title: "HIIT / Cardio Class", duration: 45, price: 15, color: C.orange, capacity: 25 },
      { title: "Pilates Class", duration: 55, price: 18, color: C.violet, capacity: 15 },
      { title: "Personal Training (1-on-1)", duration: 60, price: 50, color: C.indigo, capacity: 1 },
    ],
  },
  {
    id: "salon_barbershop", name: "Salon / Barbershop", icon: "💇", category: "Beauty & Grooming",
    description: "Clients book a service with a specific stylist or barber.",
    color: C.pink, bg: "#fdf2f8",
    isOrg: true, hasPrices: true, hasDepartments: false, slotInterval: 15, defaultReminderHours: 4,
    availability: { fromDay: 1, toDay: 6, start: "09:00", end: "19:00" },
    services: [
      { title: "Men's Haircut", duration: 30, price: 25, color: C.blue },
      { title: "Women's Haircut", duration: 45, price: 40, color: C.pink },
      { title: "Beard Trim", duration: 15, price: 15, color: C.green },
      { title: "Hair Color", duration: 90, price: 80, color: C.violet },
    ],
  },
  {
    id: "spa_wellness", name: "Spa / Wellness Center", icon: "💆", category: "Health & Wellness",
    description: "Clients book treatments with a therapist.",
    color: C.teal, bg: "#f0fdfa",
    isOrg: true, hasPrices: true, hasDepartments: false, slotInterval: 15, defaultReminderHours: 24,
    availability: { fromDay: 1, toDay: 0, start: "09:00", end: "20:00" },
    services: [
      { title: "Swedish Massage", duration: 60, price: 90, color: C.teal },
      { title: "Deep Tissue Massage", duration: 60, price: 110, color: C.indigo },
      { title: "Facial Treatment", duration: 50, price: 85, color: C.pink },
      { title: "Hot Stone Massage", duration: 75, price: 130, color: C.amber },
    ],
  },
  {
    id: "medical_clinic", name: "Clinic / Medical Practice", icon: "🏥", category: "Healthcare",
    description: "Patients book consultations with doctors, organised by specialty.",
    color: C.blue, bg: "#eff6ff",
    isOrg: true, hasPrices: true, hasDepartments: true, slotInterval: 15, defaultReminderHours: 24,
    availability: { fromDay: 1, toDay: 5, start: "08:00", end: "18:00" },
    departments: [
      { name: "General Practice", color: C.blue },
      { name: "Pediatrics", color: C.amber },
      { name: "Cardiology", color: C.red },
    ],
    services: [
      { title: "General Consultation", duration: 20, price: 80, color: C.blue },
      { title: "New Patient Consultation", duration: 40, price: 120, color: C.green },
      { title: "Follow-Up Visit", duration: 15, price: 60, color: C.teal },
      { title: "Specialist Consultation", duration: 30, price: 150, color: C.violet },
    ],
  },
  {
    id: "dental_clinic", name: "Dental Clinic", icon: "🦷", category: "Healthcare",
    description: "Patients book dental appointments with a dentist or hygienist.",
    color: C.teal, bg: "#f0fdfa",
    isOrg: true, hasPrices: true, hasDepartments: false, slotInterval: 15, defaultReminderHours: 48,
    availability: { fromDay: 1, toDay: 5, start: "08:00", end: "17:00" },
    services: [
      { title: "Dental Cleaning", duration: 50, price: 100, color: C.teal },
      { title: "Dental Exam / Check-Up", duration: 30, price: 75, color: C.blue },
      { title: "Filling", duration: 45, price: 150, color: C.amber },
      { title: "Teeth Whitening", duration: 60, price: 300, color: C.violet },
    ],
  },
  {
    id: "therapy_counseling", name: "Therapy / Counseling", icon: "🧠", category: "Healthcare",
    description: "Clients book sessions with a therapist — virtual or in person.",
    color: C.violet, bg: "#f5f3ff",
    isOrg: false, hasPrices: true, hasDepartments: false, slotInterval: 30, defaultReminderHours: 24,
    availability: { fromDay: 1, toDay: 5, start: "08:00", end: "19:00" },
    services: [
      { title: "Initial Assessment", duration: 60, price: 150, color: C.violet },
      { title: "Individual Therapy Session", duration: 50, price: 120, color: C.indigo },
      { title: "Couples / Family Session", duration: 60, price: 160, color: C.pink },
    ],
  },
  {
    id: "tutoring_coaching", name: "Tutoring / Coaching", icon: "📚", category: "Education & Professional",
    description: "Clients book 1-on-1 (or small group) sessions with a tutor or coach.",
    color: C.amber, bg: "#fffbeb",
    isOrg: false, hasPrices: true, hasDepartments: false, slotInterval: 30, defaultReminderHours: 2,
    availability: { fromDay: 1, toDay: 6, start: "08:00", end: "21:00" },
    services: [
      { title: "Trial / Intro Session", duration: 30, price: 0, color: C.green },
      { title: "30-Minute Session", duration: 30, price: 40, color: C.blue },
      { title: "60-Minute Session", duration: 60, price: 70, color: C.indigo },
      { title: "Group Session", duration: 60, price: 25, color: C.amber, capacity: 5 },
    ],
  },
  {
    id: "tattoo_studio", name: "Tattoo / Piercing Studio", icon: "🎨", category: "Beauty & Grooming",
    description: "Clients book sessions with a specific artist.",
    color: C.red, bg: "#fef2f2",
    isOrg: true, hasPrices: true, hasDepartments: false, slotInterval: 30, defaultReminderHours: 48,
    availability: { fromDay: 2, toDay: 6, start: "10:00", end: "19:00" },
    services: [
      { title: "Design Consultation", duration: 30, price: 0, color: C.green },
      { title: "Small Tattoo (1-2 hrs)", duration: 120, price: 150, color: C.blue },
      { title: "Medium Tattoo (3-4 hrs)", duration: 240, price: 400, color: C.violet },
      { title: "Piercing", duration: 30, price: 50, color: C.pink },
    ],
  },
  {
    id: "pet_grooming", name: "Pet Grooming", icon: "🐕", category: "Pet Services",
    description: "Pet owners book grooming with a specific groomer.",
    color: C.orange, bg: "#fff7ed",
    isOrg: true, hasPrices: true, hasDepartments: false, slotInterval: 15, defaultReminderHours: 24,
    availability: { fromDay: 1, toDay: 6, start: "08:00", end: "18:00" },
    services: [
      { title: "Full Groom — Small Dog", duration: 60, price: 45, color: C.orange },
      { title: "Full Groom — Large Dog", duration: 90, price: 70, color: C.amber },
      { title: "Bath & Brush", duration: 40, price: 30, color: C.blue },
      { title: "Nail Trim", duration: 15, price: 15, color: C.green },
    ],
  },
  {
    id: "home_services", name: "Home Services", icon: "🏠", category: "Services",
    description: "Customers book a visit; we assign an available provider.",
    color: C.green, bg: "#ecfdf5",
    isOrg: true, hasPrices: true, hasDepartments: false, slotInterval: 60, defaultReminderHours: 24,
    availability: { fromDay: 1, toDay: 6, start: "08:00", end: "18:00" },
    services: [
      { title: "Standard Home Cleaning", duration: 120, price: 80, color: C.green },
      { title: "Deep Cleaning", duration: 180, price: 150, color: C.teal },
      { title: "Handyman Visit", duration: 90, price: 75, color: C.amber },
    ],
  },
  {
    id: "photography_studio", name: "Photography", icon: "📸", category: "Creative Services",
    description: "Clients book photo sessions or studio time with you.",
    color: C.indigo, bg: "#EEF2FF",
    isOrg: false, hasPrices: true, hasDepartments: false, slotInterval: 30, defaultReminderHours: 24,
    availability: { fromDay: 1, toDay: 0, start: "08:00", end: "20:00" },
    services: [
      { title: "Portrait Session — 1 Hour", duration: 60, price: 120, color: C.indigo },
      { title: "Event Coverage — Half Day", duration: 240, price: 500, color: C.violet },
      { title: "Studio Session — 2 Hours", duration: 120, price: 300, color: C.blue },
    ],
  },
  {
    id: "repair_service_center", name: "Repair / Service Center", icon: "🔧", category: "Services",
    description: "Customers book repair jobs; we assign an available technician.",
    color: C.amber, bg: "#fffbeb",
    isOrg: true, hasPrices: true, hasDepartments: false, slotInterval: 30, defaultReminderHours: 24,
    availability: { fromDay: 1, toDay: 6, start: "08:00", end: "17:00" },
    services: [
      { title: "Diagnostics / Inspection", duration: 30, price: 50, color: C.blue },
      { title: "Standard Service", duration: 60, price: 100, color: C.green },
      { title: "Major Repair", duration: 180, price: 300, color: C.red },
    ],
  },
  {
    id: "custom", name: "Build custom", icon: "⚙️", category: "Custom",
    description: "Start from scratch — we'll ask a few questions to set you up.",
    color: C.indigo, bg: "#EEF2FF",
    isOrg: false, hasPrices: true, hasDepartments: false, slotInterval: 0, defaultReminderHours: 24,
    availability: { fromDay: 1, toDay: 5, start: "09:00", end: "17:00" },
    services: [
      { title: "30 Minute Appointment", duration: 30, price: 0, color: C.indigo },
    ],
  },
];

export function getTemplate(id: string): BusinessTemplate | undefined {
  return BUSINESS_TEMPLATES.find((t) => t.id === id);
}

// Default reminder message used to seed a workflow during onboarding.
export const DEFAULT_REMINDER_MESSAGE =
  "Hi {{name}}, this is a reminder about your {{event}} on {{time}} with {{host}}. See you then!";
