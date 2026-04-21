// CTU Daanbantayan Constants

export const CTU_LOCATIONS = [
  'Library',
  'Canteen',
  'Gymnasium',
  'Computer Laboratory 1',
  'Computer Laboratory 2',
  'Classroom Building A',
  'Classroom Building B',
  'Admin Building',
  'Parking Area',
  'Chapel',
  'Other',
];

export const CTU_PROGRAMS = [
  'BSIT',
  'BSED - Math',
  'BEED',
  'BTLED',
  'BSHM',
  'BSIE',
  'BIT - Electronics',
  'BIT - Automotive',
  'BIT - Computer Technology',
  'BSFIiT',
];

export const CTU_YEAR_LEVELS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
];

// CTU Daanbantayan Student ID validation
// Format: 7-8 digits only (e.g., 8230123)
export const STUDENT_ID_REGEX = /^\d{7,8}$/;

export function validateStudentId(id) {
  const pattern = /^\d{7,8}$/;
  if (!pattern.test(id)) {
    return { valid: false, error: 'Student ID must be 7-8 digits (e.g., 8230123)' };
  }
  return { valid: true, error: null };
}

export const CTU_INFO = {
  name: 'CTU Daanbantayan',
  fullName: 'Cebu Technological University - Daanbantayan Campus',
  tagline: 'CTU Daanbantayan — Lost & Found System',
  adminOffice: 'Student Affairs Office',
  officeHours: 'Monday to Friday, 8:00 AM - 5:00 PM',
};