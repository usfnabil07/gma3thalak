export const ROLES = {
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
  STUDENT: 'student',
  SUPPORT: 'support',
} as const;

export const STORAGE_KEYS = {
  GPA_DATA: 'bua_gpa_data_v2',
  CHAT_HISTORY_PREFIX: 'bua_chat_v2_',
  PROFILE_TAB: 'bua_profile_tab',
} as const;

export const FALLBACKS = {
  COURSE_IMAGE: '/images/default-course-v2.jpg',
} as const;
