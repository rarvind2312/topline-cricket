import { StyleSheet, Platform, StatusBar } from 'react-native';

const COACH_RED = '#bb2b2b';
const ANDROID_STATUS_BAR = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

export const styles = StyleSheet.create({
// ---------- AUTH LANDING (PREMIUM, CROSS-PLATFORM) ----------
authContainer: {
  flex: 1,
  backgroundColor: "#fff",
},

authLandingWrap: {
  flex: 1,
  justifyContent: "space-between",
  paddingHorizontal: 22,
  paddingTop: Platform.OS === "android" ? ANDROID_STATUS_BAR + 20 : 22,
  paddingBottom: 28, 
},

authLandingHeader: {
  alignItems: "center",
  marginTop: 8,
},

authLandingLogoCard: {
  width: 170,
  height: 170,
  borderRadius: 30,
  backgroundColor: "#fff",
  alignItems: "center",
  justifyContent: "center",

  // ✅ iOS shadow
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },

  // ✅ Android shadow
  elevation: 2,

  borderWidth: 1,
  borderColor: "#f3f4f6",
},

authLandingLogo: {
  width: 140,
  height: 140,
  resizeMode: "contain",
},

authLandingTitle: {
  marginTop: 18,
  fontSize: 24,
  fontWeight: "800",
  color: "#111",
  textAlign: "center",
},

authLandingSubtitle: {
  marginTop: 10,
  fontSize: 25,
  color: "#000",
  textAlign: "center",
  lineHeight: 30,
  paddingHorizontal: 15, 
},

authLandingCtaCard: {
  backgroundColor: "#fff",
  borderRadius: 18,
  padding: 16,

  // ✅ iOS shadow
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },

  // ✅ Android
  elevation: 2,

  borderWidth: 1,
  borderColor: "#f2f2f2",
},

authLandingPrimaryBtn: {
  height: 54,
  borderRadius: 14,
  backgroundColor: "#E10600",
  alignItems: "center",
  justifyContent: "center",

  // ✅ iOS shadow
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },

  // ✅ Android
  elevation: 2,
},

authLandingPrimaryBtnText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "800",
},

authLandingSecondaryBtn: {
  height: 54,
  borderRadius: 14,
  backgroundColor: "#fff",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1.5,
  borderColor: "#E10600",
  marginTop: 12,
},

authLandingSecondaryBtnText: {
  color: "#E10600",
  fontSize: 16,
  fontWeight: "800",
},

authLandingFinePrint: {
  marginTop: 14,
  fontSize: 16,
  color: "#111827",
  textAlign: "center",
  lineHeight: 16,
},

  /* ---------- GENERIC ---------- */
  flex1: {
    flex: 1,
  },

  /* ---------- AUTH SCREENS ---------- */
  authScrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? ANDROID_STATUS_BAR + 20 : 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 32,
  },

  authHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    minHeight: 40, // keeps header stable across devices
  },

  backButton: {
    paddingVertical: 8,   // ✅ bigger tap area for Android
    paddingHorizontal: 8,
    borderRadius: 10,     // optional, helps if you add pressed style later
  },

  backButtonText: {
    fontSize: 16,
    fontWeight: Platform.OS === "ios" ? "600" : "500",
    color: "#111",
  },

  authLogoSmall: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    alignSelf: "center",
  },

  authTagline: {
    textAlign: "center",
    fontSize: 20,
    color: "#000",
    marginTop: 6,
    marginBottom: 16,
    letterSpacing: 0.2,
    paddingHorizontal: 8,  // prevents wide screens looking odd
    lineHeight: 20,
    fontWeight: "500",
  },

  authRowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    gap: 10, // RN 0.71+ supports this; safe on Expo modern versions
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  // ✅ Better than hardcoding 40/24: keeps Android nav bar + iOS home indicator happy
  authBottomSpacer: {
    height: Platform.OS === "ios" ? 44 : 28,
  },



/* ===========================
   SIGN UP – COMMON LAYOUT
   =========================== */


formScroll: {
  paddingHorizontal: 18,
  paddingTop: 14,
  paddingBottom: 32,
},



/* ===========================
   HEADINGS & TEXT
   =========================== */

/* Main heading (Sign Up) */
h1: {
  fontSize: 24,
  fontWeight: '700',
  color: '#111111',
  textAlign: 'center',
  marginBottom: 16,
},


fieldLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#111827',
  marginTop: 14,
  marginBottom: 6,
},

helperText: {
  fontSize: 13,
  color: '#6B7280',
  marginTop: 4,
},

/* ===========================
   INPUTS
   =========================== */

textInput: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  fontSize: 14,
  color: '#111827',
},

input: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  fontSize: 20,
  color: '#111827',
  marginBottom: 6,
},

/* ===========================
   ROLE TOGGLE (Player / Coach)
   =========================== */

roleRow: {
  flexDirection: 'row',
  backgroundColor: '#F3F4F6',
  borderRadius: 12,
  padding: 4,
   gap: 12,
  marginBottom: 14,
},

roleChip: {
 flex: 1,
  borderRadius: 999,
  paddingVertical: 12,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#E10600',
  backgroundColor: '#FFFFFF',
  
},

roleChipSelected: {
  backgroundColor: '#E10600',
},

roleChipText: {
  fontSize: 18,
  fontWeight: '600',
  color: '#000',
},

roleChipTextSelected: {
  color: '#FFFFFF',
  fontWeight: '800',
},

/* ===========================
   CHECKBOX (Player / Coach)
   =========================== */

checkboxRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 8,
},

checkboxBox: {
  width: 20,
  height: 20,
  borderRadius: 4,
  borderWidth: 1.5,
  borderColor: '#6B7280',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 8,
  backgroundColor: '#FFFFFF',
},

checkboxTick: {
  width: 12,
  height: 12,
  backgroundColor: '#E10600',
  borderRadius: 3,
},

checkboxLabel: {
  fontSize: 14,
  color: '#111827',
},

/* ===========================
   LEVEL PICKER (Touchable)
   =========================== */

pickerInput: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  marginBottom: 10,
},

pickerText: {
  fontSize: 14,
  color: '#111827',
},

pickerPlaceholder: {
  fontSize: 14,
  color: '#9CA3AF',
},

/* ===========================
   PRIMARY BUTTON
   =========================== */

primaryButton: {
  height: 52,
  borderRadius: 12,
  backgroundColor: '#E10600',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 18,

  /* iOS shadow */
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },

  /* Android */
  elevation: 3,
},

primaryButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},

/* ===========================
   LINK BUTTONS
   =========================== */

linkButton: {
  alignSelf: 'center',
  marginTop: 16,
  paddingVertical: 6,
},

linkButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#E10600',
  textAlign: 'center',
},

/* ===========================
   MODALS (Consent / Picker)
   =========================== */

modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'center',
  padding: 18,
},


modalTitle: {
  fontSize: 18,
  fontWeight: '700',
  marginBottom: 10,
  color: '#111111',
},

modalScrollBox: {
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 10,
  padding: 12,
  marginBottom: 14,
},

modalBodyText: {
  fontSize: 14,
  lineHeight: 20,
  color: '#111827',
},

  

/* ===========================
   PLAYER DASHBOARD (PREMIUM)
   =========================== */

screen: {
  flex: 1,
  backgroundColor: '#ffffff',
},

floatingLaneButton: {
  position: 'absolute',
  right: 18,
  bottom: 22,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#E10600',
  paddingHorizontal: 16,
  height: 56,
  borderRadius: 28,
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 5,
},

floatingLaneButtonIcon: {
  fontSize: 18,
  marginRight: 8,
},

floatingLaneButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '700',
},

container: {
  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 28,
},

/* Header */
headerCard: {
  borderRadius: 20,
  backgroundColor: '#bb2b2b',
  padding: 18,
  marginBottom: 10,

  shadowOpacity: 0.50,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 3,
},

headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
},

avatarCircle: {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: 'rgba(255,255,255,0.14)',
  borderWidth: 1,
  borderColor: '#fff',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

avatarText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '800',
  letterSpacing: 0.5,
},

headerTextBlock: {
  flex: 1,
  paddingRight: 10,
},

headerHi: {
  color: 'rgba(255,255,255,0.9)',
  fontSize: 12,
  fontWeight: '700',
},

