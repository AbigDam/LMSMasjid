// screens/ManageCourses.js
// -----------------------------------------------------------------------------
// Al-Hidaya — Admin: Manage Courses
//
// Loads every class/course and renders each as a CourseCard. Tapping a card
// opens CourseView (read-only detail + Edit entry point). The "Add Course"
// button reuses the existing CreateClassAccountsScreen flow.
//
// Layout/chrome (AdminSidebar, responsive breakpoint, mobile drawer, header)
// mirrors DashboardScreen exactly via the shared useAdminLayout hook, so the
// admin experience is consistent across screens.
//
// Data:
//   GET /select_classes/  → array of course objects
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Animated,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api.js';
import AdminSidebar from '../components/AdminSidebar';
import CourseCard from '../components/CourseCard';
import { brand, brandImages } from '../constants/brand';
import useAdminLayout, { DRAWER_WIDTH } from '../components/useAdminLayout';

const BRONZE_COLORS = {
  bronzeAccent: '#9A6A3C',
  bgCanvas: '#FAF9F6',
  surfaceWhite: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#4B5563',
  borderLight: '#E5E7EB',
};

export default function ManageCourses({ navigation }) {
  const layout = useAdminLayout();
  const { isWide, sidebarVisible, setSidebarVisible, menuOpen, setMenuOpen, translateX, backdrop, admin, handleSignOut } = layout;

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/select_classes/');
      setCourses(response.data ?? []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  function handleNavigateClass(course) {
    navigation.navigate('CourseView', { course });
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
              onNavigate={handleNavigateClass}
              onSignOut={handleSignOut}
              onClose={() => setSidebarVisible(false)}
            />
          </View>
        )}

        {/* Content */}
        <ScrollView contentContainerStyle={styles.scrollCanvas} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleIndicator} />
            <Text style={styles.sectionTitleText}>Manage Courses</Text>
            <View style={{ flex: 1 }} />
            <Pressable
              style={styles.createClassButton}
              onPress={() => navigation.navigate('CreateClassAccounts')}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.createClassButtonText}>Add Course</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={BRONZE_COLORS.bronzeAccent} />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={fetchCourses} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : courses.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="school-outline" size={48} color={BRONZE_COLORS.textMuted} />
              <Text style={styles.emptyText}>No courses yet. Tap "Add Course" to create one.</Text>
            </View>
          ) : (
            <View style={styles.cardGrid}>
              {courses.map((course) => (
                <View key={course.id ?? course._id} style={styles.cardContainer}>
                  <CourseCard
                    course={course}
                    onViewDetails={() => navigation.navigate('CourseView', { course })}
                  />
                </View>
              ))}
            </View>
          )}
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

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  sectionTitleIndicator: { width: 6, height: 28, backgroundColor: '#B45309', borderRadius: 3 },
  sectionTitleText: { fontSize: 22, fontWeight: '700', color: BRONZE_COLORS.textDark },

  createClassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRONZE_COLORS.bronzeAccent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  createClassButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  cardGrid: { gap: 20 },
  cardContainer: { width: '100%' },

  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 48 },
  emptyText: { fontSize: 15, color: BRONZE_COLORS.textMuted, textAlign: 'center' },
  errorText: { fontSize: 15, color: '#DD0505', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: BRONZE_COLORS.bronzeAccent },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  mobileBackdropLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(120, 53, 15, 0.4)' },
  mobileDrawerContainer: { position: 'absolute', top: 62, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: '#FFFFFF' },
});
