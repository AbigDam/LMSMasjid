// screens/LoginScreen.js
// -----------------------------------------------------------------------------
// Al-Hidaya teacher login (Phase II - Backend Integration).
//
// Behaviour:
//   - Email + password (password masked by default, with show/hide toggle)
//   - "Remember me" stores ONLY the email in AsyncStorage (never the password)
//   - Forgot password is a placeholder
//   - Validation: valid email + a password meeting the security policy
//     (8+ chars, upper, lower, number, special — see constants/validation.js)
//   - On success it navigates to the Dashboard (mock — no credentials checked)
//   - Link to Signup
//
// SECURITY NOTE: the password is never persisted anywhere. With the real Django
// backend, send it once over HTTPS and store only the returned token (in
// SecureStore, NOT plain AsyncStorage).
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import AuthScene from '../components/AuthScene';
import TextField from '../components/TextField';
import { validatePassword } from '../constants/validation';
import { colors, spacing, radii, fonts, shadow } from '../constants/theme';
import { useContext } from 'react';
import { useAuth } from '../context/AuthContext';

const REMEMBERED_USERNAME_KEY = 'rememberedUsername';

export default function LoginScreen({ navigation }) {
  const { setAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});

  // On mount, pre-fill a previously remembered email (if any).
useEffect(() => {
  (async () => {
    try {
      const saved = await AsyncStorage.getItem(
        REMEMBERED_USERNAME_KEY
      );

      if (saved) {
        const split = saved.split('_');

        if (split.length >= 2) {
          setEmail(split[0]);
        }

        setRememberMe(true);
      }
    } catch (e) {
      console.warn('Could not read remembered username:', e);
    }
  })();
}, []);
function validate() {
  const next = {};

  if (!email.trim()) {
    next.email = 'Email is required.';
  }

  const pwError = validatePassword(password);

  if (pwError) {
    next.password = pwError;
  }

  return next;
}

async function handleLogin() {
  const validationErrors = validate();

  setErrors(validationErrors);

  if (Object.keys(validationErrors).length > 0) {
    return;
  }

  const username = email.trim();

  try {
    if (rememberMe) {
      await AsyncStorage.setItem(
        REMEMBERED_USERNAME_KEY,
        email.trim()
      );
    } else {
      await AsyncStorage.removeItem(
        REMEMBERED_USERNAME_KEY
      );
    }

    const response = await axios.post(
      'http://127.0.0.1:8000/api/login/',
      {
        username,
        password,
      }
    );

    const accessToken = response.data.access;

    await AsyncStorage.setItem('authToken', accessToken);

    // 🔥 THIS is the only navigation trigger you need
    setAuthenticated(true);

  } catch (error) {
    console.error(error);

    setErrors({
      password:
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Invalid credentials',
    });
  }
}

  function handleForgotPassword() {
    // Placeholder — reset flow (Django password reset) comes later.
    console.log('TODO: Forgot password flow.');
  }

  return (
    <AuthScene>
      <Text style={styles.welcome}>Welcome back</Text>
      <Text style={styles.welcomeSub}>Sign in to manage your classes</Text>

      <TextField
        label="Email"
        iconName="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />

      <TextField
        label="Password"
        iconName="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        error={errors.password}
        secureToggle
        autoCapitalize="none"
        autoComplete="password"
        returnKeyType="done"
        onSubmitEditing={handleLogin}
/>


      {/* Remember me  +  Forgot password */}
      <View style={styles.row}>
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setRememberMe((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: rememberMe }}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe ? <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} /> : null}
          </View>
          <Text style={styles.checkboxLabel}>Remember me</Text>
        </Pressable>

        <Pressable onPress={handleForgotPassword} hitSlop={8}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        onPress={handleLogin}
      >
        <Text style={styles.primaryBtnText}>Log In</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.textOnPrimary} />
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New teacher? </Text>
        <Pressable onPress={() => navigation.navigate('Signup')} hitSlop={8}>
          <Text style={styles.link}>Create an account</Text>
        </Pressable>
      </View>


      <Pressable onPress={() => navigation.navigate('TestBackend')}>
      <Text style={{ color: 'red' }}>Backend Debug</Text>
    </Pressable>

    </AuthScene>
    
  );
}

const styles = StyleSheet.create({
  welcome: {
    fontSize: fonts.sizes.heading,
    fontWeight: '800',
    color: colors.text,
  },
  welcomeSub: {
    fontSize: fonts.sizes.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { color: colors.text, fontSize: fonts.sizes.body },
  link: { color: colors.primary, fontSize: fonts.sizes.body, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadow,
  },
  primaryBtnPressed: { backgroundColor: colors.primaryDark },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: fonts.sizes.subtitle, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMuted, fontSize: fonts.sizes.body },
});
