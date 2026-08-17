// screens/AddUser.js
// -----------------------------------------------------------------------------
// Al-Hidaya — Admin: Add User
//
// Opened from ManageUsers' "+ Add User" button. Role is picked first (chips,
// required) and reshapes the form:
//   - Teacher / Admin → same fields as SignupScreen (first/last name,
//     username, email, password + strength meter) — a full account.
//   - Student → first/last name only, plus an optional "assign to a class"
//     picker. Username is auto-generated and password defaults to
//     "studentpass" server-side — matches CreateClassAccounts' pattern.
//
// POST /admin/users/create/ (see backend/manage_users_views.py)
//
// Layout/chrome mirrors the other admin screens via useAdminLayout.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  FlatList,
  Animated,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api.js';
import AdminSidebar from '../components/AdminSidebar';
import PasswordStrength from '../components/PasswordStrength';
import { isValidEmail, validatePassword } from '../constants/validation';
import { brand, brandImages } from '../constants/brand';
import { colors, spacing, radii, fonts } from '../constants/theme.js';
import useAdminLayout, { DRAWER_WIDTH } from '../components/useAdminLayout';
import { notify } from '../components/crossPlatformAlerts';

const ROLES = [
  { key: 'Teacher', label: 'Teacher', icon: 'school-outline' },
  { key: 'Admin', label: 'Admin', icon: 'shield-checkmark-outline' },
  { key: 'Student', label: 'Student', icon: 'book-outline' },
];