headerName: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '900',
  marginTop: 2,
},

headerRole: {
  color: 'rgba(255,255,255,0.85)',
  fontSize: 15,
  fontWeight: '700',
  marginTop: 2,
},

headerWelcome: {
  color: 'rgba(255,255,255,0.85)',
  fontSize: 12,
  lineHeight: 16,
  marginTop: 6,
},


/* Sections */
sectionHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 10,
},

// Player Dashboard section shells
dashboardSectionWrap: {
  marginTop: 14,
  padding: 12,
  borderRadius: 18,
  backgroundColor: '#F9FAFB',
  borderWidth: 1,
  borderColor: '#F3F4F6',
  shadowOpacity: 0.10,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
},

dashboardSectionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

dashboardSectionHeaderLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

dashboardSectionIconWrap: {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.06)',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
},

dashboardSectionIcon: {
  fontSize: 16,
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

dashboardSectionTitle: {
  fontSize: 17,
  fontWeight: '800',
  color: '#4c0303',
},

dashboardSectionDivider: {
  height: 1,
  backgroundColor: '#EEF2F7',
  marginTop: 10,
  marginBottom: 12,
},


sectionBlock: {
  marginTop: 10,
},

/* Cards */
toplineSectionCard: {
  borderRadius: 16,
  backgroundColor: '#ffffff',
  padding: 14,
  borderWidth: 1,
  borderColor: '#F3F4F6',

  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
},

divider: {
  height: 1,
  backgroundColor: '#F3F4F6',
  marginVertical: 12,
},

bigTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#4c0303',
},

titleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

emptyTitle: {
  fontSize: 15,
  fontWeight: '800',
  color: '#111111',
},

emptyBody: {
  fontSize: 16,
  color: '#6B7280',
  lineHeight: 20,
},

feedbackText: {
  fontSize: 15,
  color: '#111827',
  marginTop: 6,
  lineHeight: 20,
},

/* Pills */
pill: {
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 12,
  backgroundColor: '#bb2b2b',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
},

pillText: {
  fontSize: 15,
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: 0.2,
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

// Player Dashboard 3D pills
playerPill: {
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 10,
  minHeight: 34,
  backgroundColor: '#bb2b2b',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
},

playerPillText: {
  fontSize: 16,
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: 0.2,
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

playerPillTextSm: {
  fontSize: 12,
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: 0.15,
  textAlign: 'center',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

playerPillTall: {
  minHeight: 40,
  paddingVertical: 6,
},

requestItemCard: {
  paddingBottom: 6,
},

requestStatusBadge: {
  alignSelf: 'flex-end',
  marginTop: 8,
},

statusBadge: {
  alignSelf: 'flex-start',
  borderRadius: 999,
  paddingVertical: 8,
  paddingHorizontal: 16,
  borderWidth: 1,
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
},

statusBadgeText: {
  fontSize: 13,
  fontWeight: '900',
  color: '#ffffff',
  letterSpacing: 0.4,
},

statusBadgeRequested: {
  backgroundColor: '#f59e0b',
  borderColor: 'rgba(255,255,255,0.2)',
},

statusBadgeAccepted: {
  backgroundColor: '#167a3f',
  borderColor: 'rgba(255,255,255,0.2)',
},

statusBadgeDeclined: {
  backgroundColor: '#dc2626',
  borderColor: 'rgba(255,255,255,0.2)',
},

statusBadgeCountered: {
  backgroundColor: '#7c3aed',
  borderColor: 'rgba(255,255,255,0.2)',
},

statusBadgeDefault: {
  backgroundColor: '#6b7280',
  borderColor: 'rgba(255,255,255,0.2)',
},

statusBadgeTextDark: {
  color: '#111827',
},

playerPickerCard: {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  backgroundColor: '#F9FAFB',
  overflow: 'hidden',
  marginBottom: 8,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
},

aiCoachFab: {
  position: 'absolute',
  right: 16,
  bottom: 10,
  alignItems: 'center',
  justifyContent: 'center',
},

aiCoachBubble: {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: '#bb2b2b',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
},

aiCoachIcon: {
  fontSize: 22,
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

aiCoachLabel: {
  marginTop: 6,
  backgroundColor: '#ffffff',
  borderRadius: 12,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: '#F3F4F6',
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
},

aiCoachLabelText: {
  fontSize: 11,
  fontWeight: '900',
  color: '#7f0606',
  letterSpacing: 0.2,
},

/* Shimmer */
shimmerBox: {
  height: 46,
  borderRadius: 14,
  overflow: 'hidden',
  backgroundColor: '#F3F4F6',
},

shimmerOverlay: {
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 140,
},

/* Pending request text */
inputLabel: {
  fontSize: 18,
  fontWeight: '600',
  color: '#111111',
  marginBottom: 10
},


/* Quick Actions */
quickActionsCard: {
  marginTop: 10,
  borderRadius: 16,
  backgroundColor: '#ffffff',
  padding: 12,
  borderWidth: 1,
  borderColor: '#F3F4F6',

  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,

  flexDirection: 'row',
  justifyContent: 'space-between',
},

quickActionTile: {
  width: '24%',
  borderRadius: 14,
  backgroundColor: '#FAFAFA',
  borderWidth: 1,
  borderColor: '#EEF2F7',
  paddingVertical: 12,
  paddingHorizontal: 8,
  alignItems: 'center',
  justifyContent: 'flex-start',
},

quickActionIconWrap: {
  height: 28,              // ✅ fixes alignment
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 8,
},

quickActionEmoji: {
  fontSize: 22,
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

playerQuickActionEmoji: {
  fontSize: 22,
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

quickActionText: {
  fontSize: 11,
  fontWeight: '800',
  color: '#111111',
  textAlign: 'center',
  lineHeight: 13,
  minHeight: 30,           // ✅ keeps labels aligned (2 lines)
  width: "100%",
},

/* Stats card */
card: {
  marginTop: 10,
  borderRadius: 16,
  backgroundColor: '#ffffff',
  padding: 14,
  borderWidth: 1,
  borderColor: '#F3F4F6',

  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
},

statsHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

statsCardTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#580707',
},

editLink: {
  fontSize: 16,
  fontWeight: '700',
  color: '#730606',
},

statsCardSubtitle: {
  fontSize: 13,
  color: '#6B7280',
  marginTop: 6,
  lineHeight: 18,
},
statsRowAlt: {
  backgroundColor: '#FAFAFB',
},

statsButton: {
  marginTop: 12,
  height: 48,
  borderRadius: 14,
  backgroundColor: '#E10600',
  alignItems: 'center',
  justifyContent: 'center',
},

statsButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '900',
},

/* Stats Modal (existing keys used in your screen) */
modalBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'center',
  padding: 18,
},

modalCard: {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 16,
  borderWidth: 1,
  borderColor: '#F3F4F6',

  shadowOpacity: 0.10,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 3,
},


modalRow: {
  flexDirection: 'row',
  gap: 12,
  marginBottom: 12,
},

modalField: {
  flex: 1,
},

modalLabel: {
  fontSize: 12,
  fontWeight: '800',
  color: '#6B7280',
  marginBottom: 6,
},

modalInput: {
  height: 46,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  paddingHorizontal: 12,
  fontSize: 14,
  color: '#111111',
  backgroundColor: '#ffffff',
},

modalHintText: {
  fontSize: 12,
  color: '#6B7280',
  marginBottom: 8,
},

modalInlineRow: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 10,
},

modalInlineInput: {
  flex: 1,
  height: 40,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  paddingHorizontal: 10,
  fontSize: 13,
  color: '#111111',
  backgroundColor: '#F9FAFB',
},

modalButtonsRow: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 6,
},

modalBtn: {
  flex: 1,
  height: 48,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
},

modalBtnSecondary: {
  backgroundColor: '#ffffff',
  borderWidth: 1.5,
  borderColor: '#E5E7EB',
},

modalBtnSecondaryText: {
  fontSize: 14,
  fontWeight: '900',
  color: '#111111',
},

modalBtnPrimary: {
  backgroundColor: '#E10600',
},

modalBtnPrimaryText: {
  fontSize: 14,
  fontWeight: '900',
  color: '#ffffff',
},


/* ===========================
   STATS TABLE (PREMIUM UPGRADE)
   =========================== */

statsTable: {
  marginTop: 12,
  borderRadius: 14,
  overflow: 'hidden',
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#EEF2F7',

  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 10 },
  elevation: 1,
},

statsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 14,
  paddingHorizontal: 14,
  backgroundColor: '#ffffff',
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
},

statsRowLast: {
  borderBottomWidth: 0,
},

statsLabel: {
  fontSize: 15,
  color: '#610404',
  fontWeight: '700',
  letterSpacing: 0.2,
},

statsValue: {
  fontSize: 16,
  color: '#111111',
  fontWeight: '900',
  letterSpacing: 0.2,
},




/* ===========================
   PLAYER VIDEOS (PREMIUM)
   =========================== */

screenContainer: {
  flex: 1,
  backgroundColor: "#FFFFFF",
  paddingTop: Platform.OS === "android" ? ANDROID_STATUS_BAR + 10 : 0,
  paddingBottom: Platform.OS === "android" ? 16 : 0,
},


/* Title + helper text (re-use across screens) */
sectionTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#7f0606",
  marginTop: 16,
  marginBottom: 5,
},

coachSectionTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: COACH_RED,
  marginTop: 16,
  marginBottom: 5,
},

coachBigTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: COACH_RED,
},


playerCardEmptyText: {
  fontSize: 14,
  lineHeight: 20,
  color: "#2c2828",
  marginTop: 12,
},

/* Topline logo used as small badge */
headerLogo: {
  width: 60,
  height: 60,
  resizeMode: "cover",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#F1F5F9",
},

/* Upload card */
videoUploadCard: {
  backgroundColor: "#F1F5F9",
  borderRadius: 16,
  paddingVertical: 15,
  paddingHorizontal: 15,
  borderWidth: 1,
  borderColor: "#380202",
  marginTop: 10,
  shadowOpacity: 0.10,
  shadowRadius: 1,
  shadowOffset: { width: 0, height: 15 },
  elevation: 4,
},

videoUploadHint: {
  fontSize: 15,
  fontWeight: "600",
  color: "#7f0606",
  textAlign:"center"
},

videoUploadMeta: {
  marginTop: 6,
  fontSize: 12,
  fontWeight: "700",
  color: "#530606",
  textAlign: "center"
},

/* Video item card */
videoItemCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 14,
  borderWidth: 1,
  borderColor: "#EEF2F7",
  marginBottom: 14,

  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
},

videoItemTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#5a0404",
},

videoItemMeta: {
  marginTop: 4,
  fontSize: 13,
  fontWeight: "600",
  color: "#0a1801",
},

/* Video player */
videoPlayer: {
  width: "100%",
  height: 200,
  borderRadius: 14,
  overflow: "hidden",
  backgroundColor: "#0B0F19",
  marginTop: 12,
  marginBottom: 12,
},

videoStage: {
  width: "100%",
  height: 200,
  borderRadius: 14,
  overflow: "hidden",
  backgroundColor: "#0B0F19",
  marginTop: 12,
  marginBottom: 12,
  position: "relative",
},

videoStageVideo: {
  width: "100%",
  height: "100%",
},

videoStageTouch: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
},

overlayToolRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 8,
},

overlaySwatchRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  marginTop: 8,
},

overlaySwatch: {
  width: 22,
  height: 22,
  borderRadius: 11,
  borderWidth: 1,
  borderColor: "#e5e7eb",
},

overlaySwatchActive: {
  borderColor: "#111827",
  borderWidth: 2,
},

overlaySwatchDivider: {
  width: 1,
  height: 18,
  backgroundColor: "#e5e7eb",
  marginHorizontal: 4,
},

overlayThicknessPill: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 999,
  backgroundColor: "#f3f4f6",
  borderWidth: 1,
  borderColor: "#e5e7eb",
},

overlayThicknessPillActive: {
  backgroundColor: "#111827",
  borderColor: "#111827",
},

overlayThicknessText: {
  fontSize: 11,
  fontWeight: "700",
  color: "#374151",
},

overlayThicknessTextActive: {
  color: "#fff",
},

overlayToolPill: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  backgroundColor: "#f3f4f6",
  borderWidth: 1,
  borderColor: "#e5e7eb",
},

overlayToolPillActive: {
  backgroundColor: COACH_RED,
  borderColor: COACH_RED,
},

overlayToolText: {
  fontSize: 12,
  fontWeight: "700",
  color: "#374151",
  textTransform: "capitalize",
},

overlayToolTextActive: {
  color: "#fff",
},

overlayChipRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 6,
},

overlayChip: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 999,
  backgroundColor: "#f3f4f6",
  borderWidth: 1,
  borderColor: "#e5e7eb",
},

overlayChipActive: {
  backgroundColor: COACH_RED,
  borderColor: COACH_RED,
},

overlayChipText: {
  fontSize: 11,
  fontWeight: "700",
  color: "#374151",
},

overlayChipTextActive: {
  color: "#fff",
},

overlayActionRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
},

overlayActionPill: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  backgroundColor: "#f8fafc",
  borderWidth: 1,
  borderColor: "#e5e7eb",
},

overlayActionPillActive: {
  backgroundColor: COACH_RED,
  borderColor: COACH_RED,
},

overlayActionText: {
  fontSize: 11,
  fontWeight: "700",
  color: "#374151",
},

overlayActionTextActive: {
  color: "#fff",
},

overlayTimeRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 8,
},

overlayTimeText: {
  fontSize: 12,
  fontWeight: "700",
  color: "#111827",
},

overlayTimeBtns: {
  flexDirection: "row",
  gap: 6,
},

overlayTimeBtn: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 999,
  backgroundColor: "#f3f4f6",
  borderWidth: 1,
  borderColor: "#e5e7eb",
},

overlayTimeBtnText: {
  fontSize: 11,
  fontWeight: "700",
  color: "#374151",
},

overlayHintText: {
  fontSize: 12,
  color: "#6b7280",
  marginTop: 6,
},

overlayList: {
  marginTop: 8,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#e5e7eb",
  backgroundColor: "#fafafa",
  padding: 8,
},

overlayListItem: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingVertical: 4,
},

overlayListTime: {
  fontSize: 11,
  fontWeight: "700",
  color: "#111827",
  width: 44,
},

overlayListType: {
  fontSize: 11,
  fontWeight: "700",
  color: "#6b7280",
  textTransform: "capitalize",
  width: 54,
},

overlayListNote: {
  fontSize: 11,
  color: "#374151",
  flex: 1,
},

overlayListMore: {
  fontSize: 11,
  color: "#6b7280",
  marginTop: 4,
  textAlign: "right",
},

/* Coach select */
assignLabel: {
  fontSize: 16,
  fontWeight: "700",
  color: "#7f0606",
  marginBottom: 8,
},

coachAssignLabel: {
  fontSize: 17,
  fontWeight: "700",
  color: COACH_RED,
  marginBottom: 8,
},

pickerCard: {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#E10600",
  backgroundColor: "#FFFFFF",
  overflow: "hidden",
  marginBottom: 8,
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 1,
},

/* Selected coach row */
selectedRow: {
  marginTop: 6,
  flexDirection: "row",
  alignItems: "center",
},

selectedLabel: {
  fontSize: 13,
  fontWeight: "700",
  color: "#6B7280",
},


/* Shared pill */
sharedPill: {
  alignSelf: "flex-start",
  marginTop: 12,
  backgroundColor: "rgba(16,185,129,0.10)",
  borderWidth: 1,
  borderColor: "rgba(16,185,129,0.25)",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 999,
},

sharedPillText: {
  fontSize: 12,
  fontWeight: "900",
  color: "#0F766E",
},

/* Confirm button */
confirmButton: {
  marginTop: 12,
  height: 52,
  borderRadius: 14,
  backgroundColor: "#E10600",
  alignItems: "center",
  justifyContent: "center",

  shadowOpacity: 0.16,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
},

confirmButtonText: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "900",
  letterSpacing: 0.2,
},

/* Secondary button (Return to dashboard) */
secondaryButton: {
  height: 52,
  borderRadius: 14,
  backgroundColor: "#FFFFFF",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1.5,
  borderColor: "#490604",
},

