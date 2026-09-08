export type Role = "participant" | "judge" | "volunteer" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  qrToken: string;
  projectId: string | null;
  createdAt: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface TeamMember {
  name: string;
  email: string;
}

export interface Project {
  id: string;
  devpostId: string | null;
  title: string;
  devpostUrl: string | null;
  description: string | null;
  track: "Prototype" | "Proposal" | null;
  teamMembers: TeamMember[];
  status: string;
  lastSynced: string | null;
  tableNumber: number | null;
  zoneName: string | null;
}

export interface RubricCriterion {
  id: string;
  label: string;
  max: number;
  description: string;
}

export interface RouteStop {
  order: number;
  tableId: string;
  tableQr: string;
  tableNumber: number;
  zoneName: string;
  projectId: string | null;
  projectTitle: string;
  track: string | null;
  teamMembers: TeamMember[];
  visited: boolean;
  scored: boolean;
}

export interface JudgeRoute {
  routeId: string;
  visited: number;
  total: number;
  stops: RouteStop[];
}

export interface FeedbackReview {
  judgeLabel: string;
  scores: Record<string, number>;
  total: number;
  feedback: string | null;
}

export interface FeedbackResponse {
  published: boolean;
  reviews: FeedbackReview[];
  rubric: RubricCriterion[];
}

export interface AdminMetrics {
  usersByRole: { role: Role; count: number }[];
  checkinsByType: { type: string; count: number }[];
  projectCount: number;
  tableCount: number;
  scoreCount: number;
  routes: { judgeName: string; visited: number; total: number }[];
  scoresPublished: boolean;
  recentCheckins: { id: string; userName: string; checkInType: string; timestamp: string }[];
}

export interface AdminScoreRow {
  id: string;
  projectId: string;
  judgeUserId: string;
  scores: Record<string, number>;
  feedback: string | null;
  isPublished: number;
  projectTitle: string;
  judgeName: string;
}

export interface TableLocation {
  id: string;
  projectId: string;
  tableNumber: number;
  zoneName: string;
  qrToken: string;
  projectTitle: string;
}
