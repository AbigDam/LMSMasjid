// screens/AdminStudentRoster.js
// -----------------------------------------------------------------------------
// Al-Hidaya — Admin: Course Roster
//
// Opened from CourseView's "View Student Roster" button. Same list/search
// format as the teacher-facing StudentRoster.js, extended with:
//   1. Loads only students enrolled in this course (course.students ids)
//      via the existing GET /select_students/<class_id>/
//   2. "Add Student" opens a modal listing students NOT yet in this course
//      (GET /admin/available_students/<class_id>/), multi-select, then
//      POST /admin/add_students_to_class/ { class_id, student_ids }
//   3. Each row has a remove (trash) action — confirms first, then
//      POST /admin/remove_student_from_class/ { class_id, student_id }
//
// Layout/chrome (AdminSidebar, responsive breakpoint, mobile drawer, header)
// mirrors the other admin screens (CourseView, EditClass) via the shared
// useAdminLayout hook.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  Pressable,
  Modal,
  Animated,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api.js';
import AdminSidebar from '../components/AdminSidebar';
import { brand, brandImages } from '../constants/brand';
import { colors, spacing, radii, fonts } from '../constants/theme.js';
import useAdminLayout, { DRAWER_WIDTH } from '../components/useAdminLayout';
import { confirmDialog, notify } from '../components/crossPlatformAlerts';

