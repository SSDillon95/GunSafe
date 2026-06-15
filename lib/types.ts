export interface Officer {
  id: number;
  badge_number: string;
  first_name: string;
  last_name: string;
  department: string | null;
  enrolled_at: string;
  archived: boolean;
}

export interface Locker {
  id: number;
  locker_number: string;
  location: string | null;
  created_at: string;
  archived: boolean;
}

export interface CheckEvent {
  id: number;
  officer_id: number;
  locker_id: number;
  event_type: "check_in" | "check_out";
  recorded_at: string;
  badge_number: string;
  officer_name: string;
  locker_number: string;
}

export interface ActiveSession {
  officer_id: number;
  locker_id: number;
  badge_number: string;
  officer_name: string;
  locker_number: string;
  checked_in_at: string;
}