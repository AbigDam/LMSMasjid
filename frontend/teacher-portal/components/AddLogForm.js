// components/AddLogForm.js
// -----------------------------------------------------------------------------
// Multi-step form for logging a student's recitation session.
//
// Steps (when Present):
//   1 — Attendance
//   2 — Surah, ayah range, session type, grade, behavior
//   3 — Assignments & comments
//
// If the student is Absent or Excused, steps 2 & 3 are skipped and the form
// submits immediately after step 1.
//
// Props:
//   onSubmit    {(log: NewLog) => void}  called with the completed log object
//   initialData {NewLog}                optional — pre-fills all fields (edit mode)
// -----------------------------------------------------------------------------

import { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { quranSurahs } from '../data/quran';
import { colors, spacing, radii } from '../constants/theme';

// Replaces the useTheme hook — mirrors the app's warm cream/bronze palette
// from constants/theme.js.
const theme = {
  background:        colors.background, // '#F7F4EF' warm off-white
  backgroundElement: colors.surface,    // '#FFFFFF' inputs, segments
  text:              colors.text,        // '#2A2118' espresso
};

// ---------------------------------------------------------------------------
// PickerModal — bottom-sheet style list picker
// ---------------------------------------------------------------------------
function PickerModal({ visible, items, labelFn, onSelect, onClose, title }) {
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
// SegmentControl — pill-style toggle for 2–3 options
// ---------------------------------------------------------------------------
function SegmentControl({ options, value, onChange, theme }) {
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
// Small reusable sub-components
// ---------------------------------------------------------------------------
function SectionLabel({ text }) {
  return <Text style={s.label}>{text}</Text>;
}

function PrimaryButton({ label, onPress, disabled = false }) {
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

function OutlineButton({ label, onPress }) {
  return (
    <TouchableOpacity style={s.outlineBtn} onPress={onPress}>
      <Text style={s.outlineBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// AddLogForm
// ---------------------------------------------------------------------------
export function AddLogForm({ onSubmit, initialData, skipAttendanceStep = false }) {
  const [currentStep, setCurrentStep] = useState(skipAttendanceStep ? 2 : 1);
  const [attendance, setAttendance]   = useState(initialData?.attendance ?? 'Present');

  const initialSurahObj = initialData?.surah
    ? quranSurahs.find(s => s.number === initialData.surah) ?? null
    : null;

  const [selectedSurah, setSelectedSurah] = useState(initialSurahObj);
  const [ayahStart, setAyahStart]         = useState(initialData?.ayahStart ?? null);
  const [ayahEnd, setAyahEnd]             = useState(initialData?.ayahEnd ?? null);
  const [readingType, setReadingType]     = useState(initialData?.type ?? 'Memorization');
  const [selectedGrade, setGrade]         = useState(initialData?.grade ?? 'pass');
  const [behavior, setBehavior]           = useState(initialData?.behavior ?? 5);
  const [assignments, setAssignments]     = useState(initialData?.assignments ?? '');
  const [ranges, setRanges]                 = useState(initialData?.ranges ?? []);

  const [surahModalVisible,     setSurahModalVisible]     = useState(false);
  const [startAyahModalVisible, setStartAyahModalVisible] = useState(false);
  const [endAyahModalVisible,   setEndAyahModalVisible]   = useState(false);

  const ayahStartOptions = selectedSurah
    ? Array.from({ length: selectedSurah.ayahs }, (_, i) => i + 1)
    : [];
  const ayahEndOptions = selectedSurah && ayahStart
    ? Array.from({ length: selectedSurah.ayahs - ayahStart + 1 }, (_, i) => ayahStart + i)
    : selectedSurah
    ? Array.from({ length: selectedSurah.ayahs }, (_, i) => i + 1)
    : [];

  const isAbsent = attendance === 'Absent' || attendance === 'Excused Absence';
  const canStep2 = ranges.length > 0;


  const canAddRange = selectedSurah !== null && ayahStart !== null && ayahEnd !== null;

  const handleAddRange = () => {
    if (!canAddRange) return;

    setRanges(prev => [
      {
        log_type: readingType === 'Memorization' ? 1 : 2,
        passed: selectedGrade === 'pass',
        surah: selectedSurah?.number,
        surahName: selectedSurah?.name,
        ayah_init: ayahStart,
        ayah_final: ayahEnd,
      },
      ...prev,
    ]);

    // Clear the inputs so the sub-section is ready for another range.
    setSelectedSurah(null);
    setAyahStart(null);
    setAyahEnd(null);
    setReadingType('Memorization');
    setGrade('pass');
  };

  const removeRange = (index) => {
    setRanges(prev => prev.filter((_, i) => i !== index));
  };

  function handleNext() {
    if (currentStep === 1) { isAbsent ? handleSubmit() : setCurrentStep(2); }
    else if (currentStep === 2 && canStep2) { setCurrentStep(3); }
  }

  function handleBack() {
    if (currentStep === 2 && !skipAttendanceStep) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  }

  function handleSubmit() {
    onSubmit({
      attendance,
      behavior,
      type: readingType,
      comments: assignments.trim() || undefined,
      ranges: ranges,
      
    });

    // Reset to defaults after submission.
    setSelectedSurah(null); setAyahStart(null); setAyahEnd(null);
    setReadingType('Memorization'); setBehavior(5);
    setAttendance('Present'); setGrade('pass');
    setAssignments(''); setCurrentStep(1);
  }

  // Step progress dots — only shown when there are multiple steps to navigate.
  function StepDots() {
    return (
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
  }

  return (
    <View>
      {!isAbsent && <StepDots />}

      {/* ── STEP 1: Attendance ── */}
      {currentStep === 1 && (
        <View>
          <SectionLabel text="Attendance" />
          <SegmentControl
            options={[
              { label: 'Present',  value: 'Present' },
              { label: 'Absent',   value: 'Absent' },
              { label: 'Excused',  value: 'Excused Absence' },
            ]}
            value={attendance}
            onChange={setAttendance}
            theme={theme}
          />
          <PrimaryButton
            label={isAbsent ? (initialData ? 'Save Changes' : 'Submit Log') : 'Next →'}
            onPress={() => {
              handleNext();
              if (isAbsent) 
                alert("Log has been submitted successfully!");
            }}
          />
        </View>
      )}

     {/* ── STEP 2: Surah + ayah range + type + grade + behavior ── */}
      {currentStep === 2 && !isAbsent && (
        <View>
          {/* ── Added ranges list ── */}
          {ranges.length > 0 && (
            <View style={{ marginBottom: spacing.md }}>
              <SectionLabel text={`Ranges Added (${ranges.length})`} />
              {ranges.map((range, index) => (
                <View
                  key={index}
                  style={[s.rangeCard, { backgroundColor: theme.backgroundElement, borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rangeCardTitle, { color: theme.text }]}>
                      {range.surahName ?? `Surah ${range.surah}`} · {range.ayah_init}-{range.ayah_final}
                    </Text>
                    <Text style={[s.rangeCardSubtitle, { color: colors.textMuted }]}>
                      {range.log_type === 1 ? 'Memorization' : 'Review'} · {range.passed ? 'Pass ✓' : 'Fail ✗'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={s.rangeCardRemove}
                    onPress={() => removeRange(index)}
                    hitSlop={8}
                  >
                    <Text style={s.rangeCardRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* ── New range entry sub-section ── */}
          <View style={[s.rangeFormBox, { borderColor: colors.border }]}>
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
              options={[{ label: 'Memorization', value: 'Memorization' }, { label: 'Review', value: 'Review' }]}
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

            <TouchableOpacity
              style={[s.addRangeBtn, !canAddRange && s.addRangeBtnDisabled]}
              onPress={handleAddRange}
              disabled={!canAddRange}
            >
              <Text style={[s.addRangeBtnText, !canAddRange && s.addRangeBtnTextDisabled]}>+ Add Range</Text>
            </TouchableOpacity>
          </View>

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
            {!skipAttendanceStep && <OutlineButton label="← Back" onPress={handleBack} />}
            <View style={{ flex: 2 }}>
              <PrimaryButton label="Next →" onPress={handleNext} disabled={!canStep2} />
            </View>
          </View>
        </View>
      )}

      {/* ── STEP 3: Assignments & comments ── */}
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
                onPress={() => {
                  handleSubmit();
                }}
              />
            </View>
          </View>
        </View>
      )}

      {/* ── Pickers ── */}
      <PickerModal
        visible={surahModalVisible}
        items={quranSurahs.toReversed()}
        labelFn={s2 => `${s2.number}. ${s2.name}`}
        onSelect={s2 => { setSelectedSurah(s2); setAyahStart(null); setAyahEnd(null); }}
        onClose={() => setSurahModalVisible(false)}
        title="Select Surah"
      />
      <PickerModal
        visible={startAyahModalVisible}
        items={ayahStartOptions}
        labelFn={n => String(n)}
        onSelect={n => { setAyahStart(n); setAyahEnd(null); }}
        onClose={() => setStartAyahModalVisible(false)}
        title="Select Starting Ayah"
      />
      <PickerModal
        visible={endAyahModalVisible}
        items={ayahEndOptions}
        labelFn={n => String(n)}
        onSelect={setAyahEnd}
        onClose={() => setEndAyahModalVisible(false)}
        title="Select Ending Ayah"
      />
    </View>
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
  segment:      { flexDirection: 'row', borderRadius: radii.lg, padding: 4 },
  segmentBtn:   { flex: 1, paddingVertical: 10, borderRadius: radii.md, alignItems: 'center' },
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

  // Multi-range: bordered sub-section for entering a new range
  rangeFormBox: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  addRangeBtn: {
    marginTop: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.lg,
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
  },
  addRangeBtnDisabled: { backgroundColor: colors.disabled },
  addRangeBtnText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  addRangeBtnTextDisabled: { color: colors.textMuted },

  // Multi-range: list of already-added ranges
  rangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rangeCardTitle: { fontSize: 15, fontWeight: '700' },
  rangeCardSubtitle: { fontSize: 13, marginTop: 2 },
  rangeCardRemove: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  rangeCardRemoveText: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },

  // Behavior score buttons
  behaviorRow: { flexDirection: 'row', gap: spacing.sm },
  behaviorBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  behaviorLabel: { fontSize: 16, fontWeight: '700' },

  // Assignments text area
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
  primaryBtn:         { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center', marginTop: spacing.lg },
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

  // Picker bottom sheet
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