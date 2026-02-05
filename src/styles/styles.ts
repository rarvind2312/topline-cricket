import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // General
  authContainer: {
  flex: 1,
  backgroundColor: '#ffffff',
  paddingHorizontal: 28,
  paddingTop: 40,
  paddingBottom: 24,
  justifyContent: 'space-between',
},
  screenContainer: {
  flex: 1,
  backgroundColor: '#ffffff',
  paddingHorizontal: 28,
  paddingTop: 0,
  paddingBottom: 20,
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'center',
  padding: 16,
},

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

  formScroll: {
   paddingBottom: 60,
  paddingHorizontal: 6,
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

statsValue: {
  fontSize: 16,
  fontWeight: '800',
  color: '#111827',
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

  videoItemCard: {
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 14,
  },
  videoItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  videoItemMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: '#000',
  },


  primaryButton: {
  backgroundColor: '#E10600',
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: 'center',
  width: '85%',         // <— narrower than screen
  alignSelf: 'center',  // <— center horizontally
},
  primaryButtonText: {
   color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
  marginTop: 12,
  paddingVertical: 14,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E10600',
  alignItems: 'center',
  width: '85%',
  alignSelf: 'center',
},
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
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
    fontSize: 18,
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },

  // Role chips
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
     marginBottom: 24, 
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  roleChipSelected: {
    backgroundColor: '#E10600',
    borderColor: '#E10600',
  },
  roleChipText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  roleChipTextSelected: {
     color: '#ffffff',
  fontWeight: '600',
  },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9ca3af',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#E10600',
    borderColor: '#E10600',
  },
  checkboxTick: {
    color: '#022c22',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
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
  fontSize: 20,
  lineHeight: 22,
  color: '#374151',
},
 
  roleToggleRow: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 10,
  marginBottom: 16,
},
sectionTitle: {
  fontSize: 20,
  fontWeight: '800',
  marginTop: 10,
  marginBottom: 10,
  color: '#111', // ✅ visible
},

card: {
  backgroundColor: '#fff', // ✅ force white background
  borderRadius: 18,
  padding: 16,
  borderWidth: 1,
  borderColor: '#eee',
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  marginBottom: 14,
},

cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6, color: '#111' },
cardBody: { fontSize: 14, color: '#222', marginBottom: 4 },
cardMeta: { fontSize: 12, color: '#666', marginTop: 6 },
emptyCardText: { color: '#999', fontSize: 14 },

statsHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

statsCardTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
statsCardSubtitle: { color: '#666', marginTop: 6, lineHeight: 18 },

editLink: { color: '#b10f0f', fontWeight: '800' },

statsTable: {
  marginTop: 14,
  backgroundColor: '#fff',
  borderRadius: 14,
  borderWidth: 1,
  borderColor: '#eee',
  overflow: 'hidden',
},

statsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},

statsRowLast: {
  borderBottomWidth: 0,
},

statsLabel: { color: '#666', fontWeight: '600' },

statsButton: {
  marginTop: 14,
  backgroundColor: '#f2f2f2',
  borderRadius: 14,
  paddingVertical: 12,
  paddingHorizontal: 14,
  alignSelf: 'flex-start',
},

statsButtonText: { fontWeight: '800', color: '#111' },

roleTogglePill: {
  flex: 1,
  borderRadius: 999,
  paddingVertical: 14,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#D7D7D7',
  backgroundColor: '#FFFFFF',
},

roleTogglePillActive: {
  backgroundColor: '#C41C12', // Topline red
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
  fontSize: 16,
  fontWeight: '700',
  color: '#222222',
},

roleToggleTextActive: {
  color: '#FFFFFF',
},
  cardSubtitle: {
    fontSize: 14,
    color: '#f9fafb',
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
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  playerCardBodyText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  playerCardEmptyText: {
    fontSize: 14,
    color: '#9ca3af',
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
  playerQuickActionEmoji: {
    fontSize: 18,
    marginBottom: 4,
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
  fitnessBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b91c1c',
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
h1: {
  fontSize: 24,
  fontWeight: '700',
  color: '#111111',
  textAlign: 'center',
  marginBottom: 20,
},

/* Text-only button (e.g. Sign up / Sign in links) */
linkButton: {
  alignSelf: 'center',
  marginTop: 16,
  paddingVertical: 6,
},
textInput: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E7EB',   // same neutral border used elsewhere
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: '#111827',
},
/* Link button text */
linkButtonText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#E10600', // Topline red
},
fieldLabel: {
  fontSize: 14,
  fontWeight: '600',
  marginTop: 14,
  marginBottom: 6,
},
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
  fontSize: 12,
  color: '#4b5563',
  marginTop: 2,
},
coachVideoCTA: {
  marginTop: 10,
  fontSize: 13,
  fontWeight: '600',
  color: '#b91c1c',
},

