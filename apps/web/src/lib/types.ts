export type Role = 'TEACHER' | 'STUDENT';

export interface TeacherUser {
  role: 'TEACHER';
  id: number;
  fullName: string;
  email: string;
}

export interface StudentUser {
  role: 'STUDENT';
  id: number;
  name: string;
  fullName: string;
  username: string;
  avatarColor: string;
  coins: number;
  xp: number;
  sectionCode: string;
}

export type SessionUser = TeacherUser | StudentUser;

export interface StudentProfile {
  id: number;
  name: string;
  avatarColor: string;
}

export interface SectionProfiles {
  section: { code: string; grade: string };
  students: StudentProfile[];
}
