import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Image,
} from 'react-native';
import { AddLogForm, NewLog } from '../components/add-log';
import { ReportGenerator } from '../components/report-generator';
import { useTheme } from '../hooks/use-theme';


// ---------------------------------------------------------------------------
// Al-Hidaya Center logo (embedded — swap for require('@/assets/logo.png') once
// the asset is added to the project's assets folder)
// ---------------------------------------------------------------------------
const LOGO_URI = "data:image/jpeg;base64,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";

// ---------------------------------------------------------------------------
// Design tokens — mirror the dashboard's color/spacing/radius system
// ---------------------------------------------------------------------------
const colors = {
  primary:      '#1C7A3E',
  primaryDark:  '#15803D',
  primaryLight: '#DCFCE7',
  blue:         '#1C5B8E',
  blueLight:    '#DBEAFE',
  amber:        '#92400E',
  amberLight:   '#FEF3C7',
  red:          '#B91C1C',
  redLight:     '#FEE2E2',
  border:       '#E5E7EB',
  textMuted:    '#6B7280',
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
const radii   = { sm: 8, md: 10, lg: 12, xl: 16, pill: 999 };
const shadow  = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_STUDENT = {
  id: 1,
  name: 'Ahmad Al-Farsi',
  className: 'Quran Class A',
};

type LogEntry = {
  id: number;
  attendance?: string;
  surah?: number;
  surahName?: string;
  ayahStart?: number;
  ayahEnd?: number;
  type: 'memorization' | 'review';
  behavior: number;
  grade?: 'pass' | 'fail';
  assignments?: string;
  date: string;
};

const INITIAL_LOGS: LogEntry[] = [
  {
    id: 1,
    surah: 2,
    surahName: 'Al-Baqarah',
    ayahStart: 11,
    ayahEnd: 20,
    type: 'memorization',
    behavior: 5,
    grade: 'pass',
    assignments: 'Memorize next page of Al-Baqarah (ayahs 21-25). Practice tajweed rules closely.',
    date: '2026-06-02',
  },
  {
    id: 2,
    surah: 2,
    surahName: 'Al-Baqarah',
    ayahStart: 1,
    ayahEnd: 10,
    type: 'review',
    behavior: 3,
    grade: 'pass',
    assignments: 'Review old juz content thoroughly to strengthen weak points.',
    date: '2026-05-30',
  },
  {
    id: 3,
    surah: 1,
    surahName: 'Al-Fatihah',
    ayahStart: 1,
    ayahEnd: 7,
    type: 'memorization',
    behavior: 5,
    grade: 'pass',
    assignments: 'Perfect pronunciation of specific letters.',
    date: '2026-05-28',
  },
];

type Props = { studentId?: number };

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------
function getBadgeStyle(log: LogEntry) {
  const isAbsent = log.attendance === 'Absent' || log.attendance === 'Excused Absence';
  if (isAbsent)              return { bg: colors.amberLight, fg: colors.amber };
  if (log.grade === 'pass')  return { bg: colors.primaryLight, fg: colors.primaryDark };
  if (log.grade === 'fail')  return { bg: colors.redLight, fg: colors.red };
  return log.type === 'memorization'
    ? { bg: colors.primaryLight, fg: colors.primaryDark }
    : { bg: colors.blueLight,   fg: colors.blue };
}

function getBadgeLabel(log: LogEntry) {
  const isAbsent = log.attendance === 'Absent' || log.attendance === 'Excused Absence';
  if (isAbsent) return log.attendance === 'Absent' ? 'Absent' : 'Excused';
  const typeLabel = log.type === 'memorization' ? 'Mem' : 'Rev';
  const gradeLabel = log.grade ? ` · ${log.grade === 'pass' ? 'Pass' : 'Fail'}` : '';
  return `${typeLabel}${gradeLabel}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function StudentTracker({ studentId = 1 }: Props) {
  const theme = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [addLogModalVisible, setAddLogModalVisible] = useState(false);
  const [reportExpanded, setReportExpanded] = useState(false);
  const [selectedViewingLog, setSelectedViewingLog] = useState<LogEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const student = MOCK_STUDENT;

  const handleAddLog = (newLog: NewLog) => {
    const today = new Date().toISOString().split('T')[0];
    const entry: LogEntry = {
      id: logs.length + 1,
      attendance: newLog.attendance,
      surah: newLog.surah,
      surahName: newLog.surahName,
      ayahStart: newLog.ayahStart,
      ayahEnd: newLog.ayahEnd,
      type: newLog.type,
      behavior: newLog.behavior,
      grade: newLog.grade,
      assignments: newLog.assignments,
      date: today,
    };
    setLogs([entry, ...logs]);
    setAddLogModalVisible(false);
  };

  const handleUpdateLog = (updatedFields: NewLog) => {
    if (!selectedViewingLog) return;

    // Map current edits into existing historical logs array entries
    setLogs(prev =>
      prev.map(log => log.id === selectedViewingLog.id ? { ...log, ...updatedFields } : log)
    );

    // TODO: Update via PUT/PATCH request API when real endpoints are ready:
    // axios.put(`/api/log/${selectedViewingLog.id}/`, updatedFields, { headers: { Authorization: `Bearer <token>` } })

    // Reset View State parameters
    setIsEditing(false);
    setSelectedViewingLog(null);
  };

  // ---- Shared modal header ----
  const ModalHeader = ({
    title,
    closeLabel,
    onClose,
  }: { title: string; closeLabel: string; onClose: () => void }) => (
    <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
      <Text style={[s.modalTitle, { color: theme.text }]}>{title}</Text>
      <TouchableOpacity onPress={onClose} hitSlop={8}>
        <Text style={[s.modalClose, { color: colors.textMuted }]}>{closeLabel}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* ── Student header card ── */}
        <View style={[s.headerCard, { backgroundColor: theme.backgroundElement }]}>
          {/* Al-Dawa Center logo — swap LOGO_URI for require('@/assets/logo.png') once added to assets */}
          <Image
            source={{ uri: LOGO_URI }}
            style={s.logo}
            resizeMode="contain"
          />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[s.studentName, { color: theme.text }]}>{student.name}</Text>
            <Text style={[s.className, { color: colors.textMuted }]}>{student.className}</Text>
          </View>
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>Student</Text>
          </View>
        </View>

        {/* ── Log History section header ── */}
        <View style={s.sectionHeader}>
          <View>
            <Text style={[s.h2, { color: theme.text }]}>Log History</Text>
            <Text style={[s.subtext, { color: colors.textMuted }]}>Tap a log to inspect or edit</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setAddLogModalVisible(true)}>
            <Text style={s.addBtnText}>+ Add Log</Text>
          </TouchableOpacity>
        </View>

        {/* ── Log cards ── */}
        {logs.length === 0 ? (
          <Text style={[s.emptyText, { color: colors.textMuted }]}>No logs yet.</Text>
        ) : (
          logs.map((log) => {
            const badge = getBadgeStyle(log);
            const isAbsent = log.attendance === 'Absent' || log.attendance === 'Excused Absence';
            return (
              <TouchableOpacity
                key={log.id}
                activeOpacity={0.72}
                style={[s.logCard, { backgroundColor: theme.backgroundElement }]}
                onPress={() => { setSelectedViewingLog(log); setIsEditing(false); }}
              >
                <View style={s.logCardRow}>
                  {/* Left: type indicator strip */}
                  <View style={[s.logStrip, {
                    backgroundColor: isAbsent ? colors.amberLight
                      : log.type === 'memorization' ? colors.primaryLight : colors.blueLight,
                  }]} />

                  <View style={s.logBody}>
                    <Text style={[s.logMain, { color: theme.text }]}>
                      {isAbsent
                        ? log.attendance
                        : `${log.surahName} · Ayahs ${log.ayahStart}–${log.ayahEnd}`}
                    </Text>

                    {!isAbsent && log.behavior < 5 && (
                      <Text style={[s.logSub, { color: colors.textMuted }]}>
                        Behavior: {log.behavior}/5
                      </Text>
                    )}

                    {log.assignments ? (
                      <Text style={[s.logAssignment, { color: colors.textMuted }]} numberOfLines={1}>
                        📝 {log.assignments}
                      </Text>
                    ) : null}

                    <Text style={[s.logDate, { color: colors.textMuted }]}>{log.date}</Text>
                  </View>

                  {/* Badge */}
                  <View style={[s.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[s.badgeText, { color: badge.fg }]}>{getBadgeLabel(log)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ── Generate Report collapsible ── */}
        <TouchableOpacity
          style={[s.reportToggle, { backgroundColor: theme.backgroundElement, borderColor: colors.border }]}
          onPress={() => setReportExpanded(!reportExpanded)}
        >
          <Text style={[s.reportToggleText, { color: theme.text }]}>
            {reportExpanded ? '▼  Generate Report' : '▶  Generate Report'}
          </Text>
        </TouchableOpacity>
        {reportExpanded && (
          <View style={[s.reportBody, { backgroundColor: theme.background, borderColor: colors.border }]}>
            <ReportGenerator studentId={studentId} logs={logs} />
          </View>
        )}

      </ScrollView>

      {/* ════════════ ADD LOG MODAL ════════════ */}
      <Modal visible={addLogModalVisible} animationType="fade" transparent onRequestClose={() => setAddLogModalVisible(false)}>
        <View style={s.overlay}>
          <View style={[s.modalCard, { backgroundColor: theme.background }]}>
            <ModalHeader title="Add New Log" closeLabel="Cancel" onClose={() => setAddLogModalVisible(false)} />
            <ScrollView contentContainerStyle={s.modalContent}>
              <AddLogForm onSubmit={handleAddLog} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════════════ LOG DETAIL / EDIT MODAL ════════════ */}
      <Modal
        visible={selectedViewingLog !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedViewingLog(null)}
      >
        <View style={s.overlay}>
          <View style={[s.modalCard, { backgroundColor: theme.background }]}>
            <ModalHeader
              title={isEditing ? 'Edit Log Entry' : 'Log Details'}
              closeLabel={isEditing ? 'Cancel' : 'Close'}
              onClose={() => {
                if (isEditing) { setIsEditing(false); }
                else { setSelectedViewingLog(null); }
              }}
            />
            <ScrollView contentContainerStyle={s.modalContent}>
              {selectedViewingLog && (
                isEditing ? (
                  <AddLogForm
                    onSubmit={handleUpdateLog}
                    initialData={{
                      attendance: selectedViewingLog.attendance || 'Present',
                      surah: selectedViewingLog.surah,
                      surahName: selectedViewingLog.surahName,
                      ayahStart: selectedViewingLog.ayahStart,
                      ayahEnd: selectedViewingLog.ayahEnd,
                      type: selectedViewingLog.type,
                      grade: selectedViewingLog.grade || 'pass',
                      behavior: selectedViewingLog.behavior,
                      assignments: selectedViewingLog.assignments,
                    }}
                  />
                ) : (
                  <View>
                    <DetailRow label="Date Logged" value={selectedViewingLog.date} theme={theme} />
                    <DetailRow label="Attendance" value={selectedViewingLog.attendance || 'Present'} theme={theme} bold />

                    {selectedViewingLog.attendance !== 'Absent' && selectedViewingLog.attendance !== 'Excused Absence' && (
                      <>
                        <DetailRow
                          label="Surah & Ayahs"
                          value={`${selectedViewingLog.surahName} (${selectedViewingLog.surah}) · Ayahs ${selectedViewingLog.ayahStart}–${selectedViewingLog.ayahEnd}`}
                          theme={theme}
                        />
                        <DetailRow
                          label="Session Type"
                          value={selectedViewingLog.type.charAt(0).toUpperCase() + selectedViewingLog.type.slice(1)}
                          theme={theme}
                        />
                        <DetailRow
                          label="Grade"
                          value={selectedViewingLog.grade?.toUpperCase() || 'N/A'}
                          theme={theme}
                          valueColor={selectedViewingLog.grade === 'pass' ? colors.primaryDark : colors.red}
                          bold
                        />
                        <DetailRow
                          label="Behavior"
                          value={`${selectedViewingLog.behavior} / 5`}
                          theme={theme}
                        />
                      </>
                    )}

                    {/* Assignments box */}
                    <View style={s.detailRow}>
                      <Text style={[s.detailLabel, { color: colors.textMuted }]}>Assignments & Comments</Text>
                      <View style={[s.assignmentBox, { backgroundColor: theme.backgroundElement }]}>
                        <Text style={[s.assignmentText, { color: theme.text }]}>
                          {selectedViewingLog.assignments || 'No assignments or remarks for this session.'}
                        </Text>
                      </View>
                    </View>

                    {/* Edit button */}
                    <TouchableOpacity style={s.editBtn} onPress={() => setIsEditing(true)}>
                      <Text style={s.editBtnText}>Edit Log Entry</Text>
                    </TouchableOpacity>
                  </View>
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Tiny helper for detail rows ──
function DetailRow({
  label, value, theme, bold = false, valueColor,
}: {
  label: string; value: string; theme: any; bold?: boolean; valueColor?: string;
}) {
  return (
    <View style={s.detailRow}>
      <Text style={[s.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[s.detailValue, { color: valueColor ?? theme.text, fontWeight: bold ? '700' : '500' }]}>
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 60 },

  // Header card
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  studentName: { fontSize: 24, fontWeight: '800' },
  className:   { fontSize: 14, marginTop: spacing.xs },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
  },
  headerBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  headerBadgeText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },

  // Section header row
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  h2:      { fontSize: 18, fontWeight: '800' },
  subtext: { fontSize: 13, marginTop: 2 },

  // + Add Log button
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyText: { fontSize: 15, marginBottom: spacing.lg },

  // Log card
  logCard: {
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow,
  },
  logCardRow: { flexDirection: 'row', alignItems: 'center' },
  logStrip:   { width: 4, alignSelf: 'stretch' },
  logBody:    { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  logMain:    { fontSize: 15, fontWeight: '700' },
  logSub:     { fontSize: 13, marginTop: 2 },
  logAssignment: { fontSize: 13, marginTop: 2, fontStyle: 'italic' },
  logDate:    { fontSize: 12, marginTop: spacing.xs },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    marginRight: spacing.md,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // Report toggle
  reportToggle: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginTop: spacing.xl,
    marginBottom: 2,
    borderWidth: 1,
  },
  reportToggleText: { fontSize: 15, fontWeight: '700' },
  reportBody: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  // Modal shared
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,15,0.55)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    maxHeight: '88%',
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalClose: { fontSize: 15, fontWeight: '600' },
  modalContent: { padding: spacing.lg, paddingBottom: 40 },

  // Detail rows
  detailRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  detailValue: { fontSize: 15 },
  assignmentBox: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  assignmentText: { fontSize: 14, lineHeight: 20 },

  // Edit button in detail view
  editBtn: {
    backgroundColor: colors.blue,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});