secondaryButtonText: {
  color: "#7f0606",
  fontSize: 15,
  fontWeight: "600",
  
},

/* ===========================
   TOP-RIGHT FIXED LOGO
   =========================== */

topRightLogoContainer: {
  position: "absolute",
  top: Platform.OS === "android" ? ANDROID_STATUS_BAR + 10 : 8,
  right: 16,
  zIndex: 50,
},

topRightLogo: {
  width: 60,
  height: 60,
  borderRadius: 12,
  resizeMode: "cover",
  backgroundColor: "#FFFFFF",

  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.08)",
  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
},



/* ===========================
   FITNESS (PLAYER) — PREMIUM
   =========================== */

fitnessTopCard: {
  backgroundColor: '#fff',
  borderRadius: 18,
  padding: 16,
  borderWidth: 1,
  borderColor: '#eef2f7',
  marginBottom: 14,

  shadowOpacity: 0.05,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
},

fitnessTopTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: '#7f0606',
  marginBottom: 6,
},

fitnessTopTextBlock: {
  paddingRight: 90,
},

fitnessTopSubtitle: {
  fontSize: 14,
  color: '#6b7280',
  lineHeight: 18,
  marginBottom: 12,
},

/* Segmented toggle (same feel as signup, but premium) */
fitnessToggleWrap: {
  flexDirection: 'row',
  backgroundColor: '#bb2b2b',
  borderRadius: 14,
  padding: 4,
},

fitnessToggleBtn: {
  flex: 1,
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
},

fitnessToggleBtnActive: {
  backgroundColor: '#fff',
},

fitnessToggleText: {
  fontWeight: '700',
  color: '#fff',
  fontSize: 15,
},

fitnessToggleTextActive: {
  color: '#7f0606',
},

/* Player picker (Coach Fitness) */
fitnessPlayerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#f1f5f9',
  backgroundColor: '#ffffff',
  marginTop: 8,
},

fitnessPlayerRowSelected: {
  borderColor: '#c62828',
  backgroundColor: 'rgba(198,40,40,0.08)',
},

fitnessPlayerName: {
  flex: 1,
  fontSize: 16,
  fontWeight: '700',
  color: '#111827',
  marginRight: 10,
},

fitnessPlayerPick: {
  fontSize: 12,
  fontWeight: '800',
  color: '#c62828',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  backgroundColor: 'rgba(198,40,40,0.12)',
  overflow: 'hidden',
},

/* Coach assigned cards */
fitnessAssignedCard: {
  backgroundColor: '#fff',
  borderRadius: 5,
  padding: 10,
  borderWidth: 1,
  borderColor: '#f1f5f9',
  marginTop: 12,
},

fitnessAssignedHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},



fitnessBadgeText: {
  fontSize: 12,
  fontWeight: '900',
  color: '#8b1a17',
  letterSpacing: 0.6,
},

fitnessAssignedMeta: {
  flex: 1,
  fontSize: 13,
  color: '#374151',
  fontWeight: '700',
},

fitnessDivider: {
  height: 1,
  backgroundColor: '#eef2f7',
  marginVertical: 12,
},

fitnessBulletRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 8,
  marginBottom: 6,
},

fitnessBulletDot: {
  fontSize: 16,
  lineHeight: 20,
  color: '#9ca3af',
  marginTop: 1,
},

fitnessBulletText: {
  flex: 1,
  fontSize: 18,
  color: '#9B1C1C',
  lineHeight: 18,
},

/* Share row (premium toggle) */
fitnessShareRow: {
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 14,
  padding: 12,
  borderWidth: 1,
  borderColor: '#eef2f7',
  backgroundColor: '#fff',
  marginBottom: 12,
},

fitnessShareDot: {
  width: 12,
  height: 12,
  borderRadius: 999,
  backgroundColor: '#e5e7eb',
  marginRight: 10,
},

fitnessShareDotOn: {
  backgroundColor: '#22c55e',
},

fitnessShareTitle: {
  fontSize: 14,
  fontWeight: '900',
  color: '#111827',
},

fitnessShareSub: {
  fontSize: 12,
  color: '#6b7280',
  marginTop: 2,
},

fitnessShareAction: {
  fontSize: 12,
  fontWeight: '900',
  color: '#111827',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  backgroundColor: '#f3f4f6',
},

fitnessInfoBox: {
  borderWidth: 1,
  borderColor: '#eef2f7',
  backgroundColor: '#f9fafb',
  borderRadius: 14,
  padding: 12,
  marginBottom: 12,
},

fitnessInfoText: {
  fontSize: 13,
  color: '#6b7280',
  lineHeight: 18,
},

/* Form cards */
fitnessFormCard: {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: '#f1f5f9',
  marginTop: 14,
},

fitnessFormHeaderRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
},

fitnessFormTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#9B1C1C',
},

fitnessRemoveText: {
  fontSize: 14,
  fontWeight: '700',
  color: '#9B1C1C',
},

fitnessTwoColRow: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 10,
},

fitnessCol: {
  flex: 1,
},

fitnessNotesInput: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 12,
  fontSize: 14,
  color: '#111827',
  height: 88,
  textAlignVertical: 'top',
},

/* History */
fitnessHistoryItem: {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: '#f1f5f9',
  marginTop: 12,
},

fitnessHistoryTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
},

fitnessHistoryDate: {
  flex: 1,
  fontSize: 15,
  fontWeight: '700',
  color: '#9B1C1C',
},

fitnessHistoryPill: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  borderWidth: 1,
},

fitnessHistoryPillCoach: {
  backgroundColor: 'rgba(225,6,0,0.08)',
  borderColor: 'rgba(225,6,0,0.18)',
},

fitnessHistoryPillSelf: {
  backgroundColor: 'rgba(17,24,39,0.06)',
  borderColor: 'rgba(17,24,39,0.10)',
},

fitnessHistoryPillText: {
  fontSize: 11,
  fontWeight: '700',
  color: '#E10600',
  letterSpacing: 0.6,
},

fitnessHistoryMeta: {
  fontSize: 15,
  color: '#000',
  marginTop: 6,
  lineHeight: 16,
},
/* ===========================
   FITNESS HISTORY TOGGLE
   =========================== */

historyToggleBtn: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#eef2f7',
  backgroundColor: '#fff',
},

historyToggleText: {
  fontSize: 14,
  fontWeight: '700',
  color: '#9B1C1C',
  letterSpacing: 0.2,
},


coachPremiumHeaderCard: {
  backgroundColor: '#ffffff',
  borderRadius: 18,
  padding: 14,
  marginBottom: 14,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
},

coachPremiumHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

coachPremiumHeaderTitle: {
  fontSize: 24,
  fontWeight: '800',
  color: COACH_RED,
},

coachPremiumHeaderSub: {
  marginTop: 4,
  fontSize: 14,
  color: '#6B7280',
},

coachPremiumHeaderLogo: {
  width: 54,
  height: 54,
  borderRadius: 12,
  resizeMode: 'cover',
},

/* ===========================
   COACH FITNESS — PREMIUM
   =========================== */
