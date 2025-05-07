import { DocumentReference } from "firebase/firestore";

export interface Member {
  id?: string;
  member_name: string;
  member_no: string;
}

export interface Group {
  id?: string;
  group_name: string;
  group_description: string;
}

export interface QuestionResult {
  [choice: string]: number;
}

export interface ParticipantStats {
  member_name: string;
  participation_count: number;
  correct_predictions: number;
  score: number;
  rank: number; // 문자열에서 숫자로 변경
}

export interface Poll {
  id?: string;
  poll_name: string;
  poll_description: string;
  poll_group: DocumentReference;
  active_question?: string | null;
  participant_stats?: ParticipantStats[];
}

// API 응답용 Poll 인터페이스 - poll_group이 DocumentReference가 아닌 확장된 객체
export interface PollWithGroupData {
  id?: string;
  poll_name: string;
  poll_description: string;
  poll_group: { id: string } & Partial<Group>; // Group 데이터를 포함할 수 있는 확장된 형태
  active_question?: string | null;
  participant_stats?: ParticipantStats[];
}

export interface Question {
  id?: string;
  question: string;
  choices: string[];
  poll_result?: QuestionResult | null;
  index: number; // Adding index field for question ordering
}

export interface Answer {
  id?: string;
  member_id?: string;
  member_name?: string;
  member_ref?: DocumentReference;
  choice: string;
  created_at?: number;
  updated_at?: number;
}
