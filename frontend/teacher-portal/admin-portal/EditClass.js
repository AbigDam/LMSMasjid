// screens/EditClass.js
// -----------------------------------------------------------------------------
// Al-Hidaya — Admin: Edit Class
//
// Opened from CourseView's Edit button. Editable fields: class name, program,
// schedule, room, status (active/inactive toggle), and teacher assignment
// (checklist against GET /admin/teachers/) — pre-filled from the course
// passed via navigation params, and saved via PATCH /edit_class/<id>/.
// Also supports deleting the course (with a confirmation prompt) via
// DELETE /edit_class/<id>/. See backend/edit_class_view.py for the matching
// Django view/serializer.
//
// Layout/chrome (AdminSidebar, responsive breakpoint, mobile drawer, header)
// mirrors DashboardScreen via the shared useAdminLayout hook.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api.js';
import AdminSidebar from '../components/AdminSidebar';
import { brand, brandImages } from '../constants/brand';
import { colors, spacing, radii, fonts } from '../constants/theme.js';
import useAdminLayout, { DRAWER_WIDTH } from '../components/useAdminLayout';

// Alert.alert with multiple buttons (Cancel/Delete) isn't implemented by
// react-native-web — it silently no-ops in a browser, which made the delete
// confirmation appear to do nothing. These helpers fall back to the
// browser's native confirm()/alert() on web, and use the real Alert.alert
// on iOS/Android where it works correctly.
function confirmDialog(title, message) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

function notify(title, message, onDismiss) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    onDismiss?.();
  } else {
    Alert.alert(title, message, onDismiss ? [{ text: 'OK', onPress: onDismiss }] : undefined);
  }
}