coachFitnessHeroCard: {
  backgroundColor: '#ffffff',
  borderRadius: 18,
  padding: 16,
  borderWidth: 1,
  borderColor: '#f1f5f9',
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
},
coachFitnessHeroRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
coachFitnessHeroTitle: {
  fontSize: 24,
  fontWeight: '800',
  color: COACH_RED,
},
coachFitnessHeroSub: {
  marginTop: 6,
  fontSize: 14,
  lineHeight: 18,
  color: '#6b7280',
},
coachFitnessHeroLogo: {
  width: 56,
  height: 56,
  borderRadius: 12,
  resizeMode: 'cover',
  borderWidth: 1,
  borderColor: '#f1f5f9',
},
coachFitnessStatsRow: {
  flexDirection: 'row',
  marginTop: 12,
},
coachFitnessStatPill: {
  flex: 1,
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 12,
  backgroundColor: '#bb2b2b',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
},
coachFitnessStatValue: {
  fontSize: 16,
  fontWeight: '800',
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachFitnessStatLabel: {
  marginTop: 2,
  fontSize: 12,
  fontWeight: '800',
  color: 'rgba(255,255,255,0.9)',
  letterSpacing: 0.2,
  textShadowColor: 'rgba(0,0,0,0.3)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachFitnessSegWrap: {
  flexDirection: 'row',
  backgroundColor: COACH_RED,
  borderRadius: 14,
  padding: 4,
  marginTop: 14,
},
coachFitnessSegBtn: {
  flex: 1,
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
},
coachFitnessSegBtnActive: {
  backgroundColor: '#ffffff',
},
coachFitnessSegText: {
  fontWeight: '700',
  color: '#ffffff',
  fontSize: 15,
},
coachFitnessSegTextActive: {
  color: COACH_RED,
},
coachFitnessSectionTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: COACH_RED,
  marginTop: 20,
  marginBottom: 8,
},
coachFitnessCard: {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: '#f1f5f9',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
},
coachFitnessCardHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
},
coachFitnessCardTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: COACH_RED,
},
coachFitnessBadge: {
  backgroundColor: '#bb2b2b',
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
  shadowColor: '#000',
  shadowOpacity: 0.18,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
},
coachFitnessBadgeText: {
  fontSize: 12,
  fontWeight: '800',
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachFitnessBadgeSuccess: {
  backgroundColor: '#167a3f',
  borderColor: 'rgba(255,255,255,0.22)',
},
coachFitnessBadgeSuccessText: {
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachFitnessEmptyText: {
  fontSize: 15,
  lineHeight: 20,
  color: '#6b7280',
},
coachFitnessListItem: {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#eef2f7',
  backgroundColor: '#ffffff',
},
coachFitnessListHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
coachFitnessListTitle: {
  flex: 1,
  fontSize: 16,
  fontWeight: '700',
  color: '#111827',
  marginRight: 8,
},
coachFitnessListMeta: {
  marginTop: 4,
  fontSize: 13,
  color: '#6b7280',
},
coachFitnessPill: {
  alignSelf: 'flex-start',
  borderRadius: 999,
  paddingHorizontal: 8,
  paddingVertical: 4,
  backgroundColor: '#bb2b2b',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
},
coachFitnessPillText: {
  fontSize: 11,
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: 0.2,
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachFitnessPillSuccess: {
  backgroundColor: '#167a3f',
  borderColor: 'rgba(255,255,255,0.22)',
},
coachFitnessPillSuccessText: {
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachFitnessBulletRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginTop: 6,
},
coachFitnessBulletDot: {
  fontSize: 14,
  color: '#9ca3af',
  marginRight: 8,
  marginTop: 1,
},
coachFitnessBulletText: {
  flex: 1,
  fontSize: 14,
  color: '#374151',
  lineHeight: 18,
},
coachFitnessDrillBlock: {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  backgroundColor: '#f9fafb',
  borderWidth: 1,
  borderColor: '#eef2f7',
},
coachFitnessDrillHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
coachFitnessRemoveText: {
  fontSize: 13,
  fontWeight: '700',
  color: '#c62828',
},
coachFitnessActionBtn: {
  marginTop: 10,
},

/* ===========================
   COACH AVAILABILITY — PREMIUM
   =========================== */
coachAvailabilityHeroCard: {
  backgroundColor: '#ffffff',
  borderRadius: 18,
  padding: 16,
  borderWidth: 1,
  borderColor: '#f1f5f9',
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
},
coachAvailabilityHeroRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
coachAvailabilityHeroTitle: {
  fontSize: 24,
  fontWeight: '800',
  color: COACH_RED,
},
coachAvailabilityHeroSub: {
  marginTop: 6,
  fontSize: 14,
  lineHeight: 18,
  color: '#6b7280',
},
coachAvailabilityStatsRow: {
  flexDirection: 'row',
  marginTop: 12,
},
coachAvailabilityStatPill: {
  flex: 1,
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 12,
  backgroundColor: '#bb2b2b',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
},
coachAvailabilityStatValue: {
  fontSize: 16,
  fontWeight: '800',
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachAvailabilityStatLabel: {
  marginTop: 2,
  fontSize: 12,
  fontWeight: '800',
  color: 'rgba(255,255,255,0.9)',
  letterSpacing: 0.2,
  textShadowColor: 'rgba(0,0,0,0.3)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachAvailabilitySectionTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: COACH_RED,
  marginTop: 20,
  marginBottom: 8,
},
coachAvailabilityCard: {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: '#f1f5f9',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
},
coachAvailabilityCardHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
},
coachAvailabilityCardTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: COACH_RED,
},
coachAvailabilityBadge: {
  backgroundColor: '#bb2b2b',
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
  shadowColor: '#000',
  shadowOpacity: 0.18,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
},
coachAvailabilityBadgeText: {
  fontSize: 12,
  fontWeight: '800',
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachAvailabilityBadgeBooked: {
  backgroundColor: '#374151',
  borderColor: 'rgba(255,255,255,0.22)',
},
coachAvailabilityBadgeBookedText: {
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachAvailabilityInfoText: {
  marginTop: 8,
  fontSize: 14,
  lineHeight: 18,
  color: '#6b7280',
},
coachAvailabilityDateBtn: {
  marginTop: 6,
},
coachAvailabilityEmptyText: {
  fontSize: 15,
  lineHeight: 20,
  color: '#6b7280',
},
coachAvailabilitySlotItem: {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#eef2f7',
  backgroundColor: '#ffffff',
},
coachAvailabilitySlotItemBooked: {
  backgroundColor: '#f9fafb',
},
coachAvailabilitySlotHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
coachAvailabilitySlotTime: {
  flex: 1,
  fontSize: 16,
  fontWeight: '700',
  color: '#111827',
  marginRight: 8,
},
coachAvailabilitySlotBadge: {
  alignSelf: 'flex-start',
  borderRadius: 999,
  paddingHorizontal: 8,
  paddingVertical: 4,
  backgroundColor: '#bb2b2b',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
},
coachAvailabilitySlotBadgeText: {
  fontSize: 11,
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: 0.2,
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachAvailabilitySlotBadgeBooked: {
  backgroundColor: '#374151',
  borderColor: 'rgba(255,255,255,0.22)',
},
coachAvailabilitySlotBadgeBookedText: {
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

/* ===========================
   COACH BOOKING REQUESTS — PREMIUM
   =========================== */
coachBookingHeroCard: {
  backgroundColor: '#ffffff',
  borderRadius: 18,
  padding: 16,
  borderWidth: 1,
  borderColor: '#f1f5f9',
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
},
coachBookingHeroRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
coachBookingHeroTitle: {
  fontSize: 24,
  fontWeight: '800',
  color: COACH_RED,
},
coachBookingHeroSub: {
  marginTop: 6,
  fontSize: 14,
  lineHeight: 18,
  color: '#6b7280',
},
coachBookingStatsRow: {
  flexDirection: 'row',
  marginTop: 12,
},
coachBookingStatPill: {
  flex: 1,
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 12,
  backgroundColor: '#bb2b2b',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
},
coachBookingStatValue: {
  fontSize: 16,
  fontWeight: '800',
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachBookingStatLabel: {
  marginTop: 2,
  fontSize: 12,
  fontWeight: '800',
  color: 'rgba(255,255,255,0.9)',
  letterSpacing: 0.2,
  textShadowColor: 'rgba(0,0,0,0.3)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachBookingSectionTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: COACH_RED,
  marginTop: 20,
  marginBottom: 8,
},
coachBookingCard: {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: '#f1f5f9',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 2,
},
coachBookingEmptyText: {
  fontSize: 15,
  lineHeight: 20,
  color: '#6b7280',
},
coachBookingRequestItem: {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#eef2f7',
  backgroundColor: '#ffffff',
},
coachBookingRequestHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
coachBookingRequestTitle: {
  flex: 1,
  fontSize: 16,
  fontWeight: '700',
  color: '#111827',
  marginRight: 8,
},
coachBookingRequestMeta: {
  marginTop: 4,
  fontSize: 13,
  color: '#6b7280',
},
coachBookingBadge: {
  alignSelf: 'flex-start',
  borderRadius: 999,
  paddingHorizontal: 8,
  paddingVertical: 4,
  backgroundColor: '#bb2b2b',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
},
coachBookingBadgeText: {
  fontSize: 11,
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: 0.2,
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
/////////////////////////

 
modalBody: {
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#e5e5e5',
  padding: 12,
  maxHeight: 380,
},
modalText: {
  fontSize: 14,
  lineHeight: 20,
  color: '#222',
},
modalActions: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 12,
},
modalSecondaryBtn: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#ccc',
},
modalSecondaryBtnText: {
  fontWeight: '600',
  color: '#333',
},
modalPrimaryBtn: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 10,
  backgroundColor: '#d90000',
},
modalPrimaryBtnText: {
  fontWeight: '700',
  color: '#fff',
},

  

  playerStatsCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 14,
  marginTop: 10,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
  borderWidth: 1,
  borderColor: 'rgba(17, 24, 39, 0.06)',
},


  // Logo
  logoWrapper: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  logoSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  logoWrapperSmall: {
  alignItems: 'center',
  marginTop: 8,
  marginBottom: 12,
},
  logoTextSmall: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  // Buttons on landing
  authButtons: {
    marginBottom: 80,
  },

  // Texts
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  subText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  label: {
    fontSize: 20,
    color: '#9B1C1C',
    marginTop: 12,
    marginBottom: 4,
    fontWeight:"400",
  },

  
  checkboxBoxChecked: {
    backgroundColor: '#E10600',
    borderColor: '#E10600',
  },
  

  // Dropdown
  dropdownSelected: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  dropdownSelectedText: {
    fontSize: 14,
    color: '#111827',
  },
  dropdownOptions: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#ffffff',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#111827',
  },
   playerWelcomeRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  playerWelcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827', // black-ish
  },
  playerWelcomeSubText: {
  marginTop: 20,
  marginBottom: 24,
  fontSize: 18,
  lineHeight: 22,
  color: '#374151',
},
 
  roleToggleRow: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 10,
  marginBottom: 16,
},


cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6, color: '#111' },
cardBody: { fontSize: 14, color: '#222', marginBottom: 4 },
cardMeta: { fontSize: 12, color: '#666', marginTop: 6 },
emptyCardText: { color: '#999', fontSize: 14 },


