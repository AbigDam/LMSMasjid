// hooks/useAdminLayout.js
// -----------------------------------------------------------------------------
// Shared responsive-layout logic for admin screens that use <AdminSidebar>.
// Extracted from DashboardScreen so ManageCourses / CourseView / EditClass
// (and any future admin screen) don't each re-implement the same
// width-breakpoint + slide-out-drawer animation + admin/courses fetch.
//
// Usage in a screen:
//   const layout = useAdminLayout();
//   ...
//   {layout.isWide && layout.sidebarVisible && (
//     <View style={{ width: DRAWER_WIDTH, ... }}>
//       <AdminSidebar
//         courses={layout.courses}
//         activeId={someId}
//         onNavigate={(course) => { navigation.navigate('CourseView', { course }); layout.setMenuOpen(false); }}
//         onSignOut={layout.handleSignOut}
//         onClose={() => layout.setSidebarVisible(false)}
//       />
//     </View>
//   )}
//   // + the mobile drawer block (see ManageCourses.js for the full example)
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../api.js';
import { useAuth } from '../context/AuthContext';

export const WIDE_BREAKPOINT = 900;
export const DRAWER_WIDTH = 290;

export default function useAdminLayout() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  const [admin, setAdmin] = useState(null);
  const [courses, setCourses] = useState([]);

  const { setAuthenticated } = useAuth();

  // Admin's own name for the header badge (same endpoint DashboardScreen uses).
  useEffect(() => {
    async function loadUser() {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const response = await axios.get(
          'https://lmsmasjid-backend.onrender.com/api/current_user/',
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setAdmin(response.data);
      } catch (error) {
        console.error(error);
      }
    }
    loadUser();
  }, []);

  // Course list for the sidebar nav rows.
  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await api.get('/select_classes/');
        setCourses(response.data ?? []);
      } catch (error) {
        console.error(error);
      }
    }
    loadCourses();
  }, []);

  useEffect(() => {
    if (isWide) return;
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: menuOpen ? 0 : -DRAWER_WIDTH,
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: menuOpen ? 1 : 0,
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: menuOpen ? 1 : 0,
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [menuOpen, isWide, translateX, backdrop]);

  useEffect(() => {
    if (isWide) setMenuOpen(false);
  }, [isWide]);

  async function handleSignOut() {
    await AsyncStorage.removeItem('authToken');
    setAuthenticated(false);
  }

  return {
    isWide,
    sidebarVisible,
    setSidebarVisible,
    menuOpen,
    setMenuOpen,
    translateX,
    backdrop,
    admin,
    courses,
    handleSignOut,
  };
}
