import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { brand }           from '../constants/brand';
import { colors, fonts, radii, shadow, spacing } from '../constants/theme';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TODAY = new Date().toISOString().split('T')[0];

/** Single course pill in the roster */
function CourseChip({ course, selected, onPress }) {
  
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.chipAvatar, selected && styles.chipAvatarSelected]}>
        <Text style={[styles.chipInitials, selected && styles.chipInitialsSelected]}>
          {course.name.charAt(0)}
        </Text>
      </View>

      <Text
        style={[styles.chipName, selected && styles.chipNameSelected]}
        numberOfLines={1}
      >
        {course.name}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function CourseView({ route, navigation }) {
  const { course } = route.params;

}