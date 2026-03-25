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
// Format: XX-XXXXX (e.g., 21-12345)
export const STUDENT_ID_REGEX = /^\d{2}-\d{4,5}$/;

export function validateStudentId(studentId) {
  if (!studentId) {
    return { valid: false, error: 'Student ID is required' };
  }
  
  if (!STUDENT_ID_REGEX.test(studentId)) {
    return { 
      valid: false, 
      error: 'Please enter a valid CTU Daanbantayan Student ID (e.g. 21-12345)' 
    };
  }
  
  return { valid: true };
}

export const CTU_INFO = {
  name: 'CTU Daanbantayan',
  fullName: 'Cebu Technological University - Daanbantayan Campus',
  tagline: 'CTU Daanbantayan — Lost & Found System',
  adminOffice: 'Student Affairs Office',
  officeHours: 'Monday to Friday, 8:00 AM - 5:00 PM',
};