export default function AddUser({ navigation }) {
  const layout = useAdminLayout();
  const { isWide, sidebarVisible, setSidebarVisible, menuOpen, setMenuOpen, translateX, backdrop, admin, courses, handleSignOut } = layout;

  const [role, setRole] = useState(null);

  // Shared
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Teacher / Admin only
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Student only — class assignment
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null); // { id, title }
  const [allCourses, setAllCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const response = await api.get('/admin/classes/');
      setAllCourses(response.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  function openClassPicker() {
    setClassPickerVisible(true);
    if (allCourses.length === 0) fetchCourses();
  }

  function selectRole(newRole) {
    setRole(newRole);
    setErrors({});
    // Reset the fields that don't apply to the newly-selected role so stale
    // input can't leak into a submission it doesn't belong to.
    if (newRole === 'Student') {
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirm('');
    } else {
      setSelectedClass(null);
    }
  }

  function validate() {
    const next = {};
    if (!firstName.trim()) next.firstName = 'First name is required.';
    if (!lastName.trim()) next.lastName = 'Last name is required.';

    if (role === 'Teacher' || role === 'Admin') {
      if (!username.trim()) next.username = 'Username is required.';
      if (!email.trim()) {
        next.email = 'Email is required.';
      } else if (!isValidEmail(email.trim())) {
        next.email = 'Enter a valid email address.';
      }
      const pwError = validatePassword(password);
      if (pwError) next.password = pwError;
      if (!confirm) {
        next.confirm = 'Please confirm the password.';
      } else if (confirm !== password) {
        next.confirm = 'Passwords do not match.';
      }
    }

    return next;
  }

  async function handleSubmit() {
    if (!role) {
      notify('Select a role', 'Choose Teacher, Admin, or Student before continuing.');
      return;
    }

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload =
        role === 'Student'
          ? {
              role,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              class_id: selectedClass?.id ?? undefined,
            }
          : {
              role,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              username: username.trim(),
              email: email.trim(),
              password,
            };

      await api.post('/admin/users/create/', payload);
      notify('User created', `${firstName.trim()} ${lastName.trim()} has been added.`, () => navigation.goBack());
    } catch (err) {
      console.error(err?.response?.data || err);
      const message = err?.response?.data?.error || err?.response?.data?.detail || 'Could not create this user.';
      notify('Something went wrong', message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleNavigateClass(course) {
    navigation.navigate('CourseView', { course });
    setMenuOpen(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
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
        {isWide && sidebarVisible && (
          <View style={styles.desktopNavWrapper}>
            <AdminSidebar activeId="users" courses={courses} onNavigate={handleNavigateClass} onSignOut={handleSignOut} onClose={() => setSidebarVisible(false)} />
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollCanvas} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionHeaderRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginRight: 4 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <View style={styles.sectionTitleIndicator} />
            <Text style={styles.sectionTitleText}>Add User</Text>
          </View>

          <View style={styles.contentMaxWidth}>
            {/* Role selector */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Role *</Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => {
                  const selected = role === r.key;
                  return (
                    <Pressable key={r.key} style={[styles.roleChip, selected && styles.roleChipSelected]} onPress={() => selectRole(r.key)}>
                      <Ionicons name={r.icon} size={18} color={selected ? colors.textOnPrimary : colors.primary} />
                      <Text style={[styles.roleChipText, selected && styles.roleChipTextSelected]}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {role && (
              <View style={styles.card}>
                <Field label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First name" error={errors.firstName} autoCapitalize="words" />
                <Field label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last name" error={errors.lastName} autoCapitalize="words" />

                {role === 'Student' ? (
                  <View style={{ marginTop: spacing.xs }}>
                    <Text style={styles.fieldLabel}>Assign to a Class (optional)</Text>
                    <Pressable style={styles.classPickerBtn} onPress={openClassPicker}>
                      <Ionicons name="book-outline" size={18} color={colors.primary} />
                      <Text style={styles.classPickerBtnText}>
                        {selectedClass ? (selectedClass.title ?? selectedClass.name) : 'Not assigned'}
                      </Text>
                      {selectedClass ? (
                        <Pressable onPress={() => setSelectedClass(null)} hitSlop={8}>
                          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </Pressable>
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      )}
                    </Pressable>
                    <Text style={styles.hintText}>
                      A username and default password are generated automatically for students.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Field label="Username" value={username} onChangeText={setUsername} placeholder="Username" error={errors.username} autoCapitalize="none" />
                    <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@al-hidaya.org" error={errors.email} keyboardType="email-address" autoCapitalize="none" />
                    <Field label="Password" value={password} onChangeText={setPassword} placeholder="Create a strong password" error={errors.password} secureTextEntry autoCapitalize="none" />
                    <PasswordStrength password={password} />
                    <Field label="Confirm Password" value={confirm} onChangeText={setConfirm} placeholder="Re-enter password" error={errors.confirm} secureTextEntry autoCapitalize="none" />
                  </>
                )}
              </View>
            )}

            <Pressable
              style={[styles.primaryButton, (!role || submitting) && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={!role || submitting}
            >
              {submitting ? <ActivityIndicator color={colors.textOnPrimary} /> : <Text style={styles.primaryButtonText}>Create User</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {!isWide && (
        <View style={StyleSheet.absoluteFill} pointerEvents={menuOpen ? 'auto' : 'none'}>
          <Animated.View style={[styles.mobileBackdropLayer, { opacity: backdrop }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          </Animated.View>
          <Animated.View style={[styles.mobileDrawerContainer, { transform: [{ translateX }] }]}>
            <AdminSidebar activeId="users" courses={courses} onNavigate={handleNavigateClass} onSignOut={handleSignOut} onClose={() => setMenuOpen(false)} />
          </Animated.View>
        </View>
      )}

      {/* Class picker modal */}
      <Modal visible={classPickerVisible} animationType="slide" transparent onRequestClose={() => setClassPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to a Class</Text>
              <Pressable onPress={() => setClassPickerVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {coursesLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : (
              <FlatList
                data={allCourses}
                keyExtractor={(item) => String(item.id)}
                style={{ maxHeight: 360 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.pickerRow}
                    onPress={() => {
                      setSelectedClass(item);
                      setClassPickerVisible(false);
                    }}
                  >
                    <Ionicons name="book-outline" size={18} color={colors.primary} />
                    <Text style={styles.pickerRowText}>{item.title ?? item.name}</Text>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={<Text style={styles.hintText}>No courses found.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, error, ...inputProps }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
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
    marginBottom: spacing.lg,
  },

  roleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  roleChipSelected: { backgroundColor: colors.primary },
  roleChipText: { fontSize: fonts.sizes.body, fontWeight: '700', color: colors.primary },
  roleChipTextSelected: { color: colors.textOnPrimary },

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

  classPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  classPickerBtnText: { flex: 1, fontSize: fonts.sizes.subtitle - 1, fontWeight: '600', color: colors.text },
  hintText: { fontSize: fonts.sizes.caption, color: colors.textMuted, marginTop: spacing.sm },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fonts.sizes.subtitle },

  mobileBackdropLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(43, 33, 23, 0.4)' },
  mobileDrawerContainer: { position: 'absolute', top: 62, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: colors.surface },

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
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
