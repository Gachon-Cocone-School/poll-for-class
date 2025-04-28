import { DocumentReference } from "firebase/firestore";

export interface Member {
  member_name: string;
  member_no: string;
}

export interface Group {
  id?: string;
  group_name: string;
  group_description: string;
}

export interface Question {
  id?: string;
  question: string;
  choices: string[];
}

export interface Poll {
  id?: string;
  poll_name: string;
  poll_description: string;
  poll_group: DocumentReference;
}