coachStatusPill: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  marginLeft: 10,
},
coachStatusPillPending: {
  backgroundColor: '#fee2e2',
},
coachStatusPillDone: {
  backgroundColor: '#dcfce7',
},
coachStatusText: {
  fontSize: 11,
  fontWeight: '700',
},
coachStatusTextPending: {
  color: '#b91c1c',
},
coachStatusTextDone: {
  color: '#166534',
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
pickerCard: {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#e5e7eb',
  overflow: 'hidden',
  marginBottom: 12,
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
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
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
videoUploadCard: {
  marginTop: 14,
  backgroundColor: '#E10600',
  borderRadius: 18,
  paddingVertical: 26,
  paddingHorizontal: 18,
  alignItems: 'center',
  justifyContent: 'center',
},

videoUploadHint: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},

videoUploadMeta: {
  marginTop: 10,
  color: 'rgba(255,255,255,0.85)',
  fontSize: 13,
},

dropdownHelperText: {
  marginTop: 8,
  color: '#6B7280',
  fontSize: 12,
},
assignLabel: {
  marginTop: 12,
  fontSize: 14,
  fontWeight: '700',
  color: '#111827',
},

pickerCardSelected: {
  borderColor: '#E10600',
  borderWidth: 2,
},


confirmButton: {
  marginTop: 12,
  backgroundColor: '#E10600',
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: 'center',
},

confirmButtonText: {
  color: '#FFFFFF',
  fontWeight: '800',
  fontSize: 15,
},

sharedPill: {
  marginTop: 12,
  alignSelf: 'flex-start',
  backgroundColor: 'rgba(16,185,129,0.15)', // light green tint
  borderRadius: 999,
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: 'rgba(16,185,129,0.35)',
},

sharedPillText: {
  color: '#065F46',
  fontWeight: '800',
  fontSize: 12,
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
selectedRow: {
  marginTop: 8,
  fontSize: 13,
},

selectedLabel: {
  color: '#111827',
  fontWeight: '700',
},

sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
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

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },

  bigTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
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

  divider: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginVertical: 12,
  },

  feedbackText: {
    fontSize: 14,
    color: '#111',
    lineHeight: 20,
    fontWeight: '600',
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
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    fontWeight: '600',
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
screen: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16, paddingBottom: 26 },

  headerCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    backgroundColor: '#b10f0f',
  },
  


  headerTextBlock: { flex: 1, paddingRight: 10 },
  headerHi: { color: '#fff', fontSize: 14, opacity: 0.9 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  headerRole: { color: '#fff', fontSize: 14, marginTop: 4, opacity: 0.9 },
  headerWelcome: { color: '#fff', marginTop: 10, opacity: 0.9, lineHeight: 18 },

  headerLogo: { width: 44, height: 44, borderRadius: 10, resizeMode: 'contain' },


  quickActionsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: '#fafafa',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  quickActionEmoji: { fontSize: 20, marginBottom: 6 },
  quickActionText: { fontWeight: '700', color: '#111' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  modalField: { flex: 1 },
  modalLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  modalButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  modalBtnSecondary: { backgroundColor: '#f2f2f2' },
  modalBtnPrimary: { backgroundColor: '#b10f0f' },
  modalBtnSecondaryText: { fontWeight: '800', color: '#111' },
  modalBtnPrimaryText: { fontWeight: '800', color: '#fff' },

headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
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

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
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

shimmerOverlay: {
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 140,
},

shimmerGradient: {
  flex: 1,
},

pillRow: {
  flexDirection: 'row',
  gap: 10,
  marginTop: 12
},
pillText: {
color:'#7A0A0C',
fontWeight: '800',
fontSize: 12,
},
recentPillRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
},

sectionBlock:{
marginTop: 10,
},

// ✅ New: reusable “Topline bordered section card”
  toplineSectionCard :{
    borderWidth: 1.5,
    borderColor: '#B31217',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

 pill :{
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(179,18,23,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(179,18,23,0.25)',
  },

  shimmerBox :{
    height: 84,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
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

  backButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#b71c1c",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonText: { color: "#111", fontWeight: "700" },

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
  fontSize: 17,
  fontWeight: "800",
  color: "#111827",
},

videoCardMeta: {
  fontSize: 13,
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
