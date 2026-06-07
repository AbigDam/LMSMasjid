// components/ReportGenerator.js
// -----------------------------------------------------------------------------
// Trimester report card generator + custom date-range summary.
//
// Converted from Expo Router (report-generator.tsx) to plain JS, using the
// project's central theme tokens instead of local overrides or useTheme.
//
// Props:
//   studentId {number}   — passed through to the saved ReportCard payload
//   logs      {array}    — full LogEntry array from the parent screen
//
// Two tabs:
//   Trimester Report — auto-computes scores from logs, teacher can adjust,
//                      saves a local ReportCard (TODO: POST /api/report-card/)
//   Custom Range     — date-filtered stats summary (TODO: GET /api/logs/summary/)
// -----------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, fonts, radii, shadow, spacing } from '../constants/theme';

// ---------------------------------------------------------------------------
// Theme shim — maps the old theme.backgroundElement / theme.background / theme.text
// references onto the project's real tokens.
// ---------------------------------------------------------------------------
const theme = {
  background:        colors.background, // '#F7F4EF'
  backgroundElement: colors.surface,    // '#FFFFFF'
  text:              colors.text,        // '#2A2118'
};

// ---------------------------------------------------------------------------
// Extra semantic colours not in the main palette (kept local)
// ---------------------------------------------------------------------------
const ext = {
  blue:       '#1C5B8E',
  blueLight:  '#DBEAFE',
  amber:      '#B45309',
  amberLight: '#FEF3C7',
  red:        '#B91C1C',
  redLight:   '#FEE2E2',
};

const AYAHS_PER_PAGE = 15;

// ---------------------------------------------------------------------------
// Score + stat computation helpers
// ---------------------------------------------------------------------------
function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

function computeScores(logs) {
  const present = logs.filter(l => l.attendance !== 'Absent' && l.attendance !== 'Excused Absence');
  const total   = logs.length;
  const memLogs = present.filter(l => l.type === 'memorization');
  const revLogs = present.filter(l => l.type === 'review');

  const attendance_score = total > 0
    ? clamp(Math.round((present.length / total) * 5), 1, 5) : 3;

  const behavior_score = present.length > 0
    ? clamp(Math.round(present.reduce((a, l) => a + l.behavior, 0) / present.length), 1, 5) : 3;

  const memorization_score = memLogs.length > 0
    ? clamp(Math.round((memLogs.filter(l => l.grade === 'pass').length / memLogs.length) * 5), 1, 5) : 3;

  const review_score = revLogs.length > 0
    ? clamp(Math.round((revLogs.filter(l => l.grade === 'pass').length / revLogs.length) * 5), 1, 5) : 3;

  const reading_score = clamp(Math.round((memorization_score + review_score) / 2), 1, 5);

  return { behavior_score, reading_score, review_score, memorization_score, attendance_score };
}

