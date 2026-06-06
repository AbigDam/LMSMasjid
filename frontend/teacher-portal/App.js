// App.js
// -----------------------------------------------------------------------------
// Root of the FE-1 frontend (Phase I Mosque LMS — Teacher Portal).
//
// Scope of THIS file: navigation only. Three screens, all teacher-facing:
//   Login  ->  Signup  ->  Dashboard
//
// There is NO real authentication yet (mock only). When the Django backend is
// ready, wrap <NavigationContainer> in an <AuthProvider> (React Context) that
// holds the JWT/session token, and switch the initial route based on whether a
// valid token exists. See the TODO marker below.
// -----------------------------------------------------------------------------

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import DashboardScreen from './screens/DashboardScreen';
import TestBackend from './screens/TestBackend';

const Stack = createNativeStackNavigator();

export default function App() {
  // TODO (Django auth): Wrap the navigator in an <AuthProvider>. Read the stored
  // token on launch and set `initialRouteName` to "Dashboard" when logged in,
  // otherwise "Login". For Phase I we always start at Login.
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false, // each screen renders its own header / layout
            animation: 'fade',
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="TestBackend" component={TestBackend} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
