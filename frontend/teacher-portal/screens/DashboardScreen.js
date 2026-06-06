// screens/DashboardScreen.js
// -----------------------------------------------------------------------------
// Al-Hidaya Teacher Dashboard (Phase I — mock data only).
//
// RESPONSIVE LAYOUT (driven by screen width, breakpoint = 900px):
//   - Desktop / tablet (>= 900px): the Sidebar is PERSISTENT on the left.
//   - Mobile (< 900px): the Sidebar is HIDDEN. A hamburger button in the top
//     bar opens it as a slide-out drawer (with a dim backdrop). Tapping a class,
//     the ✕, or outside the drawer closes it. The main content (greeting, stats,
//     prayer times, course cards, announcements) is fully visible either way.
//
// The classes also appear as CourseCards in the main content, so they're never
// hidden behind the drawer on mobile.
//
// Works on iOS, Android, and Web.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Animated,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import Sidebar from '../components/Sidebar';
import CourseCard from '../components/CourseCard';
import {
  mockCourses,
  mockTeacher,
  mockPrayerTimes,
  mockAnnouncements,
} from '../data/mockData';
import { brand, brandImages } from '../constants/brand';
import { colors, spacing, radii, fonts, shadow } from '../constants/theme';

const WIDE_BREAKPOINT = 900;
const DRAWER_WIDTH = 224; // matches the Sidebar's own width

