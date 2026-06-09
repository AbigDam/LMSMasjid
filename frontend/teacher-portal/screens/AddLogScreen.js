// screens/AddLogScreen.js
// -----------------------------------------------------------------------------
// Teacher daily log screen. Three inline sections:
//
//   1. Student roster — all students in the class, coloured dot showing
//      whether a log exists for today. Tap to select.
//
//   2. Log panel — if the selected student already has a log for today,
//      show it with an Edit button (opens AddLogForm inline).
//      If no log yet, show the AddLogForm directly so the teacher can log now.
//
//   3. Report Generator — scoped to the selected student's full log history.
//
// TODO (Django):
//   - Replace MOCK_STUDENTS with GET /api/students/?classroom=<id>
//   - Replace INITIAL_LOGS  with GET /api/logs/?student=<id>
//   - handleAddLog    → POST  /api/logs/
//   - handleUpdateLog → PATCH /api/logs/<id>/
// -----------------------------------------------------------------------------

import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { AddLogForm }      from '../components/AddLogForm';
import { ReportGenerator } from '../components/ReportGenerator';
import { brand }           from '../constants/brand';
import { colors, fonts, radii, shadow, spacing } from '../constants/theme';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const TODAY = new Date().toISOString().split('T')[0];

const MOCK_STUDENTS = [
  { id: 1, name: 'Ahmad Al-Farsi',    initials: 'AF' },
  { id: 2, name: 'Yusuf Khalid',      initials: 'YK' },
  { id: 3, name: 'Mariam Hassan',     initials: 'MH' },
  { id: 4, name: 'Bilal Osman',       initials: 'BO' },
  { id: 5, name: 'Fatima Al-Zahra',   initials: 'FZ' },
];

// Keyed by studentId → array of LogEntry.
// Only student 1 and 3 have a log for today so the "needs log" dot is visible
// on the others.
const MOCK_LOGS = {
  1: [
    {
      id: 101, date: TODAY,
      surah: 2, surahName: 'Al-Baqarah', ayahStart: 11, ayahEnd: 20,
      type: 'memorization', behavior: 5, grade: 'pass',
      assignments: 'Memorize ayahs 21-25. Focus on tajweed.',
    },
    {
      id: 102, date: '2026-05-30',
      surah: 2, surahName: 'Al-Baqarah', ayahStart: 1, ayahEnd: 10,
      type: 'review', behavior: 3, grade: 'pass',
      assignments: 'Review old juz.',
    },
  ],
  2: [
    {
      id: 201, date: '2026-05-28',
      surah: 1, surahName: 'Al-Fatihah', ayahStart: 1, ayahEnd: 7,
      type: 'memorization', behavior: 5, grade: 'pass',
      assignments: 'Perfect letter pronunciation.',
    },
  ],
  3: [
    {
      id: 301, date: TODAY,
      surah: 3, surahName: 'Ali Imran', ayahStart: 1, ayahEnd: 5,
      type: 'review', behavior: 4, grade: 'pass',
      assignments: 'Continue revision.',
    },
  ],
  4: [],
  5: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hasLogToday(logs) {
  return logs.some(l => l.date === TODAY);
}

function getTodayLog(logs) {
  return logs.find(l => l.date === TODAY) ?? null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single student pill in the roster */
function StudentChip({ student, logs, selected, onPress }) {
  const logged = hasLogToday(logs);
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.chipAvatar, selected && styles.chipAvatarSelected]}>
        <Text style={[styles.chipInitials, selected && styles.chipInitialsSelected]}>
          {student.initials}
        </Text>
      </View>

      <Text
        style={[styles.chipName, selected && styles.chipNameSelected]}
        numberOfLines={1}
      >
        {student.name}
      </Text>

      {/* Status dot — amber = needs log, green = logged */}
      <View style={[styles.statusDot, { backgroundColor: logged ? colors.success : colors.accent }]} />
    </TouchableOpacity>
  );
}