export default function EditClass({ route, navigation }) {
  const { course } = route.params;

  const layout = useAdminLayout();
  const { isWide, sidebarVisible, setSidebarVisible, menuOpen, setMenuOpen, translateX, backdrop, admin, courses, handleSignOut } = layout;

  const [className, setClassName] = useState(course.title ?? course.name ?? '');
  const [program, setProgram] = useState(course.program ?? '');
  const [schedule, setSchedule] = useState(course.schedule ?? '');
  const [room, setRoom] = useState(course.room ?? '');
  const [isActive, setIsActive] = useState(course.status === 'active' || course.status === true);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState({});

  // Teacher assignment — fetch every teacher so the admin can check/uncheck
  // who's assigned. Assumed endpoint: GET /admin/teachers/ (adjust the path
  // below if yours differs). Handles both a bare array response and a
  // paginated { results: [...] } response.
  const [allTeachers, setAllTeachers] = useState([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState(course.teachers ?? []);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState(null);

  const fetchAllTeachers = useCallback(async () => {
    setTeachersLoading(true);
    setTeachersError(null);
    try {
      const response = await api.get('/admin/teachers/');
      const list = Array.isArray(response.data) ? response.data : response.data?.results ?? [];
      setAllTeachers(list);
    } catch (err) {
      console.error(err);
      setTeachersError('Failed to load teacher list.');
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTeachers();
  }, [fetchAllTeachers]);

  function toggleTeacher(teacherId) {
    setSelectedTeacherIds((prev) =>
      prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId]
    );
  }

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
      status: isActive,
      teachers: selectedTeacherIds,
    };

    try {
      await api.patch(`/edit_class/${course.id}/`, payload);
      notify('Saved', 'Course details updated.', () => navigation.goBack());
    } catch (err) {
      console.error(err?.response?.data || err);
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Could not save changes. Please try again.';
      notify('Something went wrong', message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleNavigateClass(nextCourse) {
    navigation.navigate('CourseView', { course: nextCourse });
    setMenuOpen(false);
  }

  async function handleDeletePress() {
    const confirmed = await confirmDialog(
      'Delete Course?',
      `This will permanently delete "${className || course.title || course.name}". This can't be undone.`
    );
    if (confirmed) {
      handleConfirmDelete();
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await api.delete(`/admin/update_class/${course.id}/`);
      navigation.reset({ index: 0, routes: [{ name: 'ManageCourses' }] });
    } catch (err) {
      console.error(err?.response?.data || err);
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Could not delete this course. Please try again.';
      notify('Something went wrong', message);
    } finally {
      setDeleting(false);
    }
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
              <Ionicons name={sidebarVisible ? 'close' : 'menu'} size={28} color={colors.primary} />
            </Pressable>
          ) : (
            <Pressable onPress={() => setMenuOpen(true)} style={styles.menuIconButton} hitSlop={12}>
              <Ionicons name="menu" size={28} color={colors.primary} />
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
            <Ionicons name="log-out-outline" size={26} color={colors.textOnPrimary} />
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
              <Ionicons name="chevron-back" size={24} color={colors.text} />
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

              <View style={styles.statusRow}>
                <View>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <Text style={styles.statusHint}>{isActive ? 'Active' : 'Inactive'}</Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.textOnPrimary}
                />
              </View>
            </View>

            {/* Teachers — check/uncheck to assign or remove. */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Teachers</Text>
              {teachersLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
              ) : teachersError ? (
                <Text style={styles.fieldErrorText}>{teachersError}</Text>
              ) : allTeachers.length === 0 ? (
                <Text style={styles.teacherReadOnlyText}>No teachers found.</Text>
              ) : (
                <View style={{ marginTop: 8, gap: 4 }}>
                  {allTeachers.map((teacher) => {
                    const selected = selectedTeacherIds.includes(teacher.id);
                    const name = `${teacher.first_name ?? ''} ${teacher.last_name ?? ''}`.trim() || teacher.email;
                    return (
                      <Pressable
                        key={teacher.id}
                        onPress={() => toggleTeacher(teacher.id)}
                        style={styles.teacherRow}
                      >
                        <Ionicons
                          name={selected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={selected ? colors.primary : colors.textMuted}
                        />
                        <Text style={styles.teacherRowText}>{name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <Pressable
              style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || deleting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.deleteButton, deleting && styles.primaryButtonDisabled]}
              onPress={handleDeletePress}
              disabled={submitting || deleting}
            >
              {deleting ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={styles.deleteButtonText}>Delete Course</Text>
                </>
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
        placeholderTextColor={colors.placeholder}
        {...inputProps}
      />
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  mainLayout: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  desktopNavWrapper: { width: DRAWER_WIDTH, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border },

  hubHeader: {
    height: 76,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 4,
    borderBottomColor: colors.primary,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconButton: { padding: spacing.xs, marginRight: spacing.xs, justifyContent: 'center', alignItems: 'center' },
  hubLogo: { width: 46, height: 46, borderRadius: radii.sm },
  hubTitle: { fontSize: fonts.sizes.title, fontWeight: '700', color: colors.text, letterSpacing: 0.3 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg + 4 },
  adminBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, gap: spacing.sm },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  adminBadgeText: { color: colors.text, fontSize: fonts.sizes.subtitle, fontWeight: '600' },
  logoutButton: { padding: spacing.sm, backgroundColor: colors.danger, borderRadius: radii.sm },

  scrollCanvas: { padding: 32, maxWidth: 1200, width: '100%', alignSelf: 'center', paddingBottom: 48 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl, maxWidth: 700, width: '100%', alignSelf: 'center' },
  sectionTitleIndicator: { width: 6, height: 24, backgroundColor: colors.accent, borderRadius: 3 },
  sectionTitleText: { fontSize: fonts.sizes.title, fontWeight: '700', color: colors.text },

  contentMaxWidth: { maxWidth: 700, width: '100%', alignSelf: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg + 4,
    marginBottom: spacing.xl + 4,
  },

  row2: { flexDirection: 'row', gap: spacing.lg },
  row2Item: { flex: 1 },

  fieldGroup: { marginBottom: spacing.md + 2 },
  fieldLabel: { fontSize: fonts.sizes.caption + 1, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs + 2 },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    fontSize: fonts.sizes.subtitle - 1,
    color: colors.text,
    backgroundColor: colors.background,
  },
  fieldInputError: { borderColor: colors.danger },
  fieldErrorText: { color: colors.danger, fontSize: fonts.sizes.caption, marginTop: spacing.xs },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginTop: spacing.sm - 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  statusHint: { fontSize: fonts.sizes.subtitle - 1, fontWeight: '700', color: colors.text, marginTop: 2 },

  teacherReadOnlyText: { fontSize: fonts.sizes.subtitle - 1, fontWeight: '600', color: colors.text, marginTop: spacing.xs + 2 },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: spacing.sm },
  teacherRowText: { fontSize: fonts.sizes.subtitle - 1, fontWeight: '600', color: colors.text },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fonts.sizes.subtitle },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  deleteButtonText: { color: colors.danger, fontWeight: '700', fontSize: fonts.sizes.subtitle - 1 },

  mobileBackdropLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(43, 33, 23, 0.4)' },
  mobileDrawerContainer: { position: 'absolute', top: 62, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: colors.surface },
});