roleTogglePill: {
  flex: 1,
  borderRadius: 999,
  paddingVertical: 14,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#E10600',
  backgroundColor: '#FFFFFF',
},

roleTogglePillActive: {
  backgroundColor: '#E10600', // Topline red
  borderColor: '#C41C12',
},
sessionInfoBlock: {
  marginTop: 10,
  padding: 12,
  backgroundColor: '#F8F8F8',
  borderRadius: 10,
},
sessionSkillText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#111',
},
sessionMetaText: {
  fontSize: 12,
  color: '#666',
  marginTop: 2,
},

roleToggleText: {
  fontSize: 18,
  fontWeight: '700',
  color: '#222222',
},

roleToggleTextActive: {
  color: '#FFFFFF',
},
  cardSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COACH_RED,
    marginBottom: 6,
  },
  cardBodyText: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 2,
  },
  playerCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  playerCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  playerCardSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COACH_RED,
    marginBottom: 6,
    marginTop:20
  },
  playerCardBodyText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  

  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionPill: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ffffff',
    alignItems: 'center',
  },
  quickActionPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
   playerQuickActionsCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  playerQuickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  playerQuickActionTile: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  
  playerQuickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
    playerStatsButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#E10600',
  },
  playerStatsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  playerStatsSecondaryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  playerStatsSecondaryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },

  statsFieldHalf: {
    flex: 1,
  },

  statsInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  statsButtonsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  statsCaption: {
    marginTop: 2,
    marginBottom: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  statsTableBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  statsTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statsTableLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  statsTableValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statsTableDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
playerTypeRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 6,
},
pasteLinkButton: {
  alignSelf: 'flex-start',
  marginTop: 4,
  marginBottom: 4,
  paddingVertical: 4,
  paddingHorizontal: 10,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#e5e7eb',
},
pasteLinkText: {
  fontSize: 12,
  color: '#374151',
  fontWeight: '500',
},


playerTypeCell: {
  flex: 1,                // each cell takes half the row
  alignItems: 'flex-start',
},
  fitnessBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  fitnessBadge: {
    backgroundColor: '#fee2e2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  
  fitnessTableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    marginTop: 8,
  },
  fitnessTableHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  fitnessTableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  fitnessTableCellText: {
    fontSize: 13,
    color: '#111827',
  },
    sessionCardUpcoming: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'column',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444', // red accent
  },
  sessionCardEmpty: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sessionCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  sessionStatusChipUpcoming: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sessionStatusChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#111827',
  },
  sessionCoachText: {
    fontSize: 12,
    color: '#4b5563',
  },
  sessionMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDateBlock: {
    width: 52,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sessionDateDay: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  sessionDateNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f9fafb',
    marginTop: -2,
  },
  sessionDetailsBlock: {
    flex: 1,
  },
  sessionTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
/* ===========================
   SIGN IN / SIGN UP – NEW STYLES
   =========================== */


/* Role pill button */
rolePill: {
  paddingVertical: 10,
  paddingHorizontal: 18,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#E10600', // TC red
  backgroundColor: '#FFFFFF',
},

/* Active role pill */
rolePillActive: {
  backgroundColor: '#E10600',
},

/* Role pill text */
rolePillText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#E10600',
},

/* Active role pill text */
rolePillTextActive: {
  color: '#FFFFFF',
},
/* ===========================
   COMMON AUTH TEXT STYLES
   =========================== */

/* Main heading (H1) */

/* Small logo wrapper (signin/signup top) */

/* Brand title text (fallback if logo image not used) */
brandTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#E10600',
  letterSpacing: 1,
},

  coachHeader: {
    marginBottom: 16,
  },
  coachWelcomeLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  coachWelcomeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  coachWelcomeSubText: {
    marginTop: 4,
    fontSize: 13,
    color: '#4b5563',
  },
  coachCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  coachCardEmpty: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  coachCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  coachCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  coachCardBodyText: {
    fontSize: 13,
    color: '#374151',
    marginTop: 4,
  },
  coachTagPill: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  coachTagPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b91c1c',
  },
  coachMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  coachMetaText: {
    fontSize: 12,
    color: '#4b5563',
  },
 coachHeaderCard: {
  padding: 16,
  borderRadius: 16,
  marginBottom: 16,
},



coachHeaderStatsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 16,
},

coachHeaderStatPill: {
  backgroundColor: 'rgba(255,255,255,0.15)',
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 12,
  minWidth: 90,
},

coachHeaderStatLabel: {
  color: 'white',
  fontSize: 12,
},

coachHeaderStatValue: {
  color: 'white',
  fontWeight: '700',
  fontSize: 14,
},

playerHeaderCard: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 16,
  borderRadius: 16,
  marginBottom: 16,
},

playerWelcomeLabel: {
  color: 'white',
  fontSize: 14,
  opacity: 0.9,
},

playerWelcomeName: {
  color: 'white',
  fontSize: 20,
  fontWeight: '700',
},

playerHeaderLogo: {
  width: 44,
  height: 44,
  borderRadius: 8,
},
coachTabsRow: {
  flexDirection: 'row',
  marginTop: 10,
  marginBottom: 10,
},
coachTabPill: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: '#e5e7eb',
  alignItems: 'center',
  marginRight: 8,
  backgroundColor: '#ffffff',
},
coachTabPillActive: {
  backgroundColor: '#b91c1c',
  borderColor: '#b91c1c',
},
coachTabText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#111827',
},
coachTabTextActive: {
  color: '#ffffff',
},

coachVideoCard: {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  padding: 12,
  marginBottom: 12,
  shadowColor: '#000000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
},
coachVideoCardTopRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
},
coachVideoTitle: {
  fontSize: 15,
  fontWeight: '700',
  color: '#111827',
},
coachVideoMeta: {
  fontSize: 13,
  color: '#4b5563',
  marginTop: 2,
},
coachVideoCTA: {
  marginTop: 10,
  fontSize: 14,
  fontWeight: '600',
  color: COACH_RED,
},