export default function AdminStudentRoster({ route, navigation }) {
  const { course } = route.params;

  const layout = useAdminLayout();
  const { isWide, sidebarVisible, setSidebarVisible, menuOpen, setMenuOpen, translateX, backdrop, admin, courses, handleSignOut } = layout;

  // Enrolled roster
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Per-row remove state
  const [removingId, setRemovingId] = useState(null);

  // Add Student modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableError, setAvailableError] = useState(null);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // ------------------------------------------------------------------
  // Enrolled roster
  // ------------------------------------------------------------------
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/select_students/${course.id}/`);
      setStudents(response.data ?? []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch student roster.');
    } finally {
      setLoading(false);
    }
  }, [course.id]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filtered = search.trim()
    ? students.filter((s) => {
        const fullName = s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.name ?? '';
        return fullName.toLowerCase().includes(search.trim().toLowerCase());
      })
    : students;

  // ------------------------------------------------------------------
  // Remove student
  // ------------------------------------------------------------------
  async function handleRemovePress(student) {
    const fullName = student.first_name && student.last_name
      ? `${student.first_name} ${student.last_name}`
      : student.name ?? 'this student';

    const confirmed = await confirmDialog(
      'Remove Student?',
      `Remove ${fullName} from ${course.title ?? course.name ?? 'this course'}? They'll keep their account and past records — this only un-enrolls them from this class.`
    );
    if (!confirmed) return;

    setRemovingId(student.id);
    try {
      await api.post('/admin/remove_student_from_class/', {
        class_id: course.id,
        student_id: student.id,
      });
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (err) {
      console.error(err?.response?.data || err);
      const message = err?.response?.data?.error || err?.response?.data?.detail || 'Could not remove this student.';
      notify('Something went wrong', message);
    } finally {
      setRemovingId(null);
    }
  }

  // ------------------------------------------------------------------
  // Add students modal
  // ------------------------------------------------------------------
  const fetchAvailableStudents = useCallback(async () => {
    setAvailableLoading(true);
    setAvailableError(null);
    try {
      const response = await api.get(`/admin/available_students/${course.id}/`);
      setAvailableStudents(response.data ?? []);
    } catch (err) {
      console.error(err);
      setAvailableError(err.message || 'Failed to load available students.');
    } finally {
      setAvailableLoading(false);
    }
  }, [course.id]);

  function openAddModal() {
    setSelectedIds([]);
    setAvailableSearch('');
    setAddModalVisible(true);
    fetchAvailableStudents();
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const filteredAvailable = availableSearch.trim()
    ? availableStudents.filter((s) => {
        const fullName = s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.name ?? '';
        return fullName.toLowerCase().includes(availableSearch.trim().toLowerCase());
      })
    : availableStudents;

  async function submitAddStudents() {
    if (selectedIds.length === 0) return;

    setAddSubmitting(true);
    try {
      await api.post('/admin/add_students_to_class/', {
        class_id: course.id,
        student_ids: selectedIds,
      });
      setAddModalVisible(false);
      fetchStudents();
    } catch (err) {
      console.error(err?.response?.data || err);
      const message = err?.response?.data?.error || err?.response?.data?.detail || 'Could not add students.';
      notify('Something went wrong', message);
    } finally {
      setAddSubmitting(false);
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
            <Pressable onPress={() => setSidebarVisible(!sidebarVisible)} style={styles.menuIconButton} hitSlop={12}>
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
        <View style={styles.content}>
          <View style={styles.sectionHeaderRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginRight: 4 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <View style={styles.sectionTitleIndicator} />
            <Text style={styles.sectionTitleText} numberOfLines={1}>
              {course.title ?? course.name ?? 'Course'} Roster
            </Text>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.addButton} onPress={openAddModal}>
              <Ionicons name="person-add-outline" size={16} color={colors.textOnPrimary} />
              <Text style={styles.addButtonText}>Add Student</Text>
            </Pressable>
          </View>

          <View style={styles.contentMaxWidth}>
            {/* Search bar */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students…"
                placeholderTextColor={colors.placeholder}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
            </View>

            {/* Body */}
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={fetchStudents} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id ?? item._id)}
                renderItem={({ item }) => (
                  <StudentRow
                    student={item}
                    removing={removingId === item.id}
                    onRemove={() => handleRemovePress(item)}
                  />
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.center}>
                    <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyText}>
                      {search ? 'No students match your search' : 'No students in this class yet'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
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

      {/* Add Student Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Students</Text>
              <Pressable onPress={() => setAddModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search registered students…"
                placeholderTextColor={colors.placeholder}
                value={availableSearch}
                onChangeText={setAvailableSearch}
              />
            </View>

            {availableLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : availableError ? (
              <View style={styles.center}>
                <Text style={styles.errorText}>{availableError}</Text>
                <Pressable onPress={fetchAvailableStudents} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : filteredAvailable.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>
                  {availableSearch ? 'No matches.' : 'Every registered student is already in this class.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredAvailable}
                keyExtractor={(item) => String(item.id ?? item._id)}
                style={{ maxHeight: 360 }}
                renderItem={({ item }) => {
                  const selected = selectedIds.includes(item.id);
                  const fullName = item.first_name && item.last_name
                    ? `${item.first_name} ${item.last_name}`
                    : item.name ?? 'Unknown Student';
                  return (
                    <Pressable style={styles.pickerRow} onPress={() => toggleSelected(item.id)}>
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={selected ? colors.primary : colors.textMuted}
                      />
                      <Text style={styles.pickerRowText}>{fullName}</Text>
                    </Pressable>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}

            <Pressable
              style={[styles.primaryButton, (selectedIds.length === 0 || addSubmitting) && styles.primaryButtonDisabled]}
              onPress={submitAddStudents}
              disabled={selectedIds.length === 0 || addSubmitting}
            >
              {addSubmitting ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StudentRow({ student, onRemove, removing }) {
  const fullName = student.first_name && student.last_name
    ? `${student.first_name} ${student.last_name}`
    : student.name ?? 'Unknown Student';

  const initials = student.first_name && student.last_name
    ? (student.first_name.charAt(0) + student.last_name.charAt(0)).toUpperCase()
    : '?';

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.studentName}>{fullName}</Text>
        {student.level ? <Text style={styles.studentSub}>{student.level}</Text> : null}
      </View>
      <Pressable onPress={onRemove} hitSlop={10} style={styles.removeBtn} disabled={removing}>
        {removing ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        )}
      </Pressable>
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

  content: { flex: 1, padding: 32 },
  contentMaxWidth: { maxWidth: 700, width: '100%', alignSelf: 'center' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl, maxWidth: 700, width: '100%', alignSelf: 'center' },
  sectionTitleIndicator: { width: 6, height: 24, backgroundColor: colors.accent, borderRadius: 3 },
  sectionTitleText: { fontSize: fonts.sizes.title, fontWeight: '700', color: colors.text, flexShrink: 1 },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  addButtonText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fonts.sizes.caption + 1 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm + 2, fontSize: fonts.sizes.subtitle - 1, color: colors.text },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.textOnPrimary, fontSize: fonts.sizes.subtitle - 1, fontWeight: '700' },
  rowBody: { flex: 1 },
  studentName: { fontSize: fonts.sizes.subtitle - 1, fontWeight: '600', color: colors.text },
  studentSub: { fontSize: fonts.sizes.caption, color: colors.textMuted, marginTop: 2 },
  removeBtn: { padding: spacing.xs },

  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { fontSize: fonts.sizes.subtitle - 1, color: colors.textMuted, textAlign: 'center' },
  errorText: { fontSize: fonts.sizes.subtitle - 1, color: colors.danger, textAlign: 'center' },
  retryBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.primary },
  retryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fonts.sizes.body },

  mobileBackdropLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(43, 33, 23, 0.4)' },
  mobileDrawerContainer: { position: 'absolute', top: 62, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: colors.surface },

  // Add Student modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(43, 33, 23, 0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg + 4,
    borderTopRightRadius: radii.lg + 4,
    padding: spacing.lg + 4,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  modalTitle: { fontSize: fonts.sizes.title, fontWeight: '700', color: colors.text },

  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: spacing.sm + 2 },
  pickerRowText: { fontSize: fonts.sizes.subtitle - 1, fontWeight: '600', color: colors.text },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fonts.sizes.subtitle },
});
