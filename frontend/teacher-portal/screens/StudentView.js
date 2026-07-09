import { useEffect, useRef, useState } from 'react';
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
import { quranSurahs }     from '../data/quran'; // CHANGED: backend only sends numeric `surah`, so we resolve names locally.
import api from '../api.js'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
const API_URL = process.env.EXPO_PUBLIC_BASE_URL;
// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const TODAY = new Date().toISOString().split('T')[0];

// ---------------------------------------------------------------------------
// CHANGED: Helpers rebuilt for the new backend log/range model.
//
// A student can now have MULTIPLE Log rows on the same date, and each
// "present" Log carries a `ranges` array (each range = one surah/ayah span
// with its own `log_type` + `passed` flag). An "absent" Log (attendance !=
// 0) has NO `ranges` key at all — instead it only carries `attendance`
// (1 = Absent, 2 = Excused Absence). We use the presence of `ranges` vs
// `attendance` as the source of truth for which kind of log we're looking
// at, since that's exactly how GetLogsView shapes each entry.
// ---------------------------------------------------------------------------
const LOG_TYPE_LABELS = { memorization: 'Memorization', review: 'Review' };

function isPresentLog(log) {
  return !!log && Array.isArray(log.ranges);
}
function isAbsentLog(log) {
  return !!log && log.attendance !== undefined && log.attendance !== null && log.attendance !== 0;
}
function getLogsForDate(logs, date) {
  return logs.filter(l => l.date === date);
}
function surahName(number) {
  return quranSurahs.find(s => s.number === number)?.name ?? `Surah ${number}`;
}

