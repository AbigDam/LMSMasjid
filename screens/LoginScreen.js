// screens/LoginScreen.js
// -----------------------------------------------------------------------------
// Al-Hidaya teacher login (Phase I — MOCK auth only, no backend).
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

import AuthScene from '../components/AuthScene';
import TextField from '../components/TextField';
import { isValidEmail, validatePassword } from '../constants/validation';
import { colors, spacing, radii, fonts, shadow } from '../constants/theme';

const REMEMBERED_EMAIL_KEY = 'rememberedEmail';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});

  // On mount, pre-fill a previously remembered email (if any).
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
        if (saved) {
          setEmail(saved);
          setRememberMe(true);
        }
      } catch (e) {
        console.warn('Could not read remembered email:', e);
      }
    })();
  }, []);

  function validate(trimmedEmail) {
    const next = {};
    if (!trimmedEmail) {
      next.email = 'Email is required.';
    } else if (!isValidEmail(trimmedEmail)) {
      next.email = 'Enter a valid email address.';
    }
    const pwError = validatePassword(password);
    if (pwError) next.password = pwError;
    return next;
  }

  async function handleLogin() {
    const trimmedEmail = email.trim(); // always trim the email
    const validationErrors = validate(trimmedEmail);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // Remember-me: persist ONLY the email (never the password).
    try {
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, trimmedEmail);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    } catch (e) {
      console.warn('Could not update remembered email:', e);
    }

    // TODO (Django auth): replace this mock with a real request, e.g.
    //   const res = await fetch(`${API_URL}/api/auth/login/`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email: trimmedEmail, password }),
    //   });
    //   if (!res.ok) { setErrors({ password: 'Invalid credentials' }); return; }
    //   const { token } = await res.json();
    //   await SecureStore.setItemAsync('authToken', token); // NOT AsyncStorage
    //
    // Phase I: any input that passes validation "logs in".
    // `replace` so the back gesture can't return to the login screen.
    navigation.replace('Dashboard');
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
        placeholder="you@al-hidaya.org"
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="next"
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
