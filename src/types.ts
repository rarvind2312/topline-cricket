export type Role = 'player' | 'coach' |  "parent";

export type LaneType = 'short' | 'long';

export type PlayerKeyStats = {
  matches: number;
  innings: number;
  runs: number;
  highestScore: number;
  wickets: number;
  bestBowling: string; // e.g. "4/12"
};

export type UploadedVideo = {
  id: string;
  playerName: string;
  uploadedBy: 'player' | 'coach';
  context: 'selfTraining' | 'centre';
  uri: string;
  createdAt: string; // ISO
};

export type User = {
  role: Role;
  firstName: string;
  lastName: string;
  email: string;
  isNew?: boolean;
  dob?:string;
  playerType?: string;
  playerLevel?:string
  heightCm?: string;
  weightKg?: string;
  battingHand?: string;
  bowlingHand?: string;
  batSize?:string;
  batWeight?:string;
  padsSize?:string;
  playCricketUrl?: string;
  consents?: {
    videoPrivacyAccepted: true;
    acceptedAt: string;
    consentVersion: '2026-01-v1';
  };
  keyStats?: PlayerKeyStats;
  
};

export type PlayerVideoStatus = 'draft' | 'sharing' | 'shared';

export type VideoOverlayType = 'circle' | 'arrow' | 'line' | 'text';

export type VideoOverlay = {
  tMs: number;
  type: VideoOverlayType;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  color?: string;
  thickness?: number;
  draft?: boolean;
};

export type VideoOverlayDoc = {
  videoId: string;
  coachId: string;
  playerId: string;
  createdAtMs: number;
  overlays: VideoOverlay[];
};

export type PlayerVideoItem = {
  uri: string;
  durationSec?: number;
  uploadedBy: 'player' | 'coach';
  context: 'practice' | 'match';
  coachId: string;           // keep it string ('' when not selected)
  status: PlayerVideoStatus; // <-- required for shared/draft
};

export type CoachItem = {
  id: string;
  name: string;
  specialty?: string;
  coachLevel?:string;
};

export type CoachVideoItem = {
  id: string;
  uri: string;
  playerName: string;
  createdAt: string; // display string for now
  uploadedBy: 'player' | 'coach';
  context: 'selfTraining' | 'centre';
  reviewed: boolean;
  feedback?: string;
  durationSec?: number;
};

export type FitnessEntry = {
  id: string;
  createdAt: number;     // for sorting
  dateKey: string;       // e.g. "2026-01-19"
  dateLabel: string;     // e.g. "19/01/2026" (device locale)
  description: string;
  sets: number;
  reps: number;
};

export type RootStackParamList = {
  AuthLanding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  PlayerDashboard: undefined;
  CoachDashboard: undefined;
  PlayerVideos: undefined;
  PlayerCoachingVideos: undefined;
  PlayerFitness: undefined;
  PlayerBookSessions: undefined;
  PlayerBookLanes: undefined;
  CoachBookLanes: undefined;
  CoachVideoReview: undefined;
  CoachFitness: undefined;
  CoachAvailability: undefined;
  CoachBookingRequests: undefined;
  AdminAccess: undefined;
  AdminOpeningHours: undefined;
  AdminLanes: undefined;
  AdminLaneAvailability: undefined;
  AdminLaneBookings: undefined;
};

export type AppUserProfile = User & {
  uid: string;
  createdAt: string;
  updatedAt: string;
  coachLevel?:string;
  coachSpecialisation?:string[];
  roleBeforeAdmin?: string;
   // ✅ add these:
  createdAtServer?: any;
  updatedAtServer?: any;
};
export type CoachAvailabilitySlot = {
  start: string; // "16:00"
  end: string;   // "20:00"
};

export type CoachWeeklyAvailability = {
  monday: CoachAvailabilitySlot[];
  tuesday: CoachAvailabilitySlot[];
  wednesday: CoachAvailabilitySlot[];
  thursday: CoachAvailabilitySlot[];
  friday: CoachAvailabilitySlot[];
  saturday: CoachAvailabilitySlot[];
  sunday: CoachAvailabilitySlot[];
};

export type CoachAvailability = {
  coachId: string;
  weeklyAvailability: CoachWeeklyAvailability;
  updatedAt: string;
};