// Flattens every range across a set of logs into one list, tagging each
// range with the id/date of the Log it came from. We need `logId` because
// there's no separate id per-range from the API — edit/delete still act on
// the whole Log, so every range rendered from that Log points back to it.
function flattenRanges(logs) {
  return logs.flatMap(log =>
    (log.ranges ?? []).map(range => ({ ...range, logId: log.id, date: log.date }))
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const ATTENDANCE_LABELS = {
  0: 'Present',
  1: 'Absent',
  2: 'Excused Absence',
};

// ---------------------------------------------------------------------------
// CHANGED: New dashboard panel replacing LogDetailView/DetailRow.
//
// Renders a set of already-flattened ranges (see `flattenRanges`), grouped
// by session type (Memorization / Review) — matching the "Review" /
// "Memorization" grouped-card look from the reference screenshot. Each range
// row shows the surah + Pass/Fail badge + edit/delete, same as the photo.
//
// `highlighted` gives the section the bronze/cream "brand" treatment (used
// for "Today's Ranges"); without it, the section uses a plain surface
// (used for "Recent Ranges") so the two are visually distinct at a glance.
// Edit/Delete still operate on the whole Log a range came from — there's no
// separate per-range id from the API — so pressing either on any range
// inside the same Log has the same effect on that Log.
// ---------------------------------------------------------------------------
function RangeGroupSection({ title, ranges, highlighted = false, onEditRange, onDeleteRange }) {
  // Group ranges by log_type, preserving the order each type first appears in.
  const groups = [];
  const groupsByType = {};
  ranges.forEach(range => {
    const key = range.log_type ?? 'unknown';
    if (!groupsByType[key]) {
      groupsByType[key] = { log_type: key, items: [] };
      groups.push(groupsByType[key]);
    }
    groupsByType[key].items.push(range);
  });

  return (
    <View style={[styles.rangesSection, highlighted && styles.rangesSectionHighlighted]}>
      <Text style={[styles.rangesSectionTitle, highlighted && styles.rangesSectionTitleHighlighted]}>
        {title}
      </Text>
      {groups.map(group => (
        <View key={group.log_type} style={styles.rangeTypeGroup}>
          <Text style={styles.rangeTypeLabel}>
            {LOG_TYPE_LABELS[group.log_type] ?? group.log_type}
          </Text>
          {group.items.map((range, idx) => (
            <View
              key={`${range.logId}-${idx}`}
              style={[styles.rangeItemRow, idx === group.items.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Text style={styles.rangeItemText} numberOfLines={1}>
                {surahName(range.surah)}
              </Text>
              <View style={styles.rangeItemActions}>
                <View style={[
                  styles.rangeBadge,
                  { backgroundColor: range.passed ? colors.successBg : colors.dangerBg },
                ]}>
                  <Text style={[
                    styles.rangeBadgeText,
                    { color: range.passed ? colors.success : colors.danger },
                  ]}>
                    {range.passed ? 'PASS' : 'FAIL'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => onEditRange(range.logId)} hitSlop={8} style={styles.rangeItemIconBtn}>
                  <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDeleteRange(range.logId)} hitSlop={8} style={styles.rangeItemIconBtn}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function DotLegend() {
  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
        <Text style={styles.legendText}>Logged today</Text>
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
  const { course, student} = route.params ?? {};
  const className = course?.title;
  // All logs keyed by studentId — in real app, fetched per student on select.
  const [allLogs, setAllLogs] = useState({});
  //const [selectedId,   setSelectedId]   = useState(MOCK_STUDENTS[0].id);
  const [selectedId, setSelectedId] = useState(student.id);
  const [isEditing,    setIsEditing]     = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [viewingReport, setViewingReport]   = useState(false);
  const [addingLog, setAddingLog] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null); // id of the historical log currently being edited, or null

  const studentLogs     = allLogs[selectedId] ?? [];

  // CHANGED: a day can now hold MULTIPLE Log rows, so we work with an array
  // of today's logs rather than a single one.
  const todayLogs        = getLogsForDate(studentLogs, TODAY);
  const todayPresentLogs = todayLogs.filter(isPresentLog);
  const editingLog        = editingLogId ? studentLogs.find(l => l.id === editingLogId) ?? null : null;

  // CHANGED: "attended today" now means at least one present-type log exists
  // for today (i.e. it has a `ranges` array). This replaces the old
  // isTodayAbsent flag with its inverse, since presence, not absence, is the
  // dashboard's default state now.
  const isAttendedToday = todayPresentLogs.length > 0;

  // Show the full form when: not attended yet today (nothing logged, or a
  // rest/absence day), OR the teacher clicked Edit on a history row, OR the
  // teacher tapped "Add Log" to record another session for today.
  const showForm = !isAttendedToday || !!editingLogId || addingLog;

  // Ranges logged today, for the highlighted "Today's Ranges" panel — hidden
  // entirely by the caller when this is empty (nothing read today yet).
  const todaysRanges = flattenRanges(todayPresentLogs);

  // CHANGED: "Recent Ranges" = the 4 most recent individual ranges from
  // PRIOR days (today excluded), most-recent-day-first.
  const recentRanges = flattenRanges(
    studentLogs
      .filter(l => l.date !== TODAY && isPresentLog(l))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  ).slice(0, 4);

  //Load Students

  const selectedStudent = student

  useEffect(() => {
      async function loadLogs() {
          try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await api.get(`/get_logs/?class_id=${course.id}`);
              setAllLogs(response.data);
          } catch (error) {
              console.error(error);
          }
      }
      loadLogs();
  }, []);

  function handleSelectStudent(id) {
    setSelectedId(id);
    setIsEditing(false);   // reset edit state when switching students
    setViewingHistory(false);
    setAddingLog(false);
    setEditingLogId(null);
    // NOTE: removed a call to `setReportExpanded(false)` here — that setter/state
    // was never actually declared anywhere in this file, so it would have
    // thrown a ReferenceError the first time a student was selected.
  }

async function handleAddLog(newLog) {
  const payload = {
    student_id: selectedId,
    class_id: course.id,
    // CHANGED: AddLogForm submits its notes field as `assignments`, not
    // `comments` — this was silently sending an empty string before.
    comments: newLog.assignments ?? '',
    behavior: newLog.behavior,
    date: TODAY,
    attendance: newLog.attendance === 'Absent' ? 1 : (newLog.attendance === 'Excused Absence' ? 2 : 0),
    ranges: newLog.ranges,
  };
  
  const response = await fetch(`${API_URL}/create_log/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error('Failed to create log', await response.text());
    return;
  }
  const { id } = await response.json();

  // CHANGED: match GetLogsView's own shape exactly instead of spreading the
  // raw form fields (which no longer match the new model at all).
  const entry = payload.attendance !== 0
    ? { id, date: TODAY, attendance: payload.attendance }
    : { id, date: TODAY, behavior: newLog.behavior, comments: payload.comments, ranges: newLog.ranges ?? [] };

  setAllLogs(prev => ({
    ...prev,
    [selectedId]: [entry, ...(prev[selectedId] ?? [])],
  }));
  setIsEditing(false);
  setViewingHistory(false);
  setAddingLog(false);

}

  // Edit Log handler — now takes the specific logId being edited (from the history row),
  // rather than assuming it's always today's log.
  //
  // NOT CHANGED / KNOWN ISSUE: this still builds a single-surah/single-grade
  // payload (`surah`, `starting_ayah`, `passed`, `log_type`...), which no
  // longer matches the multi-range model used everywhere else in this file.
  // I didn't touch it because the `update_log` endpoint's new multi-range
  // contract wasn't part of what was shared — this needs its own pass (most
  // likely accepting a `ranges` array like `create_log` does) once that's
  // defined, otherwise editing a historical log will send the wrong shape.
  async function handleUpdateLog(logId, updatedFields) {
    const logTypeMap = {
      'memorization': 1,
      'review': 2,
      'reading': 0,
    };

    const payload = {
      log_id: logId,
      student_id: selectedId,
      class_id: course.id,
      surah: updatedFields.surah,
      starting_ayah: updatedFields.ayahStart,
      ending_ayah: updatedFields.ayahEnd,
      passed: updatedFields.grade === 'pass',
      comments: updatedFields.comments ?? '',
      behavior: updatedFields.behavior,
      log_type: logTypeMap[updatedFields.type],
      attendance: updatedFields.attendance === 'Absent' ? 1 : (updatedFields.attendance === 'Excused Absence' ? 2 : 0),
    };

    const token = await AsyncStorage.getItem('authToken');

    const response = await fetch(`${API_URL}/api/update_log/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to update log', await response.text());
      return;
    }

    setAllLogs(prev => ({
      ...prev,
      [selectedId]: (prev[selectedId] ?? []).map(l =>
        l.id === logId ? { ...l, ...updatedFields } : l),
    }));
    setIsEditing(false);
    setEditingLogId(null);
    setViewingHistory(false);
  }

  async function handleDeleteLog(logId) {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/delete_log/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ log_id: logId }),
      });

      if (!response.ok) {
        console.error('Failed to delete log', await response.text());
        return;
      }

      setAllLogs(prev => ({
        ...prev,
        [selectedId]: (prev[selectedId] ?? []).filter(l => l.id !== logId),
      }));
    } catch (error) {
      console.error(error);
    }
  }

 
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
          <Text style={styles.h2}>{course?.title}</Text>
        </View>

        {/* ── SECTION 2: Log panel ── */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.h2}>
              {selectedStudent?.first_name 
                ? `${selectedStudent.first_name} ${selectedStudent.last_name}` 
                : selectedStudent?.name}
            </Text>

            <Text style={styles.subtext}>
              {showForm
                ? editingLogId
                  ? `Editing log from ${editingLog?.date ?? ''}`
                  : addingLog
                    ? 'Adding a new log'
                    : 'No log yet — record now'
                : "Today's session"}
            </Text>

            {/* CHANGED: Generate Report + View Log History are now always visible
                at the top of the page, regardless of form/dashboard state —
                previously "Report" only showed when !showForm, and history was
                only reachable from inside LogDetailView. Both still just open
                their existing modals — no change to what they do. */}
            <View style={styles.inlineButtonRow}>
              <TouchableOpacity
                style={styles.inlineRowBtn}
                onPress={() => setViewingReport(true)}
              >
                <MaterialCommunityIcons
                  name="chart-bar"
                  size={16}
                  color={colors.textOnPrimary}
                  style={{ marginRight: spacing.xs }}
                />
                <Text style={styles.inlineRowBtnText}>Generate Report</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.inlineRowBtn}
                onPress={() => setViewingHistory(true)}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={colors.textOnPrimary}
                  style={{ marginRight: spacing.xs }}
                />
                <Text style={styles.inlineRowBtnText}>View Log History</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* {!showForm && (
            <View style={styles.loggedBadge}>
              <MaterialCommunityIcons name="check" size={12} color={colors.success} />
              <Text style={styles.loggedBadgeText}>Logged</Text>
            </View>
          )} */}
        </View>

        {showForm ? (
          <View style={styles.panelCard}>
            <AddLogForm
              onSubmit={editingLogId ? (fields) => handleUpdateLog(editingLogId, fields) : handleAddLog}
              // CHANGED: skip the attendance step only when we're adding an
              // extra log for a day that's already attended — matches
              // isAttendedToday instead of the old single-todayLog check.
              skipAttendanceStep={isAttendedToday && addingLog}
              // CHANGED: initialData now maps straight to the multi-range shape
              // AddLogForm actually expects (`ranges`), instead of the old
              // single surah/ayahStart/ayahEnd/type/grade fields which no
              // longer exist on a fetched log.
              initialData={editingLog ? {
                attendance:  isAbsentLog(editingLog) ? ATTENDANCE_LABELS[editingLog.attendance] : 'Present',
                behavior:    editingLog.behavior,
                assignments: editingLog.comments,
                ranges: (editingLog.ranges ?? []).map(r => ({ ...r, surahName: surahName(r.surah) })),
              } : undefined}
            />
          </View>
        ) : (
          // ── CHANGED: New landing dashboard for an attended day ──
          // Replaces LogDetailView. "Add Log" sits at the top (creates a
          // brand-new Log row per your answer), followed by the highlighted
          // "Today's Ranges" panel (hidden entirely if empty) and the plain
          // "Recent Ranges" panel (up to 4 ranges from prior days).
          <View>
            <TouchableOpacity
              style={[styles.inlineRowBtn, { marginBottom: spacing.lg }]}
              onPress={() => setAddingLog(true)}
            >
              <MaterialCommunityIcons
                name="plus"
                size={16}
                color={colors.textOnPrimary}
                style={{ marginRight: spacing.xs }}
              />
              <Text style={styles.inlineRowBtnText}>Add Log</Text>
            </TouchableOpacity>

            {todaysRanges.length > 0 && (
              <RangeGroupSection
                title="Today's Ranges"
                ranges={todaysRanges}
                highlighted
                onEditRange={(logId) => { setEditingLogId(logId); setAddingLog(false); }}
                onDeleteRange={(logId) => handleDeleteLog(logId)}
              />
            )}

            {recentRanges.length > 0 && (
              <RangeGroupSection
                title="Recent Ranges"
                ranges={recentRanges}
                onEditRange={(logId) => { setEditingLogId(logId); setAddingLog(false); }}
                onDeleteRange={(logId) => handleDeleteLog(logId)}
              />
            )}
          </View>
        )}

        {(addingLog || editingLogId) && (
          <TouchableOpacity
            style={styles.cancelAddBtn}
            onPress={() => {
              setAddingLog(false);
              setEditingLogId(null);
            }}
          >
            <Text style={styles.cancelAddBtnText}>Cancel</Text>
          </TouchableOpacity>
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

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.xl }}
            >
              {studentLogs.length === 0 ? (
                <Text style={styles.emptyHistoryText}>No logs found for this student.</Text>
              ) : (
                // CHANGED: sort newest-first for display, since the backend
                // doesn't guarantee ordering and a day can now contain
                // multiple Log rows.
                [...studentLogs]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((log) => (
                  <View key={log.id} style={styles.historyCard}>
                    <View style={styles.historyCardHeader}>
                      <Text style={styles.historyDate}>{log.date}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        {isAbsentLog(log) && (
                          <View style={[styles.historyBadge, { backgroundColor: colors.dangerBg }]}>
                            <Text style={[styles.historyBadgeText, { color: colors.danger }]}>
                              {(ATTENDANCE_LABELS[log.attendance] ?? 'Absent').toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => {
                            setEditingLogId(log.id);
                            setAddingLog(false);
                            setViewingHistory(false);
                          }}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Edit log"
                          style={styles.editLogBtn}
                        >
                          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteLog(log.id)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Delete log"
                          style={styles.deleteLogBtn}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {isPresentLog(log) && (
                      <View style={styles.historyCardBody}>
                        {log.ranges.map((range, idx) => (
                          <View
                            key={idx}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: spacing.xs,
                            }}
                          >
                            <Text style={styles.historyMainText} numberOfLines={1}>
                              {surahName(range.surah)} · Ayahs {range.ayah_init}–{range.ayah_final}
                            </Text>
                            <View style={[
                              styles.historyBadge,
                              { backgroundColor: range.passed ? colors.successBg : colors.dangerBg },
                            ]}>
                              <Text style={[
                                styles.historyBadgeText,
                                { color: range.passed ? colors.success : colors.danger },
                              ]}>
                                {LOG_TYPE_LABELS[range.log_type] ?? range.log_type} · {range.passed ? 'PASS' : 'FAIL'}
                              </Text>
                            </View>
                          </View>
                        ))}
                        <Text style={styles.historySubText}>Behavior: {log.behavior}/5</Text>
                        {log.comments ? (
                          <View style={styles.historyNotesBox}>
                            <Text style={styles.historyNotesText}>{log.comments}</Text>
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

      {/* Report Generator Modal Triggered from button header row */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewingReport}
        onRequestClose={() => setViewingReport(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Performance Report</Text>
                <Text style={styles.modalSub}>
                  {selectedStudent?.first_name 
                    ? `${selectedStudent.first_name} ${selectedStudent.last_name}` 
                    : selectedStudent?.name}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setViewingReport(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.xl }}
            >
              <ReportGenerator studentId={selectedId} logs={studentLogs} classroomId={course.id} apiBaseUrl = "https://lmsmasjid-backend.onrender.com"/>
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

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  h2:      { fontSize: fonts.sizes.title, fontWeight: '800', color: colors.text },
  subtext: { fontSize: fonts.sizes.body,  color: colors.textMuted, marginTop: spacing.xs },

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

  legend:     { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot:  { width: 8, height: 8, borderRadius: radii.pill },
  legendText: { fontSize: fonts.sizes.caption, color: colors.textMuted },

  inlineButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    width: '100%',
  },
  inlineRowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    ...shadow,
  },
  inlineRowBtnText: {
    fontSize: fonts.sizes.caption,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },

  panelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },

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
  cancelAddBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelAddBtnText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.body,
    fontWeight: '600',
  },
  deleteLogBtn: {
    padding: spacing.xs,
  },
  editLogBtn: {
    padding: spacing.xs,
  },
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

  // ---------------------------------------------------------------------
  // CHANGED: styles for RangeGroupSection — the "Today's Ranges" /
  // "Recent Ranges" dashboard panels. `rangesSectionHighlighted` gives the
  // bronze/cream brand treatment used for "Today's Ranges" per the
  // reference screenshot; without it, the section stays a plain surface
  // card (used for "Recent Ranges") so the two read as visually distinct.
  // ---------------------------------------------------------------------
  rangesSection: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow,
  },
  rangesSectionHighlighted: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  rangesSectionTitle: {
    fontSize: fonts.sizes.subtitle,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  rangesSectionTitleHighlighted: {
    color: colors.primaryDark,
  },
  rangeTypeGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  rangeTypeLabel: {
    fontSize: fonts.sizes.body,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  rangeItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rangeItemText: {
    fontSize: fonts.sizes.body,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  rangeItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rangeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  rangeBadgeText: {
    fontSize: fonts.sizes.caption,
    fontWeight: '700',
  },
  rangeItemIconBtn: {
    padding: spacing.xs,
  },
});