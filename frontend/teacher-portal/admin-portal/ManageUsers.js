// screens/ManageUsers.js
// -----------------------------------------------------------------------------
// Al-Hidaya — Admin: Manage Users
//
// Lists every user (Teacher/Admin/Student) with role tabs + search. Each row
// has Edit (opens an inline modal — first/last name, username, email; role
// is locked after creation) and Delete (confirms first, then removes the
// account and scrubs it from any class rosters/teacher lists).
//
// "+ Add User" navigates to AddUser.js.
//
// Data:
//   GET    /admin/users/        — all users
//   PATCH  /admin/users/<id>/   — edit name/username/email
//   DELETE /admin/users/<id>/   — delete + cleanup
//
// Layout/chrome mirrors the other admin screens via useAdminLayout.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
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

const ROLE_LABELS = { 0: 'Teacher', 1: 'Admin', 2: 'Student' };
const TABS = [
  { key: 'all', label: 'All' },
  { key: 0, label: 'Teachers' },
  { key: 1, label: 'Admins' },
  { key: 2, label: 'Students' },
];

export default function ManageUsers({ navigation }) {
  const layout = useAdminLayout();
  const { isWide, sidebarVisible, setSidebarVisible, menuOpen, setMenuOpen, translateX, backdrop, admin, courses, handleSignOut } = layout;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const [removingId, setRemovingId] = useState(null);

  // Edit modal
  const [editUser, setEditUser] = useState(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/users/');
      setUsers(response.data ?? []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const counts = useMemo(() => {
    const c = { all: users.length, 0: 0, 1: 0, 2: 0 };
    users.forEach((u) => {
      if (c[u.role] !== undefined) c[u.role] += 1;
    });
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    let list = activeTab === 'all' ? users : users.filter((u) => u.role === activeTab);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase();
        return (
          fullName.includes(q) ||
          (u.username ?? '').toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [users, activeTab, search]);

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------
  async function handleDeletePress(user) {
    const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.username;
    const confirmed = await confirmDialog(
      'Delete User?',
      `This will permanently delete ${fullName}'s account and remove them from any classes they're enrolled in or teaching. This can't be undone.`
    );
    if (!confirmed) return;

    setRemovingId(user.id);
    try {
      await api.delete(`/admin/users/${user.id}/`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      console.error(err?.response?.data || err);
      const message = err?.response?.data?.error || err?.response?.data?.detail || 'Could not delete this user.';
      notify('Something went wrong', message);
    } finally {
      setRemovingId(null);
    }
  }

  // ------------------------------------------------------------------
  // Edit
  // ------------------------------------------------------------------
  function openEditModal(user) {
    setEditUser(user);
    setEditFirstName(user.first_name ?? '');
    setEditLastName(user.last_name ?? '');
    setEditUsername(user.username ?? '');
    setEditEmail(user.email ?? '');
    setEditErrors({});
  }

  async function submitEdit() {
    const errs = {};
    if (!editFirstName.trim()) errs.firstName = 'First name is required.';
    if (!editLastName.trim()) errs.lastName = 'Last name is required.';
    if (!editUsername.trim()) errs.username = 'Username is required.';
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setEditSaving(true);
    try {
      const response = await api.patch(`/admin/users/${editUser.id}/`, {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        username: editUsername.trim(),
        email: editEmail.trim(),
      });
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? response.data : u)));
      setEditUser(null);
    } catch (err) {
      console.error(err?.response?.data || err);
      const message = err?.response?.data?.error || err?.response?.data?.detail || 'Could not save changes.';
      notify('Something went wrong', message);
    } finally {
      setEditSaving(false);
    }
  }

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

        <ScrollView contentContainerStyle={styles.scrollCanvas} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleIndicator} />
            <Text style={styles.sectionTitleText}>Manage Users</Text>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddUser')}>
              <Ionicons name="person-add-outline" size={16} color={colors.textOnPrimary} />
              <Text style={styles.addButtonText}>Add User</Text>
            </Pressable>
          </View>

          <View style={styles.contentMaxWidth}>
            {/* Role tabs */}
            <View style={styles.tabRow}>
              {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    style={[styles.tab, active && styles.tabActive]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {tab.label} ({counts[tab.key] ?? 0})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, username, or email…"
                placeholderTextColor={colors.placeholder}
                value={search}
                onChangeText={setSearch}
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
                <Pressable onPress={fetchUsers} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <UserRow
                    user={item}
                    removing={removingId === item.id}
                    onEdit={() => openEditModal(item)}
                    onRemove={() => handleDeletePress(item)}
                  />
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  <View style={styles.center}>
                    <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyText}>
                      {search ? 'No users match your search' : 'No users yet'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </ScrollView>
      </View>

      {/* Mobile Drawer */}
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

      {/* Edit User Modal */}
      <Modal visible={!!editUser} animationType="slide" transparent onRequestClose={() => setEditUser(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <Pressable onPress={() => setEditUser(null)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {editUser && (
              <View style={styles.roleBadgeRow}>
                <Text style={styles.roleBadgeLabel}>Role</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{ROLE_LABELS[editUser.role] ?? 'Unknown'}</Text>
                </View>
                <Text style={styles.roleLockedHint}>(locked after creation)</Text>
              </View>
            )}

            <ModalField label="First Name" value={editFirstName} onChangeText={setEditFirstName} error={editErrors.firstName} />
            <ModalField label="Last Name" value={editLastName} onChangeText={setEditLastName} error={editErrors.lastName} />
            <ModalField label="Username" value={editUsername} onChangeText={setEditUsername} error={editErrors.username} autoCapitalize="none" />
            <ModalField label="Email" value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />

            <Pressable
              style={[styles.primaryButton, editSaving && styles.primaryButtonDisabled]}
              onPress={submitEdit}
              disabled={editSaving}
            >
              {editSaving ? <ActivityIndicator color={colors.textOnPrimary} /> : <Text style={styles.primaryButtonText}>Save Changes</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function UserRow({ user, onEdit, onRemove, removing }) {
  const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.username;
  const initials = (user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '') || user.username?.[0]?.toUpperCase() || '?';

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.userName}>{fullName}</Text>
        <Text style={styles.userSub} numberOfLines={1}>
          {user.username}{user.email ? ` · ${user.email}` : ''}
        </Text>
      </View>
      <View style={styles.roleBadgeSmall}>
        <Text style={styles.roleBadgeSmallText}>{ROLE_LABELS[user.role] ?? 'Unknown'}</Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={10} style={styles.rowIconBtn}>
        <Ionicons name="create-outline" size={20} color={colors.primary} />
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={10} style={styles.rowIconBtn} disabled={removing}>
        {removing ? <ActivityIndicator size="small" color={colors.danger} /> : <Ionicons name="trash-outline" size={20} color={colors.danger} />}
      </Pressable>
    </View>
  );
}

function ModalField({ label, error, ...inputProps }) {
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

  scrollCanvas: { padding: 32, maxWidth: 1200, width: '100%', alignSelf: 'center' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl, maxWidth: 900, width: '100%', alignSelf: 'center' },
  sectionTitleIndicator: { width: 6, height: 28, backgroundColor: colors.accent, borderRadius: 3 },
  sectionTitleText: { fontSize: 22, fontWeight: '700', color: colors.text },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  addButtonText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fonts.sizes.body },

  contentMaxWidth: { maxWidth: 900, width: '100%', alignSelf: 'center' },

  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: fonts.sizes.caption + 1, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.textOnPrimary },

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

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, borderRadius: radii.md },
  separator: { height: spacing.xs },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.textOnPrimary, fontSize: fonts.sizes.subtitle - 1, fontWeight: '700' },
  rowBody: { flex: 1 },
  userName: { fontSize: fonts.sizes.subtitle - 1, fontWeight: '600', color: colors.text },
  userSub: { fontSize: fonts.sizes.caption, color: colors.textMuted, marginTop: 2 },
  rowIconBtn: { padding: spacing.xs },

  roleBadgeSmall: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.primaryLight },
  roleBadgeSmallText: { fontSize: fonts.sizes.caption - 1, fontWeight: '700', color: colors.primary },

  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { fontSize: fonts.sizes.subtitle - 1, color: colors.textMuted, textAlign: 'center' },
  errorText: { fontSize: fonts.sizes.subtitle - 1, color: colors.danger, textAlign: 'center' },
  retryBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.primary },
  retryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fonts.sizes.body },

  mobileBackdropLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(43, 33, 23, 0.4)' },
  mobileDrawerContainer: { position: 'absolute', top: 62, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: colors.surface },

  // Edit modal
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

  roleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  roleBadgeLabel: { fontSize: fonts.sizes.caption + 1, fontWeight: '600', color: colors.textMuted },
  roleBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.primaryLight },
  roleBadgeText: { fontSize: fonts.sizes.caption + 1, fontWeight: '700', color: colors.primary },
  roleLockedHint: { fontSize: fonts.sizes.caption - 1, color: colors.textMuted, fontStyle: 'italic' },

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

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fonts.sizes.subtitle },
});
