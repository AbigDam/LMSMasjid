import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Pressable, StyleSheet } from 'react-native';

/* Screens */
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import DashboardScreen from './screens/DashboardScreen';
import LoadingScreen from './screens/LoadingScreen';
import AddLogScreen from './screens/AddLogScreen';
import StudentViewScreen from './screens/StudentViewScreen';
import { AuthContext } from './context/AuthContext';
import { colors, spacing, fonts, radii } from './constants/theme';

/* Admin Screens */
import AdminDashboardScreen from './admin-portal/AdminDashboardScreen';
import ManageCourses from './admin-portal/ManageCourses';

const Stack = createNativeStackNavigator();

/* ---------------- AUTH STACK ---------------- */
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

/* ---------------- SMALL INLINE ERROR VIEW ---------------- */
function AppLoadError({ message, onRetry }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorBody}>{message}</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

/* ---------------- APP STACK ---------------- */
function AppStack({ user, userError, onRetryUser }) {

  // console.log('Rendering AppStack with user:', user);

  if (userError) {
    return <AppLoadError message={userError} onRetry={onRetryUser} />;
  }

  if (!user) {
    App();
  }

  

  switch (user.role_id) {
    case 1: // Teacher
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="AddLog" component={AddLogScreen} />
        </Stack.Navigator>
      );
    case 3: // Admin
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          {/* <Stack.Screen name="ManageCourses" component={ManageCourses} /> */}
        </Stack.Navigator>
      );
    default:
      return (
        <AppLoadError
          message={`No screen configured for role "${user.role_id}".`}
          onRetry={onRetryUser}
        />
      );
  }
}

/* ---------------- ROOT APP ---------------- */
export default function App() {
  
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userError, setUserError] = useState(null);

  const checkAuth = useCallback(async () => {
    console.log('Checking authentication...');
    setLoading(true);
    setUserError(null);

    try {
      const token = await AsyncStorage.getItem('authToken');
      console.log('TOKEN FROM STORAGE:', token);
      const isAuthed = !!token;
      setAuthenticated(isAuthed);

      
      if (isAuthed) {
        try {
          const response = await axios.get(
            'http://127.0.0.1:8000/api/current_user/',
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setUser(response.data);
        } catch (userErr) {

          console.error('Failed to fetch current user:', userErr?.response?.status, userErr?.response?.data);

          if (userErr?.response?.status === 401) {
            
            await AsyncStorage.removeItem('authToken');
            setAuthenticated(false);
            setUser(null);
            setUserError(null);
          } else {
            
            setUser(null);
            setUserError(
              userErr?.response?.data?.error ||
                userErr?.response?.data?.message ||
                'Could not load your account. Please try again.'
            );
          }
        }
      } else {
        console.log('No token found, user is not authenticated.');
        setUser(null);
      }
    } catch (err) {

      console.error('Auth check failed:', err);
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  
  }, [authenticated]);

  // useEffect(() => {
  //   async function checkAuth() {
  //     try {
  //       const token = await AsyncStorage.getItem('authToken');
  //       setAuthenticated(!!token);

  //       //Stores current user info in global variable for navigating between different screens depending on user role (teacher vs admin).
  //       if (token)
  //       {
  //         const response = await axios.get(
  //           'http://127.0.0.1:8000/api/current_user/',
  //         {
  //           headers: {
  //             Authorization: `Bearer ${token}`,
  //           },
  //         }
  //         );
  //         setUser(response.data);
  //       }
        
  //     } catch (err) {
  //       console.error('Auth check failed:', err);
  //       setAuthenticated(false);
  //     } finally {
  //       setLoading(false);
  //     }
      
  //   }

  //   checkAuth();
  // }, []);

  if (loading) return <LoadingScreen label="Signing you in…" />;

  
  return (
    <AuthContext.Provider value={{ authenticated, setAuthenticated, user, setUser, loading }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
            {authenticated ? ( user === null ? (
            <LoadingScreen label="Signing you in..." />
          ) : (
            <AppStack
              user={user}
              userError={userError}
              onRetryUser={checkAuth}
            />
          )
        ) : (
          <AuthStack />
        )}
              
          {/* {authenticated ? <AppStack user={user} userError={userError} onRetryUser={checkAuth} /> : <AuthStack />} */}

        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    fontSize: fonts.sizes.title,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  errorBody: {
    fontSize: fonts.sizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
  },
  retryBtnText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: fonts.sizes.body,
  },
});