coachStatusPill: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 12,
  marginLeft:120,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
  shadowColor: '#000',
  shadowOpacity: 0.18,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
},
coachStatusPillPending: {
  backgroundColor: '#bb2b2b',
},
coachStatusPillDone: {
  backgroundColor: '#167a3f',
},
coachStatusText: {
  fontSize: 12,
  fontWeight: '700',
},
coachStatusTextPending: {
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
coachStatusTextDone: {
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

coachReviewHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
coachCloseText: {
  fontSize: 14,
  fontWeight: '700',
  color: '#b91c1c',
},
coachTopHeaderRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
},

coachTopRightLogo: {
  width: 44,
  height: 44,
  marginLeft: 10,
},

coachTopRightLogoSmall: {
  width: 34,
  height: 34,
},
consentInlineText: {
  fontSize: 12,
  color: '#374151',
  textAlign: 'center',
  marginVertical: 10,
},

consentLink: {
  color: '#b91c1c',
  fontWeight: '700',
},

primaryButtonDisabled: {
  opacity: 0.5,
},

consentModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'center',
  padding: 20,
},

consentModalCard: {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  padding: 16,
  maxHeight: '80%',
},

consentText: {
  fontSize: 13,
  color: '#374151',
  marginBottom: 10,
  lineHeight: 18,
},

dashHeaderCard: {
  backgroundColor: '#D40000', // TC red
  borderRadius: 18,
  padding: 18,
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 18,
  // little depth
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
},

dashHeaderAvatar: {
  width: 46,
  height: 46,
  borderRadius: 23,
  backgroundColor: 'rgba(255,255,255,0.18)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.25)',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
  marginTop: 2,
},
dashHeaderAvatarText: {
  color: '#FFFFFF',
  fontWeight: '800',
  fontSize: 16,
},

dashHeaderTextBlock: {
  flex: 1,
  paddingRight: 10,
},

dashHeaderHi: {
  color: 'rgba(255,255,255,0.9)',
  fontSize: 14,
  marginBottom: 2,
},

dashHeaderName: {
  color: '#FFFFFF',
  fontSize: 22,
  fontWeight: '800',
  marginBottom: 2,
},

dashHeaderSubtitle: {
  color: 'rgba(255,255,255,0.9)',
  fontSize: 14,
  marginBottom: 10,
},

dashHeaderWelcome: {
  color: 'rgba(255,255,255,0.92)',
  fontSize: 14,
  lineHeight: 20,
  marginTop: 6,
},

dashHeaderLogo: {
  width: 44,
  height: 44,
  resizeMode: 'contain',
  borderRadius: 10,
},
heroContainer: {
    marginTop: 6,
    marginBottom: 18,
  },
  heroGradient: {
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  
  greeting: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  meta: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
  },
  tagline: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },


dropdownHelperText: {
  marginTop: 8,
  color: '#6B7280',
  fontSize: 12,
},

pickerCardSelected: {
  borderColor: '#E10600',
  borderWidth: 2,
},

loginBackButton: {
  position: 'absolute',
  top: 12,
  left: 12,
  zIndex: 10,
  padding: 6,
},

// ✅ selected coach "highlight in red" (soft)
pickerCardSelectedSoft: {
  backgroundColor: '#FFF1F1',
  borderColor: '#E10600',
},

// ✅ when shared: lock it visually
pickerCardLocked: {
  opacity: 0.75,
},


selectedCoachText: {
  marginTop: 8,
  fontSize: 13,
  fontWeight: '700',
  color: '#E10600', // ✅ red highlight text
},

  
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },


  cardWrap: {
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    marginBottom: 14,
  },


  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  leftBlock: {
    flex: 1,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 6,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  metaLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  metaValue: {
    fontSize: 12,
    color: '#111',
    fontWeight: '800',
  },


  subMeta: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },

  emptyStateWrap: {
    paddingVertical: 8,
  },
  
  loading: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },

selectedCoachName: {
  color: '#E10600',   // ✅ only name red
  fontWeight: '800',
},
playerHeroContainer: {
  borderRadius: 18,
  overflow: 'hidden',
  marginHorizontal: 16,
  marginTop: 10,          // ✅ was larger – reduce
  marginBottom: 14,
},

playerHeroGradient: {
  paddingTop: 10,         // ✅ move everything up (was ~18/20)
  paddingBottom: 14,
  paddingHorizontal: 16,
  minHeight: 150,         // ✅ reduce height if you had 170-190
},

playerHeroTopRow: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  marginBottom: 6,        // ✅ tighten (was ~12)
},

playerHeroLogo: {
  width: 44,              // keep or slightly bigger
  height: 44,
  resizeMode: 'contain',
},

playerHeroContent: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 0,           // ✅ remove extra gap
  marginBottom: 6,        // ✅ tighten
},

playerAvatarCircle: {
  width: 48,              // optional: slightly smaller
  height: 48,
  borderRadius: 24,
  marginRight: 12,
},

playerHeroTextBlock: {
  flex: 1,
  paddingTop: 0,          // ✅ important: removes the “floating down” look
},

playerHeroGreeting: {
  marginTop: -2,          // ✅ micro-shift upward
  marginBottom: 0,
},

playerHeroName: {
  marginTop: -2,          // ✅ brings name closer to "Hi,"
  marginBottom: 2,
},

playerHeroTagline: {
  marginTop: 4,           // ✅ less spacing
  lineHeight: 18,
},

leftRow: {
  flexDirection: 'row',
  alignItems: 'center',
  flexShrink: 1,
},

logo: {
  width: 54,        // slightly bigger
  height: 54,
  resizeMode: 'contain',
},

textBlock: {
  marginLeft: 12,
  flexShrink: 1,
},

toplineGradientCard: {
  borderRadius: 20,
  padding: 16,
},

toplineTitle: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '800',
},

toplineChip: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: 'rgba(255,255,255,0.18)',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 999,
},

toplineChipText: {
  color: '#fff',
  fontWeight: '800',
  fontSize: 13,
},

toplinePill: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: 'rgba(255,255,255,0.16)',
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 14,
},

toplinePillText: {
  color: '#fff',
  fontWeight: '700',
  fontSize: 13,
},

toplineDivider: {
  height: 1,
  backgroundColor: 'rgba(255,255,255,0.22)',
  marginVertical: 12,
},

feedbackMetaRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 10,
},

metaPill: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  backgroundColor: 'rgba(255,255,255,0.16)',
  paddingVertical: 8,
  paddingHorizontal: 10,
  borderRadius: 999,
},
  // --- Video Share Modal / Coach list ---
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },

  listRowSelected: {
    borderColor: '#8B1D1D',
    backgroundColor: 'rgba(139, 29, 29, 0.08)',
  },

  listRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

safeArea:{
flex: 1,
backgroundColor: '#fff',
},

metaPillText: {
  color: '#fff',
  fontWeight: '800',
  fontSize: 13,
},

feedbackCoachRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

toplineCoach: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '800',
},

toplineFeedback: {
  color: '#fff',
  fontSize: 14,
  marginTop: 6,
  lineHeight: 20,
  fontWeight: '600',
},

// -----------------------------
// Shimmer (loading skeleton)
// -----------------------------
shimmerBlock: {
  height: 18,
  borderRadius: 12,
  backgroundColor: 'rgba(0,0,0,0.06)',
  overflow: 'hidden',
},

shimmerGradient: {
  flex: 1,
},

pillRow: {
  flexDirection: 'row',
  gap: 10,
  marginTop: 12
},

recentPillRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
},



// ✅ New: reusable “Topline bordered section card”
backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  backBtnText: { fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  uploadBtnTop: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#c81414',
  },
  uploadBtnTopText: { color: '#fff', fontWeight: '800' },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  previewBox: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee',
    marginBottom: 12,
  },
  // --- Player Videos screen helpers ---

fieldBlock: {
  marginBottom: 14,
},

pickerWrap: {
  borderWidth: 1,
  borderColor: '#E5E7EB', // light grey
  borderRadius: 10,
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
},

videoPreview: {
  width: '100%',
  height: 220,
  borderRadius: 12,
  backgroundColor: '#000',
},

// Add these ONLY if they don't already exist in your styles.ts


uploadBtn: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 12,
  backgroundColor: '#b30000',
},

uploadBtnText: {
  color: '#fff',
  fontWeight: '800',
},

center: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
},


emptyText: {
  fontSize: 14,
  color: '#555',
},

listContent: {
  paddingBottom: 24,
},

videoTitle: {
  fontSize: 16,
  fontWeight: '800',
  marginBottom: 4,
},