// Quick-stat tile. Two layouts:
//   - desktop: roomy horizontal card (icon beside value)
//   - mobile (compact): tight vertical card so all 3 fit in one row
function StatCard({ icon, value, label, compact }) {
  if (compact) {
    return (
      <View style={styles.statCardCompact}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
        <Text style={styles.statValueCompact} numberOfLines={1}>{value}</Text>
        <Text style={styles.statLabelCompact} numberOfLines={1}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  // Mobile drawer state + slide/fade animation.
  const [menuOpen, setMenuOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isWide) return; // no drawer animation needed on desktop
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: menuOpen ? 0 : -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: menuOpen ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [menuOpen, isWide, translateX, backdrop]);

  // Close the drawer whenever we switch to the wide layout.
  useEffect(() => {
    if (isWide) setMenuOpen(false);
  }, [isWide]);

  // Derived mock stats.
  const totalStudents = mockCourses.reduce((sum, c) => sum + c.students, 0);
  const classCount = mockCourses.length;
  const nextClass = mockCourses[0];

  function handleSignOut() {
    // TODO (Django auth): clear the stored token (SecureStore) before leaving.
    navigation.replace('Login');
  }

  function handleNavigateClass(course) {
    // Placeholder — class pages are owned by teammates in a later phase.
    console.log('TODO: open class page for', course.title);
    setMenuOpen(false); // tapping a class closes the mobile drawer
  }

  function handleViewDetails(course) {
    // Placeholder — Course Details page is out of scope for FE-1.
    console.log('TODO: View Course Details for', course.title);
  }

  // Prayer strip is shared; on desktop it sits above My Courses, on mobile it
  // moves BELOW My Courses so course cards are visible sooner (less scrolling).
  const prayerBlock = (
    <View style={styles.prayerStrip}>
      <View style={styles.prayerHeader}>
        <MaterialCommunityIcons name="mosque" size={16} color={colors.primary} />
        <Text style={styles.prayerHeaderText}>Today's Iqama Times</Text>
      </View>
      <View style={styles.prayerItems}>
        {mockPrayerTimes.map((p) => (
          <View key={p.name} style={styles.prayerItem}>
            <Text style={styles.prayerName}>{p.name}</Text>
            <Text style={styles.prayerTime}>{p.iqama}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.row}>
        {/* Persistent sidebar — desktop / tablet only */}
        {isWide ? (
          <Sidebar
            courses={mockCourses}
            activeId={mockCourses[0]?.id}
            onNavigate={handleNavigateClass}
            onSignOut={handleSignOut}
          />
        ) : null}

        {/* Main content */}
        <View style={styles.main}>
          {/* Mobile top bar with hamburger */}
          {!isWide ? (
            <View style={styles.topBar}>
              <Pressable
                onPress={() => setMenuOpen(true)}
                hitSlop={8}
                style={styles.menuBtn}
                accessibilityRole="button"
                accessibilityLabel="Open menu"
              >
                <Ionicons name="menu" size={26} color={colors.text} />
              </Pressable>
              <Image source={brandImages.logo} style={styles.topLogo} resizeMode="contain" />
              <Text style={styles.topBarTitle}>{brand.shortName}</Text>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={[styles.scroll, !isWide && styles.scrollCompact]}>
            {/* Greeting header */}
            <View style={styles.headerCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.salaam}>Assalamu 'alaikum, {mockTeacher.name}</Text>
                <Text style={styles.headerSub}>{brand.name} · Dashboard</Text>
              </View>
              <View style={styles.headerBadge}>
                <Ionicons name="school-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.headerBadgeText}>{brand.portal}</Text>
              </View>
            </View>

            {/* Quick stats — compact single row of 3 on mobile */}
            <View style={[styles.statsRow, !isWide && styles.statsRowCompact]}>
              <StatCard
                compact={!isWide}
                icon="account-group-outline"
                value={totalStudents}
                label={isWide ? 'Total students' : 'Students'}
              />
              <StatCard
                compact={!isWide}
                icon="book-open-page-variant-outline"
                value={classCount}
                label={isWide ? 'Active classes' : 'Classes'}
              />
              <StatCard
                compact={!isWide}
                icon="clock-outline"
                value={nextClass?.schedule?.split(' - ')[0] ?? '—'}
                label={isWide ? `Next: ${nextClass?.title ?? ''}` : 'Next class'}
              />
            </View>

            {/* Desktop: prayer times above courses */}
            {isWide ? prayerBlock : null}

            {/* My Courses */}
            <View style={styles.sectionHeader}>
              <Text style={styles.h2}>My Courses</Text>
              <Text style={styles.subtext}>Manage and track your teaching courses</Text>
            </View>
            <View style={styles.cardGrid}>
              {mockCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onViewDetails={() => handleViewDetails(course)}
                />
              ))}
            </View>

            {/* Mobile: prayer times below courses (courses get priority) */}
            {!isWide ? prayerBlock : null}

            {/* Announcements */}
            <View style={styles.sectionHeader}>
              <Text style={styles.h2}>Community Announcements</Text>
              <Text style={styles.subtext}>Latest from {brand.name}</Text>
            </View>
            <View style={styles.announceList}>
              {mockAnnouncements.map((a) => (
                <View key={a.id} style={styles.announceCard}>
                  <View style={styles.announceIcon}>
                    <Ionicons name={a.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.announceTop}>
                      <Text style={styles.announceTitle}>{a.title}</Text>
                      <Text style={styles.announceDate}>{a.date}</Text>
                    </View>
                    <Text style={styles.announceDetail}>{a.detail}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Contact footer */}
            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.footerText}>{brand.address}</Text>
              </View>
              <View style={styles.footerRow}>
                <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                <Text style={styles.footerText}>{brand.phone}</Text>
                <Ionicons name="mail-outline" size={14} color={colors.textMuted} style={{ marginLeft: spacing.md }} />
                <Text style={styles.footerText}>{brand.email}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Mobile slide-out drawer overlay */}
      {!isWide ? (
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents={menuOpen ? 'auto' : 'none'}
        >
          {/* Dim backdrop — tap outside to close */}
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          </Animated.View>

          {/* The drawer itself slides in from the left */}
          <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
            <Sidebar
              courses={mockCourses}
              activeId={mockCourses[0]?.id}
              onNavigate={handleNavigateClass}
              onSignOut={handleSignOut}
              onClose={() => setMenuOpen(false)}
            />
          </Animated.View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  row: { flex: 1, flexDirection: 'row' },
  main: { flex: 1 },

  // Mobile top bar
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
  menuBtn: { padding: spacing.xs },
  topLogo: { width: 28, height: 26, marginLeft: spacing.xs },
  topBarTitle: { fontSize: fonts.sizes.subtitle, fontWeight: '800', color: colors.text },

  scroll: {
    padding: spacing.xl,
    maxWidth: 1100, // keeps content readable on big monitors
    width: '100%',
    alignSelf: 'center',
  },
  scrollCompact: { padding: spacing.lg }, // tighter page padding on mobile

  // Header
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow,
  },
  salaam: { fontSize: fonts.sizes.heading, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: fonts.sizes.body, color: colors.textMuted, marginTop: spacing.xs },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  headerBadgeText: { color: colors.primaryDark, fontWeight: '700', fontSize: fonts.sizes.caption },

  // Stats (desktop)
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flexGrow: 1,
    flexBasis: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: fonts.sizes.title, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: fonts.sizes.caption, color: colors.textMuted },

  // Stats (mobile compact) — 3 tight columns in one row
  statsRowCompact: { flexWrap: 'nowrap', gap: spacing.sm },
  statCardCompact: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0, // lets numberOfLines truncate instead of overflowing
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-start',
    gap: 2,
  },
  statValueCompact: { fontSize: fonts.sizes.subtitle, fontWeight: '800', color: colors.text },
  statLabelCompact: { fontSize: 11, color: colors.textMuted },

  // Prayer strip
  prayerStrip: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  prayerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  prayerHeaderText: {
    fontSize: fonts.sizes.caption,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  prayerItems: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md },
  prayerItem: {
    alignItems: 'center',
    flexGrow: 1,
    minWidth: 56,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
  },
  prayerName: { fontSize: fonts.sizes.caption, color: colors.primaryDark, fontWeight: '600' },
  prayerTime: { fontSize: fonts.sizes.body, color: colors.text, fontWeight: '800', marginTop: 2 },

  // Sections
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.lg },
  h2: { fontSize: fonts.sizes.title, fontWeight: '800', color: colors.text },
  subtext: { fontSize: fonts.sizes.body, color: colors.textMuted, marginTop: spacing.xs },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },

  // Announcements
  announceList: { gap: spacing.md },
  announceCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: spacing.lg,
  },
  announceIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  announceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  announceTitle: { fontSize: fonts.sizes.subtitle, fontWeight: '700', color: colors.text, flex: 1 },
  announceDate: { fontSize: fonts.sizes.caption, color: colors.primary, fontWeight: '700' },
  announceDetail: { fontSize: fonts.sizes.body, color: colors.textMuted, marginTop: 2 },

  // Footer
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  footerText: { fontSize: fonts.sizes.caption, color: colors.textMuted },

  // Mobile drawer overlay
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 14, 8, 0.55)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    ...shadow,
  },
});
