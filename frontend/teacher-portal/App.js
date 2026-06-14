import { useEffect, useState, createContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

/* Screens */
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import DashboardScreen from './screens/DashboardScreen';
import StudentView     from './screens/StudentView';
import TestBackend from './screens/TestBackend';
import AddLogScreen from './screens/AddLogScreen';
import { AuthContext } from './context/AuthContext';

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

/* ---------------- APP STACK ---------------- */
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="StudentRoster" component={StudentView} options={{ title: 'Class Roster' }} />
      <Stack.Screen name="AddLog" component={AddLogScreen} />
    </Stack.Navigator>
  );
}

/* ---------------- ROOT APP ---------------- */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await AsyncStorage.getItem('authToken');
        setAuthenticated(!!token);
      } catch (err) {
        console.error('Auth check failed:', err);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ authenticated, setAuthenticated }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />

          {authenticated ? <AppStack /> : <AuthStack />}

        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}