function computeStats(logs) {
  const present    = logs.filter(l => l.attendance !== 'Absent' && l.attendance !== 'Excused Absence');
  const absent_days = logs.filter(l => l.attendance === 'Absent' || l.attendance === 'Excused Absence').length;

  let total_ayahs = 0;
  const surahMap  = {};

  for (const log of present) {
    if (log.ayahStart != null && log.ayahEnd != null && log.surahName) {
      const ayahs = log.ayahEnd - log.ayahStart + 1;
      total_ayahs += ayahs;
      if (!surahMap[log.surahName]) {
        surahMap[log.surahName] = { surahName: log.surahName, surah: log.surah ?? 0, ayahs: 0, sessions: 0 };
      }
      surahMap[log.surahName].ayahs    += ayahs;
      surahMap[log.surahName].sessions += 1;
    }
  }

  return {
    total_ayahs,
    total_pages:            parseFloat((total_ayahs / AYAHS_PER_PAGE).toFixed(1)),
    total_sessions:         present.length,
    memorization_sessions:  present.filter(l => l.type === 'memorization').length,
    review_sessions:        present.filter(l => l.type === 'review').length,
    absent_days,
    surah_breakdown:        Object.values(surahMap).sort((a, b) => a.surah - b.surah),
  };
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------
function SectionLabel({ text }) {
  return <Text style={s.label}>{text}</Text>;
}

function ScoreRow({ label, value, onChange }) {
  return (
    <View style={s.scoreRow}>
      <Text style={s.scoreLabel}>{label}</Text>
      <View style={s.scoreDots}>
        {[1, 2, 3, 4, 5].map(n => {
          const filled = n <= value;
          return (
            <TouchableOpacity
              key={n}
              style={[s.scoreDot, {
                backgroundColor: filled ? colors.primary : theme.backgroundElement,
                borderColor:     filled ? colors.primary : colors.border,
              }]}
              onPress={() => onChange(n)}
            >
              <Text style={[s.scoreDotText, { color: filled ? colors.textOnPrimary : colors.textMuted }]}>
                {n}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ProgressBar({ value, max = 5 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={[s.barBg, { backgroundColor: colors.border }]}>
      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
    </View>
  );
}

function StatChip({ label, value, sub }) {
  return (
    <View style={s.statChip}>
      <Text style={s.statChipValue}>{value}</Text>
      <Text style={s.statChipLabel}>{label}</Text>
      {sub ? <Text style={s.statChipSub}>{sub}</Text> : null}
    </View>
  );
}

function TrimesterPicker({ value, onChange }) {
  return (
    <View style={s.segment}>
      {[1, 2, 3].map(n => {
        const active = value === n;
        return (
          <TouchableOpacity
            key={n}
            style={[s.segmentBtn, active && { backgroundColor: theme.background, ...segmentShadow }]}
            onPress={() => onChange(n)}
          >
            <Text style={[s.segmentLabel, { color: active ? theme.text : colors.textMuted }]}>
              T{n}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segmentShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
};

// ---------------------------------------------------------------------------
// Report card detail modal
// ---------------------------------------------------------------------------
function ReportCardModal({ report, onClose }) {
  const scoreFields = [
    { label: 'Behavior',     key: 'behavior_score' },
    { label: 'Reading',      key: 'reading_score' },
    { label: 'Review',       key: 'review_score' },
    { label: 'Memorization', key: 'memorization_score' },
    { label: 'Attendance',   key: 'attendance_score' },
  ];
  const avg = (
    (report.behavior_score + report.reading_score + report.review_score +
     report.memorization_score + report.attendance_score) / 5
  ).toFixed(1);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.modalCard}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Report Card</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={s.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            <View style={s.avgHero}>
              <Text style={s.avgLabel}>Overall Average</Text>
              <Text style={s.avgValue}>{avg} / 5</Text>
              <Text style={s.avgMeta}>Trimester {report.trimester}  ·  {report.date}</Text>
            </View>
            {scoreFields.map(({ label, key }) => (
              <View key={key} style={s.scoreBarRow}>
                <View style={s.scoreBarTop}>
                  <Text style={s.scoreBarLabel}>{label}</Text>
                  <Text style={s.scoreBarValue}>{report[key]}/5</Text>
                </View>
                <ProgressBar value={report[key]} />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Trimester tab
// ---------------------------------------------------------------------------
function TrimesterTab({ studentId, logs }) {
  const today = new Date().toISOString().split('T')[0];
  const [trimester,  setTrimester]  = useState(1);
  const [reportDate, setReportDate] = useState(today);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState(null);

  const auto  = useMemo(() => computeScores(logs), [logs]);
  const stats = useMemo(() => computeStats(logs),  [logs]);

  const [behaviorScore,     setBehaviorScore]    = useState(auto.behavior_score);
  const [readingScore,      setReadingScore]      = useState(auto.reading_score);
  const [reviewScore,       setReviewScore]       = useState(auto.review_score);
  const [memorizationScore, setMemorizationScore] = useState(auto.memorization_score);
  const [attendanceScore,   setAttendanceScore]   = useState(auto.attendance_score);

  const [savedReports,  setSavedReports]  = useState([]);
  const [viewingReport, setViewingReport] = useState(null);

  function refill() {
    // TODO: replace with GET /api/report-card/generate/?student=<id>&trimester=<n>
    setBehaviorScore(auto.behavior_score);
    setReadingScore(auto.reading_score);
    setReviewScore(auto.review_score);
    setMemorizationScore(auto.memorization_score);
    setAttendanceScore(auto.attendance_score);
  }

  function handleTrimesterChange(t) { setTrimester(t); refill(); }

  async function handleSave() {
    setError(null);
    setIsLoading(true);
    // TODO: replace mock with POST /api/report-card/
    await new Promise(r => setTimeout(r, 500));
    const saved = {
      id: Date.now(), student: studentId,
      logged_by: 0, classroom: 0,    // TODO: inject from auth context
      behavior_score: behaviorScore, reading_score: readingScore,
      review_score: reviewScore, memorization_score: memorizationScore,
      attendance_score: attendanceScore, trimester, date: reportDate,
    };
    setSavedReports(prev => [saved, ...prev]);
    setIsLoading(false);
  }

  const scores = [
    { label: 'Behavior',     value: behaviorScore,     setter: setBehaviorScore },
    { label: 'Reading',      value: readingScore,       setter: setReadingScore },
    { label: 'Review',       value: reviewScore,        setter: setReviewScore },
    { label: 'Memorization', value: memorizationScore,  setter: setMemorizationScore },
    { label: 'Attendance',   value: attendanceScore,    setter: setAttendanceScore },
  ];

  return (
    <View>
      {/* Past report cards */}
      {savedReports.length > 0 && (
        <View style={{ marginBottom: spacing.md }}>
          <SectionLabel text="Past Report Cards" />
          {savedReports.map(r => (
            <TouchableOpacity
              key={r.id}
              style={s.pastCard}
              onPress={() => setViewingReport(r)}
              activeOpacity={0.75}
            >
              <View style={s.pastCardLeft}>
                <View style={s.trimBadge}>
                  <Text style={s.trimBadgeText}>T{r.trimester}</Text>
                </View>
                <View>
                  <Text style={s.pastCardDate}>{r.date}</Text>
                  <Text style={s.pastCardAvg}>
                    Avg {((r.behavior_score + r.reading_score + r.review_score +
                           r.memorization_score + r.attendance_score) / 5).toFixed(1)}/5
                  </Text>
                </View>
              </View>
              <Text style={s.pastCardChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Info banner */}
      <View style={[s.infoBox, { backgroundColor: ext.blueLight, borderColor: '#93C5FD' }]}>
        <Text style={[s.infoText, { color: ext.blue }]}>
          ✦ Scores are auto-generated from log history. Adjust any score before saving.
        </Text>
      </View>

      <SectionLabel text="Trimester" />
      <TrimesterPicker value={trimester} onChange={handleTrimesterChange} />

      <SectionLabel text="Report Date" />
      <TextInput
        style={s.dateInput}
        value={reportDate}
        onChangeText={setReportDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.placeholder}
        keyboardType="numeric"
        maxLength={10}
      />

      <SectionLabel text="Scores  (1 – 5)  — tap to adjust" />
      <View style={s.scoresCard}>
        {scores.map(({ label, value, setter }) => (
          <ScoreRow key={label} label={label} value={value} onChange={setter} />
        ))}
      </View>

      <SectionLabel text="Quran Progress This Trimester" />
      <View style={s.chipRow}>
        <StatChip label="Total Ayahs" value={stats.total_ayahs} sub={`${stats.total_pages} pages`} />
        <StatChip label="Sessions"    value={stats.total_sessions} />
        <StatChip label="Absent Days" value={stats.absent_days} />
      </View>
      <View style={s.chipRow}>
        <StatChip label="Memorization" value={stats.memorization_sessions} />
        <StatChip label="Review"       value={stats.review_sessions} />
      </View>

      {stats.surah_breakdown.length > 0 && (
        <View>
          <SectionLabel text="Surah Breakdown" />
          <SurahBreakdownCard rows={stats.surah_breakdown} />
        </View>
      )}

      {error && (
        <View style={[s.errorBox, { backgroundColor: ext.redLight }]}>
          <Text style={[s.errorText, { color: ext.red }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.submitBtn, isLoading && s.submitBtnDisabled]}
        onPress={handleSave}
        disabled={isLoading}
      >
        <Text style={s.submitBtnText}>{isLoading ? 'Saving…' : 'Save Report Card'}</Text>
      </TouchableOpacity>

      {viewingReport && (
        <ReportCardModal report={viewingReport} onClose={() => setViewingReport(null)} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Surah breakdown card (shared between both tabs)
// ---------------------------------------------------------------------------
function SurahBreakdownCard({ rows }) {
  return (
    <View style={s.scoresCard}>
      {rows.map((row, i) => (
        <View
          key={row.surahName}
          style={[s.surahRow, i < rows.length - 1 && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          }]}
        >
          <View style={s.surahRowLeft}>
            <Text style={s.surahName}>{row.surahName}</Text>
            <Text style={s.surahSessions}>{row.sessions} session{row.sessions !== 1 ? 's' : ''}</Text>
          </View>
          <View style={s.surahRowRight}>
            <Text style={s.surahAyahs}>{row.ayahs} ayahs</Text>
            <Text style={s.surahPages}>~{(row.ayahs / AYAHS_PER_PAGE).toFixed(1)} pg</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Custom range tab
// ---------------------------------------------------------------------------
function CustomRangeTab({ logs }) {
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState(today);
  const [summary,  setSummary]  = useState(null);
  const [error,    setError]    = useState(null);

  function handleGenerate() {
    setError(null);
    if (!dateFrom || !dateTo) { setError('Please enter both a start and end date.'); return; }
    if (dateFrom > dateTo)    { setError('Start date must be before end date.'); return; }
    // TODO: replace with GET /api/logs/summary/?student=<id>&date_from=<>&date_to=<>
    const filtered = logs.filter(l => l.date >= dateFrom && l.date <= dateTo);
    setSummary({ ...computeStats(filtered), date_from: dateFrom, date_to: dateTo });
  }

  function handleClear() { setSummary(null); setDateFrom(''); setDateTo(today); setError(null); }

  return (
    <View>
      <SectionLabel text="Start Date" />
      <TextInput
        style={s.dateInput}
        value={dateFrom}
        onChangeText={setDateFrom}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.placeholder}
        keyboardType="numeric"
        maxLength={10}
      />
      <SectionLabel text="End Date" />
      <TextInput
        style={s.dateInput}
        value={dateTo}
        onChangeText={setDateTo}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.placeholder}
        keyboardType="numeric"
        maxLength={10}
      />

      {error && (
        <View style={[s.errorBox, { backgroundColor: ext.redLight }]}>
          <Text style={[s.errorText, { color: ext.red }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity style={s.submitBtn} onPress={handleGenerate}>
        <Text style={s.submitBtnText}>Generate Summary</Text>
      </TouchableOpacity>

      {summary && (
        <View style={{ marginTop: spacing.xl }}>
          <View style={s.rangeHeader}>
            <Text style={s.rangeHeaderTitle}>Quran Progress Summary</Text>
            <Text style={s.rangeHeaderDates}>{summary.date_from}  →  {summary.date_to}</Text>
          </View>
          <View style={s.chipRow}>
            <StatChip label="Total Ayahs" value={summary.total_ayahs} sub={`${summary.total_pages} pages`} />
            <StatChip label="Sessions"    value={summary.total_sessions} />
            <StatChip label="Absent Days" value={summary.absent_days} />
          </View>
          <View style={s.chipRow}>
            <StatChip label="Memorization" value={summary.memorization_sessions} />
            <StatChip label="Review"       value={summary.review_sessions} />
          </View>
          {summary.surah_breakdown.length > 0 && (
            <View>
              <SectionLabel text="Surah Breakdown" />
              <SurahBreakdownCard rows={summary.surah_breakdown} />
            </View>
          )}
          <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function ReportGenerator({ studentId, logs }) {
  const [activeTab, setActiveTab] = useState('trimester');

  return (
    <View>
      {/* Tab bar */}
      <View style={s.tabBar}>
        {['trimester', 'custom'].map(tab => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[s.tab, active && { backgroundColor: theme.background, ...segmentShadow }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabLabel, { color: active ? theme.text : colors.textMuted }]}>
                {tab === 'trimester' ? 'Trimester Report' : 'Custom Range'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'trimester'
        ? <TrimesterTab studentId={studentId} logs={logs} />
        : <CustomRangeTab logs={logs} />
      }
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  label: {
    fontSize: fonts.sizes.caption,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: 4,
    marginBottom: spacing.sm,
  },
  tab:      { flex: 1, paddingVertical: 10, borderRadius: radii.md, alignItems: 'center' },
  tabLabel: { fontSize: fonts.sizes.body, fontWeight: '700' },

  // Trimester segment
  segment:      { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radii.lg, padding: 4 },
  segmentBtn:   { flex: 1, paddingVertical: 10, borderRadius: radii.md, alignItems: 'center' },
  segmentLabel: { fontSize: fonts.sizes.subtitle, fontWeight: '700' },

  // Date input
  dateInput: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    fontSize: fonts.sizes.body,
    backgroundColor: theme.backgroundElement,
    color: theme.text,
    borderColor: colors.inputBorder,
  },

  // Info box
  infoBox:  { marginBottom: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1 },
  infoText: { fontSize: fonts.sizes.body, lineHeight: 18 },

  // Scores card
  scoresCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  scoreLabel:    { fontSize: fonts.sizes.body, fontWeight: '600', color: colors.textMuted, flex: 1 },
  scoreDots:     { flexDirection: 'row', gap: spacing.xs },
  scoreDot: {
    width: 32, height: 32,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDotText:  { fontSize: fonts.sizes.body, fontWeight: '700' },

  // Progress bar
  barBg:   { height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radii.pill },

  // Error
  errorBox:  { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md },
  errorText: { fontSize: fonts.sizes.body, fontWeight: '600' },

  // Submit / clear buttons
  submitBtn: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { backgroundColor: colors.placeholder },
  submitBtnText:     { color: colors.textOnPrimary, fontSize: fonts.sizes.subtitle, fontWeight: '700' },
  clearBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  clearBtnText: { fontSize: fonts.sizes.body, fontWeight: '600', color: colors.textMuted },

  // Past report cards
  pastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.backgroundElement,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadow,
  },
  pastCardLeft:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  trimBadge:       { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
  trimBadgeText:   { fontSize: fonts.sizes.body, fontWeight: '800', color: colors.primaryDark },
  pastCardDate:    { fontSize: fonts.sizes.body, fontWeight: '700', color: colors.text },
  pastCardAvg:     { fontSize: fonts.sizes.caption, color: colors.textMuted, marginTop: 2 },
  pastCardChevron: { fontSize: 20, fontWeight: '300', color: colors.textMuted },

  // Range summary header
  rangeHeader: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  rangeHeaderTitle: {
    fontSize: fonts.sizes.caption,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rangeHeaderDates: { fontSize: fonts.sizes.subtitle, fontWeight: '600', color: colors.primaryDark, marginTop: spacing.xs },

  // Stat chips
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statChip: {
    flex: 1,
    backgroundColor: theme.backgroundElement,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    ...shadow,
  },
  statChipValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statChipLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2, textTransform: 'uppercase' },
  statChipSub:   { fontSize: fonts.sizes.caption, fontWeight: '700', color: colors.primary, marginTop: 2 },

  // Surah breakdown rows
  surahRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  surahRowLeft:  { flex: 1 },
  surahRowRight: { alignItems: 'flex-end' },
  surahName:     { fontSize: fonts.sizes.body, fontWeight: '700', color: colors.text },
  surahSessions: { fontSize: fonts.sizes.caption, color: colors.textMuted, marginTop: 2 },
  surahAyahs:    { fontSize: fonts.sizes.body, fontWeight: '700', color: colors.primaryDark },
  surahPages:    { fontSize: fonts.sizes.caption, color: colors.textMuted, marginTop: 2 },

  // Report card modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 33, 24, 0.55)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: theme.background,
    maxHeight: '85%',
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle:   { fontSize: fonts.sizes.subtitle, fontWeight: '800', color: colors.text },
  modalClose:   { fontSize: fonts.sizes.body, fontWeight: '600', color: colors.textMuted },
  modalContent: { padding: spacing.lg, paddingBottom: 40 },

  // Report card hero
  avgHero: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avgLabel: { fontSize: fonts.sizes.caption, fontWeight: '700', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 0.6 },
  avgValue: { fontSize: 36, fontWeight: '800', color: colors.primaryDark, marginTop: spacing.xs },
  avgMeta:  { fontSize: fonts.sizes.body, fontWeight: '600', color: colors.primaryDark, marginTop: spacing.xs, opacity: 0.75 },

  scoreBarRow: { marginBottom: spacing.md },
  scoreBarTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  scoreBarLabel: { fontSize: fonts.sizes.body, fontWeight: '600', color: colors.text },
  scoreBarValue: { fontSize: fonts.sizes.body, fontWeight: '700', color: colors.primaryDark },
});