/** Compact read-only view of a log entry */
function LogDetailView({ log, onEdit, viewHistory }) {
  const isAbsent = log.attendance === 'Absent' || log.attendance === 'Excused Absence';
  return (
    <View>
      <View style={styles.loggedBanner}>
        <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.success} />
        <Text style={styles.loggedBannerText}>Log recorded for today</Text>
      </View>

      <View style={styles.detailCard}>
        {isAbsent ? (
          <DetailRow label="Attendance" value={log.attendance} bold />
        ) : (
          <>
            <DetailRow label="Attendance" value={log.attendance || 'Present'} />
            <DetailRow
              label="Surah & Ayahs"
              value={`${log.surahName} · Ayahs ${log.ayahStart}–${log.ayahEnd}`}
            />
            <DetailRow
              label="Session Type"
              value={log.type.charAt(0).toUpperCase() + log.type.slice(1)}
            />
            <DetailRow
              label="Grade"
              value={log.grade?.toUpperCase() ?? 'N/A'}
              bold
              valueColor={log.grade === 'pass' ? colors.success : colors.danger}
            />
            <DetailRow label="Behavior" value={`${log.behavior} / 5`} />
            {log.assignments ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Assignments & Comments</Text>
                <View style={styles.assignmentBox}>
                  <Text style={styles.assignmentText}>{log.assignments}</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>

      <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
        <Ionicons name="pencil-outline" size={15} color={colors.textOnPrimary} style={{ marginRight: spacing.xs }} />
        <Text style={styles.editBtnText}>Edit Log</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.viewHistoryBtn} onPress={viewHistory}>
        <Ionicons name="time-outline" size={17} color={colors.textOnPrimary} style={{ marginRight: spacing.xs }} />
        <Text style={styles.viewHistoryBtnText}>View Log History</Text>
      </TouchableOpacity>
    </View>
  );
}

function DetailRow({ label, value, bold = false, valueColor }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[
        styles.detailValue,
        bold && { fontWeight: '700' },
        valueColor && { color: valueColor },
      ]}>
        {value}
      </Text>
    </View>
  );
}

