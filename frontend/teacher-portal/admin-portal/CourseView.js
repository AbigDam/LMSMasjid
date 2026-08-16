// screens/CourseView.js
// -----------------------------------------------------------------------------
// Al-Hidaya — Admin: Course View (detail)
//
// Read-only detail screen opened from a CourseCard tap on ManageCourses.
// Shows the course info and links to:
//   - EditClass       (edit button)
//   - StudentRoster   (existing roster screen — closely related to a course
//                       detail page; remove this block if you don't want it)
//
// Layout/chrome (AdminSidebar, responsive breakpoint, mobile drawer, header)
// mirrors DashboardScreen via the shared useAdminLayout hook.
//
// NOTE: There's no single-course-detail API yet, so this screen works off
// the `course` object passed via navigation params from ManageCourses. Swap
// the placeholder useEffect below for a real GET /select_class/<id>/ call
// once that endpoint exists.
// -----------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react';
import { View, Text, Image, ScrollView, Pressable, Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AdminSidebar from '../components/AdminSidebar';
import { brand, brandImages } from '../constants/brand';
import useAdminLayout, { DRAWER_WIDTH } from '../components/useAdminLayout';
import api from '../api.js';

const BRONZE_COLORS = {
  bronzeAccent: '#9A6A3C',
  bronzeBright: '#B45309',
  bgCanvas: '#FAF9F6',
  surfaceWhite: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#4B5563',
  borderLight: '#E5E7EB',
  successBg: '#E6F2EB',
  successText: '#2E8B57',
};

export default function CourseView({ route, navigation }) {
  const { course: initialCourse } = route.params;
  const [course, setCourse] = useState(initialCourse);
  const [teacherName, setTeacherName] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const layout = useAdminLayout();
  const { isWide, sidebarVisible, setSidebarVisible, menuOpen, setMenuOpen, translateX, backdrop, admin, courses, handleSignOut } = layout;

  // PLACEHOLDER: no GET-single-course endpoint yet. Once the backend adds
  // one (e.g. GET /select_class/<id>/), fetch it here on mount so this
  // screen reflects edits made elsewhere:
  //
  // useEffect(() => {
  //   async function refresh() {
  //     try {
  //       const response = await api.get(`/select_class/${course.id}/`);
  //       setCourse(response.data);
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   }
  //   refresh();
  // }, []);

  // const teacherName =
  //   course.teachers ??
  //   (typeof course.teacher === 'string'
  //     ? course.teacher
  //     : course.teacher && (course.teacher.first_name || course.teacher.last_name)
  //     ? `${course.teacher.first_name ?? ''} ${course.teacher.last_name ?? ''}`.trim()
  //     : null) ??
  //   course.teachers;

  const teacherIds = course.teachers ?? [];

  const fetchTeacherDetails = useCallback(async () => {
    if (teacherIds.length === 0) {
      setTeacherName('Unassigned');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const responses = await Promise.all(
        teacherIds.map((id) => {
        return api.get(`/admin/teacher/${id}/`);
        })
      );
      const names = responses.map((res) =>
        `${res.data.first_name ?? ''} ${res.data.last_name ?? ''}`.trim()
      );
      setTeacherName(names.join(', '));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load teacher details.');
    } finally {
      setLoading(false);
    }
  }, [teacherIds.join(',')]);

  useEffect(() => {
  fetchTeacherDetails();
  }, [fetchTeacherDetails]);

  const isActive = course.status === 'active';

  function handleNavigateClass(nextCourse) {
    navigation.navigate('CourseView', { course: nextCourse });
    setMenuOpen(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {/* Top Header Bar */}
      <View style={styles.hubHeader}>
        <View style={styles.headerLeft}>
          {isWide ? (
            <Pressable
              onPress={() => setSidebarVisible(!sidebarVisible)}
              style={styles.menuIconButton}
              hitSlop={12}
            >
              <Ionicons name={sidebarVisible ? 'close' : 'menu'} size={28} color={BRONZE_COLORS.bronzeAccent} />
            </Pressable>
          ) : (
            <Pressable onPress={() => setMenuOpen(true)} style={styles.menuIconButton} hitSlop={12}>
              <Ionicons name="menu" size={28} color={BRONZE_COLORS.bronzeAccent} />
            </Pressable>
          )}
          <Image source={brandImages.logo} style={styles.hubLogo} resizeMode="contain" />
          <Text style={styles.hubTitle}>{brand.name}</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.adminBadgeContainer}>
            <View style={styles.onlineDot} />
            <Text style={styles.adminBadgeText}>{admin?.first_name} {admin?.last_name}</Text>
          </View>
          <Pressable onPress={handleSignOut} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.mainLayout}>
        {/* Desktop AdminSidebar */}
        {isWide && sidebarVisible && (
          <View style={styles.desktopNavWrapper}>
            <AdminSidebar
              courses={courses}
              activeId={course.id}
              onNavigate={handleNavigateClass}
              onSignOut={handleSignOut}
              onClose={() => setSidebarVisible(false)}
            />
          </View>
        )}

        {/* Content */}
        <ScrollView contentContainerStyle={styles.scrollCanvas} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeaderRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginRight: 4 }}>
              <Ionicons name="chevron-back" size={24} color={BRONZE_COLORS.textDark} />
            </Pressable>
            <View style={styles.sectionTitleIndicator} />
            <Text style={styles.sectionTitleText} numberOfLines={1}>
              {course.title ?? course.name ?? 'Course'}
            </Text>
            <View style={{ flex: 1 }} />
            <Pressable
              style={styles.editIconBtn}
              onPress={() => navigation.navigate('EditClass', { course })}
            >
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
              <Text style={styles.editIconBtnText}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.contentMaxWidth}>
            {/* Title card */}
            <View style={styles.titleCard}>
              <View style={styles.titleRow}>
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons name="book-open-variant" size={28} color={BRONZE_COLORS.bronzeAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseTitle}>{course.title ?? course.name}</Text>
                  {course.program ? <Text style={styles.courseProgram}>{course.program}</Text> : null}
                </View>
                <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, { color: isActive ? BRONZE_COLORS.successText : BRONZE_COLORS.textMuted }]}>
                    {course.status ?? 'unknown'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Info list */}
            <View style={styles.infoCard}>
              <InfoRow icon="person-outline" label="Teacher" value={teacherName} />
              <InfoRow icon="people-outline" label="Registered Students" value={String(course.students ?? '—')} />
              <InfoRow icon="time-outline" label="Schedule" value={course.schedule ?? '—'} />
              <InfoRow icon="location-outline" label="Room" value={course.room ?? '—'} last />
            </View>

            {/* Actions */}
            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.navigate('EditClass', { course })}
            >
              <Ionicons name="pencil" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Edit Course</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('AdminStudentRoster', { course })}
            >
              <Ionicons name="people-outline" size={18} color={BRONZE_COLORS.bronzeAccent} />
              <Text style={styles.secondaryButtonText}>View Student Roster</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* Slide-out Mobile Drawer */}
      {!isWide && (
        <View style={StyleSheet.absoluteFill} pointerEvents={menuOpen ? 'auto' : 'none'}>
          <Animated.View style={[styles.mobileBackdropLayer, { opacity: backdrop }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          </Animated.View>

          <Animated.View style={[styles.mobileDrawerContainer, { transform: [{ translateX }] }]}>
            <AdminSidebar
              courses={courses}
              activeId={course.id}
              onNavigate={handleNavigateClass}
              onSignOut={handleSignOut}
              onClose={() => setMenuOpen(false)}
            />
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Ionicons name={icon} size={18} color={BRONZE_COLORS.textMuted} style={{ marginRight: 12 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRONZE_COLORS.bronzeAccent },
  mainLayout: { flex: 1, flexDirection: 'row', backgroundColor: BRONZE_COLORS.bgCanvas },
  desktopNavWrapper: { width: DRAWER_WIDTH, backgroundColor: '#ffffff', borderRightWidth: 1, borderRightColor: BRONZE_COLORS.borderLight },

  hubHeader: {
    height: 76,
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 4,
    borderBottomColor: BRONZE_COLORS.bronzeAccent,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconButton: { padding: 4, marginRight: 4, justifyContent: 'center', alignItems: 'center' },
  hubLogo: { width: 46, height: 46, borderRadius: 10 },
  hubTitle: { fontSize: 20, fontWeight: '700', color: BRONZE_COLORS.textDark, letterSpacing: 0.3 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  adminBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(243, 133, 6, 0.18)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, gap: 10 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#01885b' },
  adminBadgeText: { color: '#0f0f0f', fontSize: 16, fontWeight: '600' },
  logoutButton: { padding: 8, backgroundColor: 'rgb(221, 5, 5)', borderRadius: 8 },

  scrollCanvas: { padding: 32, maxWidth: 1200, width: '100%', alignSelf: 'center' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, maxWidth: 700, width: '100%', alignSelf: 'center' },
  sectionTitleIndicator: { width: 6, height: 24, backgroundColor: BRONZE_COLORS.bronzeBright, borderRadius: 3 },
  sectionTitleText: { fontSize: 20, fontWeight: '700', color: BRONZE_COLORS.textDark, flexShrink: 1 },

  editIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRONZE_COLORS.bronzeAccent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  editIconBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  contentMaxWidth: { maxWidth: 700, width: '100%', alignSelf: 'center' },

  titleCard: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 20,
    marginBottom: 20,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBadge: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  courseTitle: { fontSize: 20, fontWeight: '800', color: BRONZE_COLORS.textDark },
  courseProgram: { fontSize: 12, fontWeight: '600', color: BRONZE_COLORS.bronzeBright, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  badgeActive: { backgroundColor: BRONZE_COLORS.successBg },
  badgeInactive: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  infoCard: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    marginBottom: 24,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  infoRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BRONZE_COLORS.borderLight },
  infoLabel: { fontSize: 14, color: BRONZE_COLORS.textMuted, width: 150 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '600', color: BRONZE_COLORS.textDark, textAlign: 'right' },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRONZE_COLORS.bronzeAccent,
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.bronzeAccent,
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 32,
  },
  secondaryButtonText: { color: BRONZE_COLORS.bronzeAccent, fontWeight: '700', fontSize: 15 },

  mobileBackdropLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(120, 53, 15, 0.4)' },
  mobileDrawerContainer: { position: 'absolute', top: 62, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: '#FFFFFF' },
});