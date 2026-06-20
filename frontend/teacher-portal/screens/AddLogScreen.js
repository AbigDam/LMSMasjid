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
import api from '../api.js'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const TODAY = new Date().toISOString().split('T')[0];

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

const ATTENDANCE_LABELS = {
  0: 'Present',
  1: 'Absent',
  2: 'Excused Absence',
};
function LogDetailView({ log, onEdit, viewHistory }) {
  const isAbsent = log.attendance === 1 || log.attendance === 2 || log.attendance === 'Absent' || log.attendance === 'Excused Absence';
  return (
    <View>
      <View style={styles.loggedBanner}>
        <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.success} />
        <Text style={styles.loggedBannerText}>Log recorded for today</Text>
      </View>

      <View style={styles.detailCard}>
        {isAbsent ?
        (<DetailRow label="Attendance" value={ATTENDANCE_LABELS[log.attendance] ?? log.attendance} bold />) 
            : 
          (
            <>
            <DetailRow label="Attendance" value={ATTENDANCE_LABELS[log.attendance] ?? log.attendance} />
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

      {/* Edit Log button removed per request — handler kept below, commented out.
      <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
        <Ionicons name="pencil-outline" size={15} color={colors.textOnPrimary} style={{ marginRight: spacing.xs }} />
        <Text style={styles.editBtnText}>Edit Log</Text>
      </TouchableOpacity>
      */}
      <TouchableOpacity style={styles.viewHistoryBtn} onPress={viewHistory}>
        <Ionicons name="time-outline" size={17} color={colors.textOnPrimary} style={{ marginRight: spacing.xs }} />
        <Text style={styles.viewHistoryBtnText}>View/Edit Log History</Text>
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
  const todayLog        = getTodayLog(studentLogs);
  const editingLog      = editingLogId ? studentLogs.find(l => l.id === editingLogId) ?? null : null;

  // Show the form when: no log today, OR teacher clicked Edit on a history row, OR teacher clicked "Add Log".
  const showForm = !todayLog || !!editingLogId || addingLog;

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
    setReportExpanded(false);
  }

async function handleAddLog(newLog) {
  const logTypeMap = {
    'memorization': 1,
    'review': 2,
    'reading': 0,
  };
  const payload = {
    student_id: selectedId,
    class_id: course.id,
    surah: newLog.surah,
    starting_ayah: newLog.ayahStart,
    ending_ayah: newLog.ayahEnd,
    passed: newLog.grade === 'pass',
    comments: newLog.comments ?? '',
    behavior: newLog.behavior,
    date: TODAY,
    attendance: newLog.attendance === 'Absent' ? 1 : (newLog.attendance === 'Excused Absence' ? 2 : 0),
    log_type: logTypeMap[newLog.type],
  };

  const response = await fetch(`https://lmsmasjid-backend.onrender.com/api/create_log/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error('Failed to create log', await response.text());
    return;
  }
  const { id } = await response.json();
  const entry = { id, date: TODAY, ...newLog };
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
    const response = await fetch(`https://lmsmasjid-backend.onrender.com/api/update_log/`, {
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
      const response = await fetch(`https://lmsmasjid-backend.onrender.com/api/delete_log/`, {
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

            {!showForm && (
              <View style={styles.inlineButtonRow}>

                {/* Add Log Button Trigger — always available, opens a fresh blank form */}
                <TouchableOpacity
                  style={styles.inlineRowBtn}
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

                {/* Report Generator Button Trigger */}
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
                  <Text style={styles.inlineRowBtnText}>Report</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
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
              onSubmit={editingLogId ? (fields) => handleUpdateLog(editingLogId, fields) : handleAddLog}
              initialData={editingLog ? {
                attendance:  editingLog.attendance || 'Present',
                surah:       editingLog.surah,
                surahName:   editingLog.surahName,
                ayahStart:   editingLog.ayahStart,
                ayahEnd:     editingLog.ayahEnd,
                type:        editingLog.type,
                grade:       editingLog.grade || 'pass',
                behavior:    editingLog.behavior,
                assignments: editingLog.assignments,
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
                studentLogs.map((log) => (
                  <View key={log.id} style={styles.historyCard}>
                    <View style={styles.historyCardHeader}>
                      <Text style={styles.historyDate}>{log.date} ({log.type}) ({log.surahName})</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
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

                    {log.attendance == 0 && (
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
});