/** Dot legend at top of roster */
function DotLegend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
        <Text style={styles.legendText}>Logged today</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
        <Text style={styles.legendText}>Needs log</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function AddLogScreen({ navigation, route }) {
  const { className = 'Quran Class A' } = route.params ?? {};

  // All logs keyed by studentId — in real app, fetched per student on select.
  const [allLogs, setAllLogs] = useState(MOCK_LOGS);

  const [selectedId,   setSelectedId]   = useState(MOCK_STUDENTS[0].id);
  const [isEditing,    setIsEditing]     = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [reportExpanded, setReportExpanded] = useState(false);

  const selectedStudent = MOCK_STUDENTS.find(s => s.id === selectedId);
  const studentLogs     = allLogs[selectedId] ?? [];
  const todayLog        = getTodayLog(studentLogs);

  // Show the form when: no log today, OR teacher clicked Edit.
  const showForm = !todayLog || isEditing;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSelectStudent(id) {
    setSelectedId(id);
    setIsEditing(false);   // reset edit state when switching students
    setViewingHistory(false);
    setReportExpanded(false);
  }

  function handleAddLog(newLog) {
    // TODO (Django): POST /api/logs/ with { ...newLog, student: selectedId }
    const entry = { id: Date.now(), date: TODAY, ...newLog };
    setAllLogs(prev => ({
      ...prev,
      [selectedId]: [entry, ...(prev[selectedId] ?? [])],
    }));
    setIsEditing(false);
    setViewingHistory(false);
  }

  function handleUpdateLog(updatedFields) {
    // TODO (Django): PATCH /api/logs/<todayLog.id>/
    setAllLogs(prev => ({
      ...prev,
      [selectedId]: (prev[selectedId] ?? []).map(l =>
        l.id === todayLog.id ? { ...l, ...updatedFields } : l
      ),
    }));
    setIsEditing(false);
    setViewingHistory(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const { course } = route.params;


  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>Daily Logs</Text>
          <Text style={styles.topBarSub}   numberOfLines={1}>{className}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="book-outline" size={13} color={colors.primaryDark} />
          <Text style={styles.headerBadgeText}>{brand.portal}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

      <View>
        <Text style={styles.h2}>{course.title}</Text>
      </View>

        {/* ── SECTION 1: Student roster ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.h2}>Students</Text>
          <DotLegend />
        </View>

        <View style={styles.rosterCard}>
          {MOCK_STUDENTS.map(student => (
            <StudentChip
              key={student.id}
              student={student}
              logs={allLogs[student.id] ?? []}
              selected={student.id === selectedId}
              onPress={() => handleSelectStudent(student.id)}
            />
          ))}
        </View>

        {/* ── SECTION 2: Log panel ── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.h2}>{selectedStudent?.name}</Text>
            <Text style={styles.subtext}>
              {showForm
                ? isEditing ? 'Editing today\'s log' : 'No log yet — record now'
                : 'Today\'s session'}
            </Text>
          </View>
          {/* If viewing a log, show the "Logged ✓" badge */}
          {!showForm && (
            <View style={styles.loggedBadge}>
              <MaterialCommunityIcons name="check" size={12} color={colors.success} />
              <Text style={styles.loggedBadgeText}>Logged</Text>
            </View>
          )}
        </View>

        <View style={styles.panelCard}>
          {showForm ? (
            <AddLogForm
              onSubmit={isEditing ? handleUpdateLog : handleAddLog}
              initialData={isEditing && todayLog ? {
                attendance:  todayLog.attendance || 'Present',
                surah:       todayLog.surah,
                surahName:   todayLog.surahName,
                ayahStart:   todayLog.ayahStart,
                ayahEnd:     todayLog.ayahEnd,
                type:        todayLog.type,
                grade:       todayLog.grade || 'pass',
                behavior:    todayLog.behavior,
                assignments: todayLog.assignments,
              } : undefined}
            />
          ) : (
            <LogDetailView
              log={todayLog}
              onEdit={() => setIsEditing(true)}
              viewHistory={() => setViewingHistory(true)}
            />
          )}
        </View>

        {/* ── SECTION 3: Report Generator ── */}
        <TouchableOpacity
          style={styles.reportToggle}
          onPress={() => setReportExpanded(v => !v)}
        >
          <MaterialCommunityIcons
            name={reportExpanded ? 'chevron-down' : 'chevron-right'}
            size={18}
            color={colors.text}
            style={{ marginRight: spacing.sm }}
          />
          <Text style={styles.reportToggleText}>
            Generate Report — {selectedStudent?.name}
          </Text>
        </TouchableOpacity>

        {reportExpanded && (
          <View style={styles.reportBody}>
            <ReportGenerator studentId={selectedId} logs={studentLogs} />
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
      
      {/* Log history modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewingHistory}
        onRequestClose={() => setViewingHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Log History</Text>
                <Text style={styles.modalSub}>{selectedStudent?.name}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setViewingHistory(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Body (Scrollable History List) */}
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.xl }}
            >
              {studentLogs.length === 0 ? (
                <Text style={styles.emptyHistoryText}>No logs found for this student.</Text>
              ) : (
                studentLogs.map((log) => (
                  <View key={log.id} style={styles.historyCard}>
                    <View style={styles.historyCardHeader}>
                      <Text style={styles.historyDate}>{log.date}</Text>
                      <View style={[
                        styles.historyBadge, 
                        { backgroundColor: log.grade === 'pass' ? colors.successBg : colors.dangerBg }
                      ]}>
                        <Text style={[
                          styles.historyBadgeText, 
                          { color: log.grade === 'pass' ? colors.success : colors.danger }
                        ]}>
                          {log.attendance === 'Absent' ? 'ABSENT' : log.grade?.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {log.attendance !== 'Absent' && (
                      <View style={styles.historyCardBody}>
                        <Text style={styles.historyMainText}>
                          {log.surahName} · Ayahs {log.ayahStart}–{log.ayahEnd}
                        </Text>
                        <Text style={styles.historySubText}>
                          Type: {log.type.charAt(0).toUpperCase() + log.type.slice(1)} | Behavior: {log.behavior}/5
                        </Text>
                        {log.assignments ? (
                          <View style={styles.historyNotesBox}>
                            <Text style={styles.historyNotesText}>{log.assignments}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: 60 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn:      { padding: spacing.xs },
  topBarCenter: { flex: 1 },
  topBarTitle: {
    fontSize: fonts.sizes.subtitle,
    fontWeight: '800',
    color: colors.text,
  },
  topBarSub: {
    fontSize: fonts.sizes.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  headerBadgeText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: fonts.sizes.caption,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  h2:      { fontSize: fonts.sizes.title, fontWeight: '800', color: colors.text },
  subtext: { fontSize: fonts.sizes.body,  color: colors.textMuted, marginTop: spacing.xs },

  // ── Roster ──
  rosterCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
  },
  chipAvatar: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarSelected: {
    backgroundColor: colors.primary,
  },
  chipInitials: {
    fontSize: fonts.sizes.caption,
    fontWeight: '800',
    color: colors.textMuted,
  },
  chipInitialsSelected: {
    color: colors.textOnPrimary,
  },
  chipName: {
    flex: 1,
    fontSize: fonts.sizes.body,
    fontWeight: '600',
    color: colors.text,
  },
  chipNameSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
  },

  // Legend
  legend:     { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot:  { width: 8, height: 8, borderRadius: radii.pill },
  legendText: { fontSize: fonts.sizes.caption, color: colors.textMuted },

  // ── Log panel card ──
  panelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },

  // "Logged" badge next to section header
  loggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  loggedBadgeText: {
    fontSize: fonts.sizes.caption,
    fontWeight: '700',
    color: colors.success,
  },

  // ── Log detail view ──
  loggedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  loggedBannerText: {
    fontSize: fonts.sizes.body,
    fontWeight: '600',
    color: colors.success,
  },
  detailCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  detailRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fonts.sizes.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fonts.sizes.subtitle,
    color: colors.text,
    fontWeight: '500',
  },
  assignmentBox: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  assignmentText: {
    fontSize: fonts.sizes.body,
    color: colors.text,
    lineHeight: 20,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  viewHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
  },
  viewHistoryBtnText: {
    color: colors.textOnPrimary,
    fontSize: fonts.sizes.body,
    fontWeight: '700',
  },
  editBtnText: {
    color: colors.textOnPrimary,
    fontSize: fonts.sizes.body,
    fontWeight: '700',
  },

  // ── Report Generator ──
  reportToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginTop: spacing.xl,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  reportToggleText: {
    fontSize: fonts.sizes.subtitle,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  reportBody: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  //history modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    height: '80%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fonts.sizes.title,
    fontWeight: '800',
    color: colors.text,
  },
  modalSub: {
    fontSize: fonts.sizes.body,
    color: colors.textMuted,
  },
  closeModalBtn: {
    padding: spacing.xs,
  },
  emptyHistoryText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fonts.sizes.body,
    marginTop: spacing.xl,
  },
  historyCard: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  historyDate: {
    fontSize: fonts.sizes.body,
    fontWeight: '700',
    color: colors.text,
  },
  historyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  historyBadgeText: {
    fontSize: fonts.sizes.caption,
    fontWeight: '700',
  },
  historyCardBody: {
    marginTop: spacing.xs,
  },
  historyMainText: {
    fontSize: fonts.sizes.body,
    fontWeight: '600',
    color: colors.text,
  },
  historySubText: {
    fontSize: fonts.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyNotesBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  historyNotesText: {
    fontSize: fonts.sizes.caption,
    color: colors.text,
    lineHeight: 16,
  },
});