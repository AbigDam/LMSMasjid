// screens/SignupScreen.js
// -----------------------------------------------------------------------------
// Al-Hidaya teacher sign-up (Phase II - Backend Integration).
//
// Behaviour:
//   - Full name, email, password, confirm password
//   - Passwords masked by default with show/hide toggles
//   - LIVE password strength meter + rule checklist (8+, upper, lower, number,
//     special — see constants/validation.js)
//   - Validation: name + valid email + policy-compliant password + matching
//     confirmation
//   - On success it navigates to the Dashboard (mock — nothing is persisted)
//   - Link back to Login
//
// SECURITY NOTE: passwords live only in component state and are never written to
// storage. With the real backend, POST the fields and store only the returned
// token (in SecureStore).
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AuthScene from '../components/AuthScene';
import TextField from '../components/TextField';
import PasswordStrength from '../components/PasswordStrength';
import { isValidEmail, validatePassword } from '../constants/validation';
import { colors, spacing, radii, fonts, shadow } from '../constants/theme';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

export default function SignupScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});

function validate(trimmedFirstName, trimmedLastName, trimmedEmail) {
  const next = {};

  if (!trimmedFirstName) {
    next.firstName = 'First name is required.';
  }

  if (!trimmedLastName) {
    next.lastName = 'Last name is required.';
  }

  if (!trimmedEmail) {
    next.email = 'Email is required.';
  } else if (!isValidEmail(trimmedEmail)) {
    next.email = 'Enter a valid email address.';
  }

  const pwError = validatePassword(password);

  if (pwError) {
    next.password = pwError;
  }

  if (!confirm) {
    next.confirm = 'Please confirm your password.';
  } else if (confirm !== password) {
    next.confirm = 'Passwords do not match.';
  }

  return next;
}
const API_URL = 'http://127.0.0.1:8000/';

const { setAuthenticated } = useAuth();

async function handleSignup() {
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const trimmedEmail = email.trim();

  const validationErrors = validate(
    trimmedFirstName,
    trimmedLastName,
    trimmedEmail
  );

  setErrors(validationErrors);

  if (Object.keys(validationErrors).length > 0) {
    return;
  }

  try {
    const response = await axios.post(
      `${API_URL}/api/register/`,
      {
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: trimmedEmail,
        password,
        role: 'Teacher',
      }
    );

    const accessToken = response.data.access;

    await AsyncStorage.setItem('authToken', accessToken);

    // 🔥 THIS replaces navigation
    setAuthenticated(true);

  } catch (error) {
    console.error(error);

    const data = error?.response?.data;

    setErrors({
      email:
        data?.email ||
        data?.error ||
        data?.message ||
        'Registration failed.',
    });
  }
}

  return (
    <AuthScene>
      <Text style={styles.welcome}>Create your account</Text>
      <Text style={styles.welcomeSub}>Join the Al-Hidaya teaching team</Text>

    <TextField
      label="First Name"
      iconName="person-outline"
      value={firstName}
      onChangeText={setFirstName}
      placeholder="Ahmad"
      error={errors.firstName}
      autoCapitalize="words"
      returnKeyType="next"
    />

    <TextField
      label="Last Name"
      iconName="person-outline"
      value={lastName}
      onChangeText={setLastName}
      placeholder="Khan"
      error={errors.lastName}
      autoCapitalize="words"
      returnKeyType="next"
    />

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
        placeholder="Create a strong password"
        error={errors.password}
        secureToggle
        autoCapitalize="none"
        returnKeyType="next"
      />

      {/* Live strength meter + rule checklist */}
      <PasswordStrength password={password} />

      <TextField
        label="Confirm password"
        iconName="lock-closed-outline"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Re-enter your password"
        error={errors.confirm}
        secureToggle
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={handleSignup}
      />

      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        onPress={handleSignup}
      >
        <Text style={styles.primaryBtnText}>Create Account</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.textOnPrimary} />
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.link}>Log in</Text>
        </Pressable>
      </View>
    </AuthScene>
  );
}

const styles = StyleSheet.create({
  welcome: { fontSize: fonts.sizes.heading, fontWeight: '800', color: colors.text },
  welcomeSub: {
    fontSize: fonts.sizes.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    ...shadow,
  },
  primaryBtnPressed: { backgroundColor: colors.primaryDark },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: fonts.sizes.subtitle, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMuted, fontSize: fonts.sizes.body },
  link: { color: colors.primary, fontSize: fonts.sizes.body, fontWeight: '700' },
});
