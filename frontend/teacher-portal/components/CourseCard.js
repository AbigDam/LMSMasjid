// components/CourseCard.js
// -----------------------------------------------------------------------------
// A single course/class card shown on the Teacher Dashboard.
// Displays the class title, student count, schedule, an "active" status badge,
// and a "View Course Details" action.
//
// Props:
//   course         { title, students, schedule, status }
//   onViewDetails  () => void   (Phase I: placeholder / console.log)
// -----------------------------------------------------------------------------

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing, radii, fonts, shadow } from '../constants/theme';

export default function CourseCard({ course, onViewDetails }) {
  const isActive = course.status === 'active';

  return (
    <View style={styles.card}>
      {/* Top row: icon + title + status badge */}
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name="book-open-variant" size={22} color={colors.primary} />
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {course.title}
          </Text>
          {course.program ? (
            <Text style={styles.program} numberOfLines={1}>
              {course.program}
            </Text>
          ) : null}
        </View>

        {/* "active" status pill */}
        <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
          <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
          <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
            {course.status}
          </Text>
        </View>
      </View>

      {/* Meta rows: students + schedule, each with an icon for quick scanning */}
      <View style={styles.metaRow}>
        <Ionicons name="people-outline" size={16} color={colors.textMuted} />
        <Text style={styles.metaText}>{course.students} students</Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
        <Text style={styles.metaText}>{course.schedule}</Text>
      </View>
      {course.room ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <Text style={styles.metaText}>{course.room}</Text>
        </View>
      ) : null}

      {/* Primary action */}
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
    maxWidth: 360, // cards stay a comfortable size and wrap into a grid on wide screens
    ...shadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  titleWrap: { flex: 1 },
  title: {
    fontSize: fonts.sizes.subtitle,
    fontWeight: '800',
    color: colors.text,
  },
  program: {
    fontSize: fonts.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    gap: 5,
  },
  badgeActive: { backgroundColor: colors.successBg },
  badgeInactive: { backgroundColor: '#EEF1F0' },
  dot: { width: 7, height: 7, borderRadius: radii.pill },
  dotActive: { backgroundColor: colors.success },
  dotInactive: { backgroundColor: colors.textMuted },
  badgeText: {
    fontSize: fonts.sizes.caption,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  badgeTextActive: { color: colors.success },
  badgeTextInactive: { color: colors.textMuted },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaText: {
    fontSize: fonts.sizes.body,
    color: colors.textMuted,
  },
  detailsBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  detailsBtnPressed: { backgroundColor: colors.primaryDark },
  detailsBtnText: {
    color: colors.textOnPrimary,
    fontSize: fonts.sizes.body,
    fontWeight: '700',
  },
});