videoMeta: {
  fontSize: 13,
  color: '#666',
  marginBottom: 10,
},

// You specifically asked for these 3:

videoNotes: {
  marginTop: 10,
  fontSize: 13,
  color: '#333',
},

previewWrap: {
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: '#ddd',
  marginBottom: 12,
},

videoPlaceholder: {
  width: '100%',
  height: 190,
  borderRadius: 14,
  backgroundColor: '#ddd',
},
inputMultiline: {
  minHeight: 84,
  textAlignVertical: 'top',
},


pillActive: {
  backgroundColor: '#b30000',
},



pillTextActive: {
  color: '#fff',
},

coachList: {
  backgroundColor: '#fff',
  borderRadius: 14,
  borderWidth: 1,
  borderColor: '#ddd',
  overflow: 'hidden',
},

coachRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},

coachRowSelected: {
  borderColor: '#b30000',
},

coachName: {
  fontSize: 14,
  fontWeight: '700',
},

checkMark: {
  fontSize: 16,
  fontWeight: '900',
  color: '#b30000',
},

modalBtnRow: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 16,
},



modalBtnTextSecondary: {
  fontWeight: '800',
  color: '#333',
},

modalBtnTextPrimary: {
  fontWeight: '900',
  color: '#fff',
},

backDashBtn: {
  marginTop: 14,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: '#b30000',
  paddingVertical: 14,
  alignItems: 'center',
  backgroundColor: '#fff',
},

backDashBtnText: {
  fontWeight: '900',
  color: '#333',
},
 sectionSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    marginTop: 20,
    marginBottom: 8,
  },

  /* ------------------------------
   * Picker button (Select role / level / state etc.)
   * ------------------------------ */
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
    justifyContent: 'center',
  },

  pickerButtonText: {
    fontSize: 15,
    color: '#333',
  },

  pickerPlaceholderText: {
    fontSize: 15,
    color: '#999',
  },

  /* ------------------------------
   * Modal bullet text (consent modal)
   * ------------------------------ */
  modalBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  modalBulletDot: {
    fontSize: 14,
    lineHeight: 20,
    marginRight: 8,
    color: '#d32f2f', // Topline red
  },

  modalBulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },

  /* ------------------------------
   * Below-field error text
   * ------------------------------ */
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
logoRow: {
  flexDirection: 'row',
  justifyContent: 'flex-end', // pushes logo to right
  alignItems: 'center',
  marginBottom: 12,
},

logoSmall: {
  width: 42,
  height: 42,
  resizeMode: 'contain',
},
// Add to your existing styles object (do NOT remove/rename anything you already have)

modalHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

modalCloseBtn: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
},

modalCloseText: {
  fontSize: 18,
  fontWeight: '700',
},

modalBulletRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 8,
},
consentButton: {
  marginTop: 12,
},

consentButtonText: {
  color: '#C62828',
  fontSize: 14,
  fontWeight: '600',
},
header: {
  alignItems: 'center',
  marginBottom: 16,
},

title: {
  fontSize: 22,
  fontWeight: '700',
  color: '#111',
  marginTop: 8,
},
 
  subtitle: { fontSize: 15, color: "#666", marginTop: 6 },

  tabRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  tabPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#b71c1c",
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  tabPillActive: { backgroundColor: "#b71c1c" },

  // ✅ you asked for these
  coachPillText: { color: "#b71c1c", fontWeight: "800" },
  coachPillTextActive: { color: "#fff", fontWeight: "800" },

  segmentRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  segmentPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  segmentPillActive: { backgroundColor: "#b71c1c", borderColor: "#b71c1c" },
  segmentText: { color: "#333", fontWeight: "700" },
  segmentTextActive: { color: "#fff", fontWeight: "800" },

  emptyCard: {
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },


  videoCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  videoCardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  videoMetaSmall: { color: "#888", marginTop: 6, fontSize: 12 },
  videoLink: { color: "#b71c1c", marginTop: 8, fontWeight: "700" },

  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPending: { backgroundColor: "#fde2e2" },
  statusReviewed: { backgroundColor: "#e3f7e7" },
  statusText: { fontWeight: "800" },
  statusTextPending: { color: "#b71c1c" },
  statusTextReviewed: { color: "#1b5e20" },

  
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalClose: { color: "#b71c1c", fontWeight: "800" },
  modalVideo: { width: "100%", height: 220, marginTop: 12, borderRadius: 12 },
  
  uploadBigButton: {
    marginTop: 14,
    backgroundColor: "#b71c1c",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  uploadBigButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  uploadSubText: { marginTop: 6, color: "rgba(255,255,255,0.85)", fontWeight: "700" },

  previewCard: {
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  previewVideo: { width: "100%", height: 220 },

  formCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },
  formLabel: { fontWeight: "900", color: "#111", marginBottom: 10 },

  playerList: {
    borderWidth: 1,
    borderColor: "#f0caca",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  playerRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3e1e1",
    backgroundColor: "#fff",
  },
  playerRowActive: { backgroundColor: "#fde2e2" },
  playerRowText: { color: "#b71c1c", fontWeight: "800" },
  playerRowTextActive: { color: "#b71c1c", fontWeight: "900" },

  
  videoCardTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  

  video: { width: "100%", height: 220, marginTop: 10, borderRadius: 12 },


  modalScreen: { flex: 1, backgroundColor: "#fff" },
  modalContent: { padding: 16, paddingBottom: 28 },
  // ---------- Coach pills ----------
coachTabPillInactive: {
  flex: 1,
  height: 44,
  borderRadius: 22,
  backgroundColor: "#FFFFFF",
  borderWidth: 1.5,
  borderColor: "#E5E7EB",
  alignItems: "center",
  justifyContent: "center",
},

coachPillTextInactive: {
  color: "#6B7280",
  fontSize: 15,
  fontWeight: "700",
},

// ---------- Generic helpers ----------
centered: {
  alignItems: "center",
  justifyContent: "center",
},

// ---------- Video card ----------
videoCardHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 6,
},

videoCardName: {
  fontSize: 16,
  fontWeight: "700",
  color: "#111827",
},

videoCardMeta: {
  fontSize: 14,
  color: "#6B7280",
  marginTop: 2,
},

videoCardAction: {
  marginTop: 6,
  fontSize: 14,
  fontWeight: "700",
  color: "#B91C1C",
},

// ---------- Modal ----------
modalContainer: {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 16,
  marginHorizontal: 20,
},

modalSectionTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#111827",
  marginBottom: 10,
},

modalTextArea: {
  minHeight: 90,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 12,
  paddingTop: 12,
  fontSize: 15,
  color: "#111827",
  textAlignVertical: "top",
},

// ---------- Video preview ----------
videoPreviewPlaceholder: {
  height: 220,
  borderRadius: 16,
  backgroundColor: "#000000",
  alignItems: "center",
  justifyContent: "center",
  marginVertical: 10,
},

videoPreviewPlaceholderText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "700",
},

// ---------- Upload ----------
uploadButton: {
  height: 48,
  borderRadius: 16,
  backgroundColor: "#B91C1C",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 12,
},

uploadButtonText: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "800",
},

uploadCountText: {
  marginTop: 6,
  fontSize: 13,
  color: "#6B7280",
  textAlign: "center",
},

// ---------- Picker ----------
pickerWrapper: {
  borderWidth: 1,
  borderColor: "#E5E7EB",
  borderRadius: 14,
  backgroundColor: "#FFFFFF",
  marginBottom: 10,
  overflow: "hidden",
},

picker: {
  height: 46,
  width: "100%",
},
// ---------- Disabled confirm button ----------
confirmButtonDisabled: {
  backgroundColor: "#F3F4F6",        // light grey
  borderColor: "#E5E7EB",
  borderWidth: 1,
  opacity: 0.6,
},

// ---------- Upload video card / button ----------
uploadedVideo: {
  height: 52,
  borderRadius: 16,
  backgroundColor: "#B91C1C",        // Topline red
  alignItems: "center",
  justifyContent: "center",
  marginVertical: 10,
},

// ---------- Textarea ----------
textArea: {
  minHeight: 100,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 12,
  paddingTop: 12,
  fontSize: 15,
  color: "#111827",
  textAlignVertical: "top",
},
  });
