// screens/EditClass.js
// -----------------------------------------------------------------------------
// Al-Hidaya — Admin: Edit Class
//
// Opened from CourseView's Edit button. Same field set as
// CreateClassAccountsScreen's "Class Details" section (class name, program,
// schedule, room) — pre-filled from the course passed via navigation params.
//
// Layout/chrome (AdminSidebar, responsive breakpoint, mobile drawer, header)
// mirrors DashboardScreen via the shared useAdminLayout hook.
//
// NOTE: There's no update-course endpoint yet. handleSubmit below calls a
// placeholder PATCH /edit_class/<id>/ — swap the URL once the real route
// exists. Everything else (validation, loading state, error handling) is
// already wired up.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api.js';
import AdminSidebar from '../components/AdminSidebar';
import { brand, brandImages } from '../constants/brand';
import useAdminLayout, { DRAWER_WIDTH } from '../components/useAdminLayout';

const BRONZE_COLORS = {
  bronzeAccent: '#9A6A3C',
  bronzeBright: '#B45309',
  bgCanvas: '#FAF9F6',
  surfaceWhite: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#4B5563',
  borderLight: '#E5E7EB',
  danger: '#DD0505',
};

export default function EditClass({ route, navigation }) {
  const { course } = route.params;

  const layout = useAdminLayout();
  const { isWide, sidebarVisible, setSidebarVisible, menuOpen, setMenuOpen, translateX, backdrop, admin, courses, handleSignOut } = layout;

  const [className, setClassName] = useState(course.title ?? course.name ?? '');
  const [program, setProgram] = useState(course.program ?? '');
  const [schedule, setSchedule] = useState(course.schedule ?? '');
  const [room, setRoom] = useState(course.room ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const newErrors = {};
    if (!className.trim()) newErrors.className = 'Class name is required.';
    if (!program.trim()) newErrors.program = 'Program is required.';
    if (!schedule.trim()) newErrors.schedule = 'Schedule is required.';
    if (!room.trim()) newErrors.room = 'Room is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);

    const payload = {
      class_name: className.trim(),
      program: program.trim(),
      schedule: schedule.trim(),
      room: room.trim(),
    };

    try {
      // PLACEHOLDER endpoint — update once the backend route exists.
      await api.patch(`/edit_class/${course.id}/`, payload);
      Alert.alert('Saved', 'Course details updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error(err?.response?.data || err);
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Could not save changes. Please try again.';
      Alert.alert('Something went wrong', message);
    } finally {
      setSubmitting(false);
    }
  }

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
        <ScrollView contentContainerStyle={styles.scrollCanvas} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionHeaderRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginRight: 4 }}>
              <Ionicons name="chevron-back" size={24} color={BRONZE_COLORS.textDark} />
            </Pressable>
            <View style={styles.sectionTitleIndicator} />
            <Text style={styles.sectionTitleText}>Edit Class</Text>
          </View>

          <View style={styles.contentMaxWidth}>
            <View style={styles.card}>
              <Field
                label="Class Name"
                value={className}
                onChangeText={setClassName}
                placeholder="e.g. Quran Memorization A"
                error={errors.className}
              />
              <Field
                label="Program"
                value={program}
                onChangeText={setProgram}
                placeholder="e.g. Weekend Hifz Program"
                error={errors.program}
              />
              <View style={styles.row2}>
                <View style={styles.row2Item}>
                  <Field
                    label="Schedule"
                    value={schedule}
                    onChangeText={setSchedule}
                    placeholder="e.g. Sat 10am–12pm"
                    error={errors.schedule}
                  />
                </View>
                <View style={styles.row2Item}>
                  <Field
                    label="Room"
                    value={room}
                    onChangeText={setRoom}
                    placeholder="e.g. Room 204"
                    error={errors.room}
                  />
                </View>
              </View>
            </View>

            <Pressable
              style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              )}
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

function Field({ label, error, ...inputProps }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, error && styles.fieldInputError]}
        placeholderTextColor="#9CA3AF"
        {...inputProps}
      />
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
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

  scrollCanvas: { padding: 32, maxWidth: 1200, width: '100%', alignSelf: 'center', paddingBottom: 48 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, maxWidth: 700, width: '100%', alignSelf: 'center' },
  sectionTitleIndicator: { width: 6, height: 24, backgroundColor: BRONZE_COLORS.bronzeBright, borderRadius: 3 },
  sectionTitleText: { fontSize: 20, fontWeight: '700', color: BRONZE_COLORS.textDark },

  contentMaxWidth: { maxWidth: 700, width: '100%', alignSelf: 'center' },

  card: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 20,
    marginBottom: 28,
  },

  row2: { flexDirection: 'row', gap: 16 },
  row2Item: { flex: 1 },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: BRONZE_COLORS.textMuted, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: BRONZE_COLORS.textDark,
    backgroundColor: BRONZE_COLORS.bgCanvas,
  },
  fieldInputError: { borderColor: BRONZE_COLORS.danger },
  fieldErrorText: { color: BRONZE_COLORS.danger, fontSize: 12, marginTop: 4 },

  primaryButton: {
    backgroundColor: BRONZE_COLORS.bronzeBright,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  mobileBackdropLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(120, 53, 15, 0.4)' },
  mobileDrawerContainer: { position: 'absolute', top: 62, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: '#FFFFFF' },
});
