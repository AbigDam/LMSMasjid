import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
//import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const colors = {
  primary:      '#1C7A3E',
  primaryDark:  '#15803D',
  primaryLight: '#DCFCE7',
  blue:         '#1C5B8E',
  blueLight:    '#DBEAFE',
  amber:        '#B45309',
  amberLight:   '#FEF3C7',
  red:          '#B91C1C',
  redLight:     '#FEE2E2',
  border:       '#E5E7EB',
  textMuted:    '#6B7280',
  disabled:     '#9CA3AF',
};
const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
const radii   = { sm: 8, md: 10, lg: 12, xl: 16, pill: 999 };
const segmentShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
};
const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
};

const AYAHS_PER_PAGE = 15;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Mirror of LogEntry from studentId.tsx — kept in sync manually until shared
export type LogEntry = {
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

// Matches Django ReportCard model exactly
export type ReportCardPayload = {
  student: number;
  logged_by: number;         // TODO: inject from auth context
  classroom: number;         // TODO: inject from student's classroom API
  behavior_score: number;    // 1–5
  reading_score: number;     // 1–5
  review_score: number;      // 1–5
  memorization_score: number;// 1–5
  attendance_score: number;  // 1–5
  trimester: number;         // 1–3
  date: string;
};

// Saved report card (includes id from backend after POST)
type SavedReportCard = ReportCardPayload & { id: number };

// Custom date range summary (stats only, no scores)
type RangeSummary = {
  date_from: string;
  date_to: string;
  total_ayahs: number;
  total_pages: number;
  total_sessions: number;
  memorization_sessions: number;
  review_sessions: number;
  absent_days: number;
  surah_breakdown: { surahName: string; surah: number; ayahs: number; sessions: number }[];
};

type Props = {
  studentId: number;
  logs: LogEntry[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

function roundToHalf(n: number) {
  return Math.round(n * 2) / 2;
}

/** Compute ReportCard scores from a filtered set of logs */
function computeScores(logs: LogEntry[]): Omit<ReportCardPayload,
  'student' | 'logged_by' | 'classroom' | 'trimester' | 'date'> {
  const present    = logs.filter(l => l.attendance !== 'Absent' && l.attendance !== 'Excused Absence');
  const total      = logs.length;
  const memLogs    = present.filter(l => l.type === 'memorization');
  const revLogs    = present.filter(l => l.type === 'review');

  const attendance_score = total > 0
    ? clamp(Math.round((present.length / total) * 5), 1, 5)
    : 3;

  const behavior_score = present.length > 0
    ? clamp(Math.round(present.reduce((a, l) => a + l.behavior, 0) / present.length), 1, 5)
    : 3;

  const memorization_score = memLogs.length > 0
    ? clamp(Math.round((memLogs.filter(l => l.grade === 'pass').length / memLogs.length) * 5), 1, 5)
    : 3;

  const review_score = revLogs.length > 0
    ? clamp(Math.round((revLogs.filter(l => l.grade === 'pass').length / revLogs.length) * 5), 1, 5)
    : 3;

  // reading_score = composite of mem + review pass rates weighted equally
  const reading_score = clamp(
    Math.round((memorization_score + review_score) / 2),
    1, 5
  );

  return { behavior_score, reading_score, review_score, memorization_score, attendance_score };
}

/** Compute ayah/page stats from a filtered set of logs */
function computeStats(logs: LogEntry[]): Omit<RangeSummary, 'date_from' | 'date_to'> {
  const present = logs.filter(l => l.attendance !== 'Absent' && l.attendance !== 'Excused Absence');
  const absent_days = logs.filter(l => l.attendance === 'Absent' || l.attendance === 'Excused Absence').length;

  let total_ayahs = 0;
  const surahMap: Record<string, { surahName: string; surah: number; ayahs: number; sessions: number }> = {};

  for (const log of present) {
    if (log.ayahStart != null && log.ayahEnd != null && log.surahName) {
      const ayahs = log.ayahEnd - log.ayahStart + 1;
      total_ayahs += ayahs;
      const key = log.surahName;
      if (!surahMap[key]) {
        surahMap[key] = { surahName: log.surahName, surah: log.surah ?? 0, ayahs: 0, sessions: 0 };
      }
      surahMap[key].ayahs    += ayahs;
      surahMap[key].sessions += 1;
    }
  }

  return {
    total_ayahs,
    total_pages: parseFloat((total_ayahs / AYAHS_PER_PAGE).toFixed(1)),
    total_sessions: present.length,
    memorization_sessions: present.filter(l => l.type === 'memorization').length,
    review_sessions:       present.filter(l => l.type === 'review').length,
    absent_days,
    surah_breakdown: Object.values(surahMap).sort((a, b) => a.surah - b.surah),
  };
}

// ---------------------------------------------------------------------------
// Shared UI pieces
// ---------------------------------------------------------------------------

function SectionLabel({ text }: { text: string }) {
  return <Text style={s.label}>{text}</Text>;
}

function ScoreRow({ label, value, onChange, theme }: {
  label: string; value: number; onChange: (v: number) => void; theme: any;
}) {
  return (
    <View style={s.scoreRow}>
      <Text style={[s.scoreLabel, { color: colors.textMuted }]}>{label}</Text>
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
              <Text style={[s.scoreDotText, { color: filled ? '#fff' : colors.textMuted }]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ProgressBar({ value, max = 5, color = colors.primary }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={[s.barBg, { backgroundColor: colors.border }]}>
      <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function StatChip({ label, value, sub, theme }: { label: string; value: string | number; sub?: string; theme: any }) {
  return (
    <View style={[s.statChip, { backgroundColor: theme.backgroundElement, borderColor: colors.border }]}>
      <Text style={[s.statChipValue, { color: theme.text }]}>{value}</Text>
      <Text style={[s.statChipLabel, { color: colors.textMuted }]}>{label}</Text>
      {sub ? <Text style={[s.statChipSub, { color: colors.primary }]}>{sub}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Trimester segment
// ---------------------------------------------------------------------------
function TrimesterPicker({ value, onChange, theme }: { value: number; onChange: (v: number) => void; theme: any }) {
  return (
    <View style={[s.segment, { backgroundColor: theme.backgroundElement }]}>
      {[1, 2, 3].map(n => {
        const active = value === n;
        return (
          <TouchableOpacity
            key={n}
            style={[s.segmentBtn, active && { backgroundColor: theme.background, ...segmentShadow }]}
            onPress={() => onChange(n)}
          >
            <Text style={[s.segmentLabel, { color: active ? theme.text : colors.textMuted }]}>T{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Report Card detail modal
// ---------------------------------------------------------------------------
function ReportCardModal({ report, onClose, theme }: {
  report: SavedReportCard; onClose: () => void; theme: any;
}) {
  const scoreFields = [
    { label: 'Behavior',     key: 'behavior_score' as const },
    { label: 'Reading',      key: 'reading_score' as const },
    { label: 'Review',       key: 'review_score' as const },
    { label: 'Memorization', key: 'memorization_score' as const },
    { label: 'Attendance',   key: 'attendance_score' as const },
  ];
  const avg = (
    (report.behavior_score + report.reading_score + report.review_score +
     report.memorization_score + report.attendance_score) / 5
  ).toFixed(1);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.modalCard, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: theme.text }]}>Report Card</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={[s.modalClose, { color: colors.textMuted }]}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            {/* Average hero */}
            <View style={[s.avgHero, { backgroundColor: colors.primaryLight }]}>
              <Text style={[s.avgLabel, { color: colors.primaryDark }]}>Overall Average</Text>
              <Text style={[s.avgValue, { color: colors.primaryDark }]}>{avg} / 5</Text>
              <Text style={[s.avgMeta,  { color: colors.primaryDark }]}>
                Trimester {report.trimester}  ·  {report.date}
              </Text>
            </View>
            {/* Score bars */}
            {scoreFields.map(({ label, key }) => (
              <View key={key} style={s.scoreBarRow}>
                <View style={s.scoreBarTop}>
                  <Text style={[s.scoreBarLabel, { color: theme.text }]}>{label}</Text>
                  <Text style={[s.scoreBarValue, { color: colors.primaryDark }]}>{report[key]}/5</Text>
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
// Trimester tab — auto-generates scores, teacher can edit before saving
// ---------------------------------------------------------------------------
function TrimesterTab({ studentId, logs, theme }: { studentId: number; logs: LogEntry[]; theme: any }) {
  const today = new Date().toISOString().split('T')[0];
  const [trimester,  setTrimester]  = useState(1);
  const [reportDate, setReportDate] = useState(today);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Auto-computed scores (editable) + Quran stats
  const auto  = useMemo(() => computeScores(logs), [logs]);
  const stats = useMemo(() => computeStats(logs),  [logs]);
  const [behaviorScore,     setBehaviorScore]     = useState(auto.behavior_score);
  const [readingScore,      setReadingScore]       = useState(auto.reading_score);
  const [reviewScore,       setReviewScore]        = useState(auto.review_score);
  const [memorizationScore, setMemorizationScore]  = useState(auto.memorization_score);
  const [attendanceScore,   setAttendanceScore]    = useState(auto.attendance_score);

  // Saved report cards list + detail view
  const [savedReports,      setSavedReports]   = useState<SavedReportCard[]>([]);
  const [viewingReport,     setViewingReport]  = useState<SavedReportCard | null>(null);

  // Re-auto-fill when trimester changes
  const refill = () => {
    // TODO: replace with GET /api/report-card/generate/?student=<id>&trimester=<n>
    // and populate from res.data instead of local log computation
    setBehaviorScore(auto.behavior_score);
    setReadingScore(auto.reading_score);
    setReviewScore(auto.review_score);
    setMemorizationScore(auto.memorization_score);
    setAttendanceScore(auto.attendance_score);
  };

  const handleTrimesterChange = (t: number) => {
    setTrimester(t);
    refill();
  };

  const handleSave = async () => {
    setError(null);
    setIsLoading(true);

    const payload: ReportCardPayload = {
      student:            studentId,
      logged_by:          0,  // TODO: inject authenticated teacher ID from auth context
      classroom:          0,  // TODO: inject student's classroom ID from API
      behavior_score:     behaviorScore,
      reading_score:      readingScore,
      review_score:       reviewScore,
      memorization_score: memorizationScore,
      attendance_score:   attendanceScore,
      trimester,
      date:               reportDate,
    };

    // TODO: replace mock with:
    // const res = await axios.post('/api/report-card/', payload, {
    //   headers: { Authorization: `Bearer <token>` },
    // });
    // setSavedReports(prev => [res.data, ...prev]);

    // Mock — remove once backend is wired
    await new Promise(r => setTimeout(r, 500));
    const saved: SavedReportCard = { ...payload, id: Date.now() };
    setSavedReports(prev => [saved, ...prev]);
    setIsLoading(false);
  };

  const scores = [
    { label: 'Behavior',     value: behaviorScore,     setter: setBehaviorScore },
    { label: 'Reading',      value: readingScore,       setter: setReadingScore },
    { label: 'Review',       value: reviewScore,        setter: setReviewScore },
    { label: 'Memorization', value: memorizationScore,  setter: setMemorizationScore },
    { label: 'Attendance',   value: attendanceScore,    setter: setAttendanceScore },
  ];

  return (
    <View>
      {/* ── Past report cards ── */}
      {savedReports.length > 0 && (
        <View style={s.pastSection}>
          <SectionLabel text="Past Report Cards" />
          {savedReports.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[s.pastCard, { backgroundColor: theme.backgroundElement, borderColor: colors.border }]}
              onPress={() => setViewingReport(r)}
              activeOpacity={0.75}
            >
              <View style={s.pastCardLeft}>
                <View style={[s.trimBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[s.trimBadgeText, { color: colors.primaryDark }]}>T{r.trimester}</Text>
                </View>
                <View>
                  <Text style={[s.pastCardDate, { color: theme.text }]}>{r.date}</Text>
                  <Text style={[s.pastCardAvg, { color: colors.textMuted }]}>
                    Avg {((r.behavior_score + r.reading_score + r.review_score + r.memorization_score + r.attendance_score) / 5).toFixed(1)}/5
                  </Text>
                </View>
              </View>
              <Text style={[s.pastCardChevron, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Info banner ── */}
      <View style={[s.infoBox, { backgroundColor: colors.blueLight, borderColor: '#93C5FD' }]}>
        <Text style={[s.infoText, { color: colors.blue }]}>
          ✦ Scores are auto-generated from log history. Adjust any score before saving.
        </Text>
      </View>

      {/* ── Trimester picker ── */}
      <SectionLabel text="Trimester" />
      <TrimesterPicker value={trimester} onChange={handleTrimesterChange} theme={theme} />

      {/* ── Report date ── */}
      <SectionLabel text="Report Date" />
      <TextInput
        style={[s.dateInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: colors.border }]}
        value={reportDate}
        onChangeText={setReportDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        maxLength={10}
      />

      {/* ── Editable scores ── */}
      <SectionLabel text="Scores  (1 – 5)  — tap to adjust" />
      <View style={[s.scoresCard, { backgroundColor: theme.backgroundElement, borderColor: colors.border }]}>
        {scores.map(({ label, value, setter }) => (
          <ScoreRow key={label} label={label} value={value} onChange={setter} theme={theme} />
        ))}
      </View>

      {/* ── Quran progress summary ── */}
      <SectionLabel text="Quran Progress This Trimester" />
      <View style={s.chipRow}>
        <StatChip label="Total Ayahs"  value={stats.total_ayahs}         sub={`${stats.total_pages} pages`} theme={theme} />
        <StatChip label="Sessions"     value={stats.total_sessions}       theme={theme} />
        <StatChip label="Absent Days"  value={stats.absent_days}          theme={theme} />
      </View>
      <View style={s.chipRow}>
        <StatChip label="Memorization" value={stats.memorization_sessions} theme={theme} />
        <StatChip label="Review"       value={stats.review_sessions}       theme={theme} />
      </View>

      {stats.surah_breakdown.length > 0 && (
        <View>
          <SectionLabel text="Surah Breakdown" />
          <View style={[s.scoresCard, { backgroundColor: theme.backgroundElement, borderColor: colors.border }]}>
            {stats.surah_breakdown.map((row, i) => (
              <View
                key={row.surahName}
                style={[
                  s.surahRow,
                  i < stats.surah_breakdown.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={s.surahRowLeft}>
                  <Text style={[s.surahName, { color: theme.text }]}>{row.surahName}</Text>
                  <Text style={[s.surahSessions, { color: colors.textMuted }]}>
                    {row.sessions} session{row.sessions !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={s.surahRowRight}>
                  <Text style={[s.surahAyahs, { color: colors.primaryDark }]}>{row.ayahs} ayahs</Text>
                  <Text style={[s.surahPages,  { color: colors.textMuted }]}>
                    ~{(row.ayahs / AYAHS_PER_PAGE).toFixed(1)} pg
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {error && (
        <View style={[s.errorBox, { backgroundColor: colors.redLight }]}>
          <Text style={[s.errorText, { color: colors.red }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.submitBtn, isLoading && s.submitBtnDisabled]}
        onPress={handleSave}
        disabled={isLoading}
      >
        <Text style={s.submitBtnText}>{isLoading ? 'Saving…' : 'Save Report Card'}</Text>
      </TouchableOpacity>

      {/* Report card detail modal */}
      {viewingReport && (
        <ReportCardModal
          report={viewingReport}
          onClose={() => setViewingReport(null)}
          theme={theme}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Custom range tab — stats only, no scores
// ---------------------------------------------------------------------------
function CustomRangeTab({ logs, theme }: { logs: LogEntry[]; theme: any }) {
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState(today);
  const [summary,  setSummary]  = useState<RangeSummary | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    if (!dateFrom || !dateTo) { setError('Please enter both a start and end date.'); return; }
    if (dateFrom > dateTo)    { setError('Start date must be before end date.'); return; }

    // TODO: replace with GET /api/logs/summary/?student=<id>&date_from=<>&date_to=<>
    // const res = await axios.get('/api/logs/summary/', {
    //   params: { student: studentId, date_from: dateFrom, date_to: dateTo },
    //   headers: { Authorization: `Bearer <token>` },
    // });
    // setSummary(res.data);

    // Local computation from props logs — remove once backend is wired
    const filtered = logs.filter(l => l.date >= dateFrom && l.date <= dateTo);
    setSummary({ ...computeStats(filtered), date_from: dateFrom, date_to: dateTo });
  };

  const handleClear = () => { setSummary(null); setDateFrom(''); setDateTo(today); setError(null); };

  return (
    <View>
      <SectionLabel text="Start Date" />
      <TextInput
        style={[s.dateInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: colors.border }]}
        value={dateFrom}
        onChangeText={setDateFrom}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        maxLength={10}
      />

      <SectionLabel text="End Date" />
      <TextInput
        style={[s.dateInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: colors.border }]}
        value={dateTo}
        onChangeText={setDateTo}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        maxLength={10}
      />

      {error && (
        <View style={[s.errorBox, { backgroundColor: colors.redLight }]}>
          <Text style={[s.errorText, { color: colors.red }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity style={s.submitBtn} onPress={handleGenerate}>
        <Text style={s.submitBtnText}>Generate Summary</Text>
      </TouchableOpacity>

      {/* ── Results ── */}
      {summary && (
        <View style={s.summarySection}>
          {/* Date range header */}
          <View style={[s.rangeHeader, { backgroundColor: colors.primaryLight }]}>
            <Text style={[s.rangeHeaderTitle, { color: colors.primaryDark }]}>Quran Progress Summary</Text>
            <Text style={[s.rangeHeaderDates, { color: colors.primaryDark }]}>
              {summary.date_from}  →  {summary.date_to}
            </Text>
          </View>

          {/* Stat chips row 1 — ayahs + pages */}
          <View style={s.chipRow}>
            <StatChip label="Total Ayahs"  value={summary.total_ayahs} sub={`${summary.total_pages} pages`} theme={theme} />
            <StatChip label="Sessions"     value={summary.total_sessions} theme={theme} />
            <StatChip label="Absent Days"  value={summary.absent_days} theme={theme} />
          </View>

          {/* Stat chips row 2 — session types */}
          <View style={s.chipRow}>
            <StatChip label="Memorization" value={summary.memorization_sessions} theme={theme} />
            <StatChip label="Review"       value={summary.review_sessions} theme={theme} />
          </View>

          {/* Surah breakdown */}
          {summary.surah_breakdown.length > 0 && (
            <View>
              <SectionLabel text="Surah Breakdown" />
              <View style={[s.scoresCard, { backgroundColor: theme.backgroundElement, borderColor: colors.border }]}>
                {summary.surah_breakdown.map((row, i) => (
                  <View
                    key={row.surahName}
                    style={[
                      s.surahRow,
                      i < summary.surah_breakdown.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={s.surahRowLeft}>
                      <Text style={[s.surahName, { color: theme.text }]}>{row.surahName}</Text>
                      <Text style={[s.surahSessions, { color: colors.textMuted }]}>
                        {row.sessions} session{row.sessions !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={s.surahRowRight}>
                      <Text style={[s.surahAyahs, { color: colors.primaryDark }]}>{row.ayahs} ayahs</Text>
                      <Text style={[s.surahPages, { color: colors.textMuted }]}>
                        ~{(row.ayahs / AYAHS_PER_PAGE).toFixed(1)} pg
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
            <Text style={[s.clearBtnText, { color: colors.textMuted }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function ReportGenerator({ studentId, logs }: Props) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'trimester' | 'custom'>('trimester');

  return (
    <View>
      {/* Tab toggle */}
      <View style={[s.tabBar, { backgroundColor: theme.backgroundElement }]}>
        {(['trimester', 'custom'] as const).map(tab => {
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
        ? <TrimesterTab studentId={studentId} logs={logs} theme={theme} />
        : <CustomRangeTab logs={logs} theme={theme} />
      }
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  // Labels
  label: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },

  // Tab bar
  tabBar: { flexDirection: 'row', borderRadius: radii.lg, padding: 4, marginBottom: spacing.sm },
  tab:    { flex: 1, paddingVertical: 10, borderRadius: radii.md, alignItems: 'center' },
  tabLabel: { fontSize: 14, fontWeight: '700' },

  // Trimester segment
  segment:      { flexDirection: 'row', borderRadius: radii.lg, padding: 4 },
  segmentBtn:   { flex: 1, paddingVertical: 10, borderRadius: radii.md, alignItems: 'center' },
  segmentLabel: { fontSize: 15, fontWeight: '700' },

  // Date input
  dateInput: {
    padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, fontSize: 15,
  },

  // Info box
  infoBox: {
    marginBottom: spacing.sm, padding: spacing.md,
    borderRadius: radii.md, borderWidth: 1,
  },
  infoText: { fontSize: 13, lineHeight: 18 },

  // Scores card
  scoresCard: { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  scoreLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  scoreDots:  { flexDirection: 'row', gap: spacing.xs },
  scoreDot: {
    width: 32, height: 32, borderRadius: radii.pill,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  scoreDotText: { fontSize: 13, fontWeight: '700' },

  // Progress bar
  barBg:   { height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radii.pill },

  // Error
  errorBox:  { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md },
  errorText: { fontSize: 13, fontWeight: '600' },

  // Submit / clear buttons
  submitBtn: {
    backgroundColor: colors.primary, padding: spacing.lg,
    borderRadius: radii.lg, alignItems: 'center', marginTop: spacing.xl,
  },
  submitBtnDisabled: { backgroundColor: colors.disabled },
  submitBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  clearBtn: {
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
    borderRadius: radii.lg, alignItems: 'center', marginTop: spacing.lg,
  },
  clearBtnText: { fontSize: 14, fontWeight: '600' },

  // Past report cards list
  pastSection: { marginBottom: spacing.md },
  pastCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderRadius: radii.lg, borderWidth: 1,
    marginBottom: spacing.sm, ...cardShadow,
  },
  pastCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  trimBadge:     { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
  trimBadgeText: { fontSize: 13, fontWeight: '800' },
  pastCardDate:  { fontSize: 14, fontWeight: '700' },
  pastCardAvg:   { fontSize: 12, marginTop: 2 },
  pastCardChevron: { fontSize: 20, fontWeight: '300' },

  // Range summary
  summarySection: { marginTop: spacing.xl },
  rangeHeader: {
    borderRadius: radii.lg, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.lg,
  },
  rangeHeaderTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  rangeHeaderDates: { fontSize: 15, fontWeight: '600', marginTop: spacing.xs },

  // Stat chips
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statChip: {
    flex: 1, borderRadius: radii.lg, borderWidth: 1,
    padding: spacing.md, alignItems: 'center', ...cardShadow,
  },
  statChipValue: { fontSize: 22, fontWeight: '800' },
  statChipLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  statChipSub:   { fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Surah breakdown rows
  surahRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  surahRowLeft:  { flex: 1 },
  surahRowRight: { alignItems: 'flex-end' },
  surahName:     { fontSize: 14, fontWeight: '700' },
  surahSessions: { fontSize: 12, marginTop: 2 },
  surahAyahs:    { fontSize: 14, fontWeight: '700' },
  surahPages:    { fontSize: 12, marginTop: 2 },

  // Report card modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(15,15,15,0.55)',
    justifyContent: 'center', padding: spacing.xl,
  },
  modalCard: {
    maxHeight: '85%', borderRadius: radii.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 16, elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalClose: { fontSize: 15, fontWeight: '600' },
  modalContent: { padding: spacing.lg, paddingBottom: 40 },
  avgHero: {
    borderRadius: radii.lg, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.lg,
  },
  avgLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  avgValue: { fontSize: 36, fontWeight: '800', marginTop: spacing.xs },
  avgMeta:  { fontSize: 13, fontWeight: '600', marginTop: spacing.xs, opacity: 0.75 },
  scoreBarRow: { marginBottom: spacing.md },
  scoreBarTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  scoreBarLabel: { fontSize: 14, fontWeight: '600' },
  scoreBarValue: { fontSize: 14, fontWeight: '700' },
});