import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInput,
} from 'react-native';
import { quranSurahs, Surah } from '../data/quran';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Design tokens — same system as dashboard & studentId
// ---------------------------------------------------------------------------
const colors = {
  primary:      '#1C7A3E',
  primaryDark:  '#15803D',
  primaryLight: '#DCFCE7',
  blue:         '#1C5B8E',
  border:       '#E5E7EB',
  textMuted:    '#6B7280',
  disabled:     '#9CA3AF',
};
const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 };
const radii   = { sm: 8, md: 10, lg: 12, xl: 16, pill: 999 };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type NewLog = {
  surah?: number;
  attendance: string;
  surahName?: string;
  ayahStart?: number;
  ayahEnd?: number;
  type: 'memorization' | 'review';
  grade: 'pass' | 'fail';
  behavior: number;
  assignments?: string;
};

type Props = {
  onSubmit: (log: NewLog) => void;
  initialData?: NewLog;
};

type PickerModalProps<T> = {
  visible: boolean;
  items: T[];
  labelFn: (item: T) => string;
  onSelect: (item: T) => void;
  onClose: () => void;
  title: string;
};

// ---------------------------------------------------------------------------
// Picker sheet (unchanged behaviour, styled to match dashboard)
// ---------------------------------------------------------------------------
function PickerModal<T>({ visible, items, labelFn, onSelect, onClose, title }: PickerModalProps<T>) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.pickerOverlay}>
        <View style={[s.pickerSheet, { backgroundColor: theme.background }]}>
          <View style={[s.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.pickerTitle, { color: theme.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={[s.pickerDone, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.pickerItem, { borderBottomColor: colors.border }]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={{ color: theme.text, fontSize: 16 }}>{labelFn(item)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Segment control (replaces raw typeToggle)
// ---------------------------------------------------------------------------
function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  theme,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  theme: any;
}) {
  return (
    <View style={[s.segment, { backgroundColor: theme.backgroundElement }]}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[s.segmentBtn, active && { backgroundColor: theme.background, ...segmentActiveShadow }]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[s.segmentLabel, { color: active ? theme.text : colors.textMuted }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segmentActiveShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
};

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------
export function AddLogForm({ onSubmit, initialData }: Props) {
  const theme = useTheme();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [attendance, setAttendance] = useState<'Present' | 'Absent' | 'Excused Absence'>(
    (initialData?.attendance as any) ?? 'Present'
  );

  const initialSurahObj = initialData?.surah
    ? quranSurahs.find(s => s.number === initialData.surah) || null
    : null;

  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(initialSurahObj);
  const [ayahStart, setAyahStart]         = useState<number | null>(initialData?.ayahStart ?? null);
  const [ayahEnd, setAyahEnd]             = useState<number | null>(initialData?.ayahEnd ?? null);
  const [readingType, setReadingType]     = useState<'memorization' | 'review'>(initialData?.type ?? 'memorization');
  const [selectedGrade, setGrade]         = useState<'pass' | 'fail'>(initialData?.grade ?? 'pass');
  const [behavior, setBehavior]           = useState<number>(initialData?.behavior ?? 5);
  const [assignments, setAssignments]     = useState<string>(initialData?.assignments ?? '');

  const [surahModalVisible, setSurahModalVisible]           = useState(false);
  const [startAyahModalVisible, setStartAyahModalVisible]   = useState(false);
  const [endAyahModalVisible, setEndAyahModalVisible]       = useState(false);

  const ayahStartOptions = selectedSurah
    ? Array.from({ length: selectedSurah.ayahs }, (_, i) => i + 1)
    : [];
  const ayahEndOptions = selectedSurah && ayahStart
    ? Array.from({ length: selectedSurah.ayahs - ayahStart + 1 }, (_, i) => ayahStart + i)
    : selectedSurah
    ? Array.from({ length: selectedSurah.ayahs }, (_, i) => i + 1)
    : [];

  const isAbsent    = attendance === 'Absent' || attendance === 'Excused Absence';
  const canStep2    = selectedSurah !== null && ayahStart !== null && ayahEnd !== null;

  const handleNext = () => {
    if (currentStep === 1) { isAbsent ? handleSubmit() : setCurrentStep(2); }
    else if (currentStep === 2 && canStep2) { setCurrentStep(3); }
  };

  const handleBack = () => {
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  };

  const handleSubmit = () => {
    onSubmit({
      surah: selectedSurah?.number,
      attendance,
      surahName: selectedSurah?.name,
      ayahStart: ayahStart ?? undefined,
      ayahEnd: ayahEnd ?? undefined,
      type: readingType,
      behavior,
      grade: selectedGrade,
      assignments: assignments.trim() || undefined,
    });
    setSelectedSurah(null); setAyahStart(null); setAyahEnd(null);
    setReadingType('memorization'); setBehavior(5);
    setAttendance('Present'); setGrade('pass');
    setAssignments(''); setCurrentStep(1);
  };

  // Step dot indicator
  const StepDots = () => (
    <View style={s.stepDots}>
      {[1, 2, 3].map(n => (
        <View
          key={n}
          style={[s.dot, {
            backgroundColor: n === currentStep ? colors.primary
              : n < currentStep ? colors.primaryLight : colors.border,
            width: n === currentStep ? 20 : 8,
          }]}
        />
      ))}
    </View>
  );

  return (
    <View>
      {!isAbsent && <StepDots />}

      {/* ── STEP 1: Attendance ── */}
      {currentStep === 1 && (
        <View>
          <SectionLabel text="Attendance" />
          <SegmentControl
            options={[
              { label: 'Present', value: 'Present' },
              { label: 'Absent', value: 'Absent' },
              { label: 'Excused', value: 'Excused Absence' },
            ]}
            value={attendance}
            onChange={setAttendance}
            theme={theme}
          />

          <PrimaryButton
            label={isAbsent ? (initialData ? 'Save Changes' : 'Submit Log') : 'Next →'}
            onPress={handleNext}
          />
        </View>
      )}

      {/* ── STEP 2: Surah + type + grade + behavior ── */}
      {currentStep === 2 && !isAbsent && (
        <View>
          <SectionLabel text="Surah" />
          <TouchableOpacity
            style={[s.picker, { backgroundColor: theme.backgroundElement, borderColor: colors.border }]}
            onPress={() => setSurahModalVisible(true)}
          >
            <Text style={{ color: selectedSurah ? theme.text : colors.textMuted, fontSize: 15 }}>
              {selectedSurah ? `${selectedSurah.number}. ${selectedSurah.name}` : 'Select Surah'}
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </TouchableOpacity>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <SectionLabel text="Ayah Start" />
              <TouchableOpacity
                style={[s.picker, { backgroundColor: theme.backgroundElement, borderColor: colors.border }, !selectedSurah && s.pickerDisabled]}
                onPress={() => selectedSurah && setStartAyahModalVisible(true)}
                disabled={!selectedSurah}
              >
                <Text style={{ color: ayahStart ? theme.text : colors.textMuted, fontSize: 15 }}>
                  {ayahStart ?? 'Select'}
                </Text>
                <Text style={{ color: colors.textMuted }}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <SectionLabel text="Ayah End" />
              <TouchableOpacity
                style={[s.picker, { backgroundColor: theme.backgroundElement, borderColor: colors.border }, !ayahStart && s.pickerDisabled]}
                onPress={() => ayahStart && setEndAyahModalVisible(true)}
                disabled={!ayahStart}
              >
                <Text style={{ color: ayahEnd ? theme.text : colors.textMuted, fontSize: 15 }}>
                  {ayahEnd ?? 'Select'}
                </Text>
                <Text style={{ color: colors.textMuted }}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <SectionLabel text="Session Type" />
          <SegmentControl
            options={[{ label: 'Memorization', value: 'memorization' }, { label: 'Review', value: 'review' }]}
            value={readingType}
            onChange={setReadingType}
            theme={theme}
          />

          <SectionLabel text="Grade" />
          <SegmentControl
            options={[{ label: 'Pass ✓', value: 'pass' }, { label: 'Fail ✗', value: 'fail' }]}
            value={selectedGrade}
            onChange={setGrade}
            theme={theme}
          />

          <SectionLabel text="Behavior" />
          <View style={s.behaviorRow}>
            {[1, 2, 3, 4, 5].map(score => (
              <TouchableOpacity
                key={score}
                style={[
                  s.behaviorBtn,
                  { backgroundColor: behavior === score ? colors.primary : theme.backgroundElement,
                    borderColor: behavior === score ? colors.primary : colors.border },
                ]}
                onPress={() => setBehavior(score)}
              >
                <Text style={[s.behaviorLabel, { color: behavior === score ? '#fff' : colors.textMuted }]}>
                  {score}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[s.row, { marginTop: spacing.xl }]}>
            <OutlineButton label="← Back" onPress={handleBack} />
            <View style={{ flex: 2 }}>
              <PrimaryButton label="Next →" onPress={handleNext} disabled={!canStep2} />
            </View>
          </View>
        </View>
      )}

      {/* ── STEP 3: Assignments ── */}
      {currentStep === 3 && !isAbsent && (
        <View>
          <SectionLabel text="Assignments & Comments" />
          <TextInput
            style={[s.textArea, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: colors.border }]}
            placeholder="Enter homework, targets, or observations…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            value={assignments}
            onChangeText={setAssignments}
          />

          <View style={[s.row, { marginTop: spacing.xl }]}>
            <OutlineButton label="← Back" onPress={handleBack} />
            <View style={{ flex: 2 }}>
              <PrimaryButton
                label={initialData ? 'Save Changes' : 'Submit Log'}
                onPress={handleSubmit}
              />
            </View>
          </View>
        </View>
      )}

      {/* Pickers */}
      <PickerModal visible={surahModalVisible} items={quranSurahs} labelFn={s2 => `${s2.number}. ${s2.name}`}
        onSelect={s2 => { setSelectedSurah(s2); setAyahStart(null); setAyahEnd(null); }}
        onClose={() => setSurahModalVisible(false)} title="Select Surah" />
      <PickerModal visible={startAyahModalVisible} items={ayahStartOptions} labelFn={n => String(n)}
        onSelect={n => { setAyahStart(n); setAyahEnd(null); }}
        onClose={() => setStartAyahModalVisible(false)} title="Select Starting Ayah" />
      <PickerModal visible={endAyahModalVisible} items={ayahEndOptions} labelFn={n => String(n)}
        onSelect={setAyahEnd} onClose={() => setEndAyahModalVisible(false)} title="Select Ending Ayah" />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tiny sub-components
// ---------------------------------------------------------------------------
function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={s.label}>{text}</Text>
  );
}

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.primaryBtn, disabled && s.primaryBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={s.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.outlineBtn} onPress={onPress}>
      <Text style={s.outlineBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  // Step dots
  stepDots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.lg, alignSelf: 'center' },
  dot:      { height: 8, borderRadius: radii.pill },

  // Labels
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Segment control
  segment:    { flexDirection: 'row', borderRadius: radii.lg, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: radii.md, alignItems: 'center' },
  segmentLabel: { fontSize: 14, fontWeight: '600' },

  // Picker rows
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  pickerDisabled: { opacity: 0.4 },
  row: { flexDirection: 'row', gap: spacing.md },

  // Behavior
  behaviorRow: { flexDirection: 'row', gap: spacing.sm },
  behaviorBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  behaviorLabel: { fontSize: 16, fontWeight: '700' },

  // Text area
  textArea: {
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    borderWidth: 1,
    lineHeight: 22,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryBtnDisabled: { backgroundColor: colors.disabled },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineBtnText: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },

  // Picker sheet
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet:   { maxHeight: '60%', borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  pickerHeader:  {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { fontSize: 17, fontWeight: '700' },
  pickerDone:  { fontSize: 16, fontWeight: '600' },
  pickerItem:  { padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
});