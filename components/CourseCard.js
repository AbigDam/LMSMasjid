// components/CourseCard.js
// -----------------------------------------------------------------------------
// A single course/class card on the Teacher Dashboard, showing the info a
// teacher actually uses day to day.
//
// Kept compact on purpose (small chips + tight metadata rows) so several cards
// fit on a mobile screen without heavy scrolling:
//   - header:  icon + title + program + "active" status badge
//   - metrics: Attendance % chip (color-coded) + Needs-review chip
//   - meta:    student count · schedule, then next class · location
//   - action:  View Course Details
//
// Props:
//   course         { title, program, students, schedule, room, status,
//                    attendance, needsReview, nextClass }
//   onViewDetails  () => void   (Phase I: placeholder / console.log)
// -----------------------------------------------------------------------------

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing, radii, fonts, shadow } from '../constants/theme';

// Attendance color: healthy (green) / watch (amber) / low (red).
function attendanceTone(pct) {
  if (pct >= 90) return { fg: colors.success, bg: colors.successBg };
  if (pct >= 75) return { fg: colors.warning, bg: colors.warningBg };
  return { fg: colors.danger, bg: colors.dangerBg };
}

// One small icon + text metadata item (used in the tight meta rows).
function Meta({ icon, children }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={styles.metaText} numberOfLines={1}>{children}</Text>
    </View>
  );
}

export default function CourseCard({ course, onViewDetails }) {
  const isActive = course.status === 'active';
  const att = attendanceTone(course.attendance ?? 0);
  const needs = course.needsReview ?? 0;
  // 0 to review = green "all caught up"; otherwise amber attention chip.
  const reviewTone = needs > 0
    ? { fg: colors.warning, bg: colors.warningBg }
    : { fg: colors.success, bg: colors.successBg };

  return (
    <View style={styles.card}>
      {/* Header: icon + title + status badge */}
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name="book-open-variant" size={20} color={colors.primary} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{course.title}</Text>
          {course.program ? (
            <Text style={styles.program} numberOfLines={1}>{course.program}</Text>
          ) : null}
        </View>
        <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
          <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
          <Text style={[styles.badgeText, { color: isActive ? colors.success : colors.textMuted }]}>
            {course.status}
          </Text>
        </View>
      </View>

      {/* Metric chips: attendance + needs review */}
      <View style={styles.chipRow}>
        <View style={[styles.chip, { backgroundColor: att.bg }]}>
          <Ionicons name="stats-chart" size={13} color={att.fg} />
          <Text style={[styles.chipText, { color: att.fg }]}>{course.attendance}% attendance</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: reviewTone.bg }]}>
          <Ionicons
            name={needs > 0 ? 'alert-circle' : 'checkmark-circle'}
            size={13}
            color={reviewTone.fg}
          />
          <Text style={[styles.chipText, { color: reviewTone.fg }]}>
            {needs > 0 ? `${needs} need review` : 'All caught up'}
          </Text>
        </View>
      </View>

      {/* Tight metadata rows (two items per row) */}
      <View style={styles.metaRow}>
        <Meta icon="people-outline">{course.students} students</Meta>
        <Meta icon="time-outline">{course.schedule}</Meta>
      </View>
      <View style={styles.metaRow}>
        <Meta icon="calendar-outline">Next: {course.nextClass}</Meta>
        <Meta icon="location-outline">{course.room}</Meta>
      </View>

      {/* Action */}
      <Pressable
        style={({ pressed }) => [styles.detailsBtn, pressed && styles.detailsBtnPressed]}
        onPress={onViewDetails}
      >
        <Text style={styles.detailsBtnText}>View Course Details</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    ...shadow,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  titleWrap: { flex: 1 },
  title: { fontSize: fonts.sizes.subtitle, fontWeight: '800', color: colors.text },
  program: { fontSize: fonts.sizes.caption, color: colors.textMuted, marginTop: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    gap: 5,
  },
  badgeActive: { backgroundColor: colors.successBg },
  badgeInactive: { backgroundColor: '#EEF1F0' },
  dot: { width: 6, height: 6, borderRadius: radii.pill },
  dotActive: { backgroundColor: colors.success },
  dotInactive: { backgroundColor: colors.textMuted },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  // Metric chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  // Compact meta
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  metaText: { fontSize: fonts.sizes.caption, color: colors.textMuted },

  // Action
  detailsBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  detailsBtnPressed: { backgroundColor: colors.primaryDark },
  detailsBtnText: { color: colors.textOnPrimary, fontSize: fonts.sizes.body, fontWeight: '700' },
});
