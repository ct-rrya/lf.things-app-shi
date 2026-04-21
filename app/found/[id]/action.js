// Review and confirm matches

/*
Functions:
    •	confirmMatch(): Marks match as confirmed, creates chat
    •	rejectMatch(): Marks match as rejected
    •	fetchMatchDetails(): Gets both items' full details
*/

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform, useWindowDimensions, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../styles/colors';

// ── Responsive helpers ─────────────────────────────────────────
function useResponsive() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWeb = Platform.OS === 'web';

  const hPad = isTablet || isWeb ? Math.min(width * 0.05, 40) : 16;
  const maxContentWidth = isWeb && width > 900 ? 640 : undefined;
  const headerTopPad = isWeb ? 20
    : Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12
    : 56;

  return { isTablet, isWeb, hPad, maxContentWidth, headerTopPad };
}

// ── Category icon map ──────────────────────────────────────────
function getCategoryIcon(category) {
  switch (category) {
    case 'ID':
    case 'id':           return { icon: 'card',           color: '#5B8CFF' };
    case 'Keys':
    case 'keys':         return { icon: 'key',            color: '#E8A838' };
    case 'Laptop':
    case 'laptop':       return { icon: 'laptop',         color: '#6C63FF' };
    case 'Phone':
    case 'phone':        return { icon: 'phone-portrait', color: '#34C759' };
    case 'Water Bottle':
    case 'bottle':       return { icon: 'water',          color: '#32ADE6' };
    case 'Wallet':
    case 'wallet':       return { icon: 'wallet',         color: '#A2845E' };
    case 'Bag':
    case 'bag':          return { icon: 'bag',            color: '#FF6B6B' };
    case 'Watch':
    case 'watch':        return { icon: 'time',           color: '#636366' };
    case 'Headphones':
    case 'headphones':   return { icon: 'headset',        color: '#AF52DE' };
    default:             return { icon: 'cube',           color: colors.grape };
  }
}

const ACTION_OPTIONS = [
  {
    id: 'have_it',
    icon: '📋',
    title: 'I have it with me',
    subtitle: 'You are physically holding the item',
    color: '#4CAF50',
    needsLocation: false,
  },
  {
    id: 'turned_in_admin',
    icon: '🏫',
    title: 'Turn in to Admin Office',
    subtitle: 'Bring to CTU Daanbantayan Student Affairs Office',
    color: '#2196F3',
    needsLocation: false,
  },
  {
    id: 'left_it',
    icon: '📍',
    title: 'I left it where I found it',
    subtitle: 'Couldn\'t take it with me',
    color: '#FF9800',
    needsLocation: true,
  },
  {
    id: 'contact_owner',
    icon: '💬',
    title: 'Contact owner directly',
    subtitle: 'Open anonymous chat thread',
    color: '#9C27B0',
    needsLocation: false,
  },
];

export default function FinderActionPage() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [finderName, setFinderName] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const r = useResponsive();

  useEffect(() => {
    fetchItem();
  }, [id]);

  async function fetchItem() {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        setError('Item not found');
        return;
      }
      
      setItem(data);
    } catch (err) {
      console.error('Error fetching item:', err);
      setError('Unable to load item details');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selectedAction) {
      Alert.alert('Action Required', 'Please select what you did with the item');
      return;
    }

    const actionOption = ACTION_OPTIONS.find(a => a.id === selectedAction);
    if (actionOption.needsLocation && !locationNote.trim()) {
      Alert.alert('Location Required', 'Please provide location details');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Insert scan event
      const { data: scanEventData, error: scanError } = await supabase
        .from('scan_events')
        .insert([{
          item_id: id,
          finder_name: finderName.trim() || null,
          action: selectedAction,
          scanner_type: 'web', // This is a web-based scan
          location_note: locationNote.trim() || null,
        }])
        .select()
        .single();

      if (scanError) {
        throw new Error(`Failed to record scan event: ${scanError.message}`);
      }

      if (!scanEventData) {
        throw new Error('Scan event was not created properly');
      }

      // 2. Update item status to 'found' or 'at_admin'
      const newStatus = selectedAction === 'turned_in_admin' ? 'at_admin' : 'found';
      const { error: updateError } = await supabase
        .from('items')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) {
        // Attempt to rollback scan event
        await supabase.from('scan_events').delete().eq('id', scanEventData.id);
        throw new Error(`Failed to update item status: ${updateError.message}`);
      }

      // 3. Create notification for the owner
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: item.user_id,
        type: selectedOption === 'turned_in_admin' ? 'item_returned' : 'item_found',
        title: selectedOption === 'turned_in_admin' ? 'Item at SSG Office' : 'Item Found',
        body: selectedOption === 'turned_in_admin'
          ? `Your ${item.name} has been turned in to the SSG Office. Please claim it during office hours.`
          : selectedOption === 'left_it'
          ? `Your ${item.name} was found at: ${locationNote.trim()}`
          : `Someone found your ${item.name} and wants to return it to you.`,
        data: { 
          item_id: id,
          item_name: item.name,
          action: selectedOption,
          location: locationNote.trim() || null,
          finder_name: finderName.trim() || 'Anonymous'
        },
      });

      if (notifError) {
        console.error('Failed to create notification:', notifError);
        // Don't throw - scan event is already recorded
      }

      const successMessage = selectedAction === 'turned_in_admin'
        ? 'The owner has been notified. Please bring the item to the CTU Daanbantayan Student Affairs Office during office hours (Monday-Friday, 8:00 AM - 5:00 PM).'
        : 'The owner has been notified about their item. Thank you for your honesty!';

      Alert.alert(
        '✅ Owner Notified!',
        successMessage,
        [
          {
            text: 'Done',
            onPress: () => {
              if (selectedAction === 'contact_owner') {
                // TODO: Navigate to chat
                router.push(`/chat/${id}`);
              } else {
                router.push('/');
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error('Error submitting action:', err);
      Alert.alert(
        'Error',
        err.message || 'Failed to notify owner. Please try again or contact support if the problem persists.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── LOADING STATE ──────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.spinner}>
          <Ionicons name="hourglass-outline" size={32} color="#F5C842" />
        </View>
        <Text style={[styles.loadingText, { fontSize: r.isTablet ? 14 : 13 }]}>
          Loading item details...
        </Text>
      </View>
    );
  }

  // ── ERROR STATE ────────────────────────────────────────────────
  if (error || !item) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle-outline" size={64} color="#D00803" />
        </View>
        <Text style={[styles.errorTitle, { fontSize: r.isTablet ? 26 : 22 }]}>
          Item Not Found
        </Text>
        <Text style={[styles.errorText, { fontSize: r.isTablet ? 15 : 13 }]}>
          This QR code is invalid or the item has been removed.
        </Text>
      </View>
    );
  }

  const { icon: catIcon, color: catColor } = getCategoryIcon(item.category);
  const selectedOption = ACTION_OPTIONS.find(a => a.id === selectedAction);

  return (
    <View style={styles.container}>
      
      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: r.headerTopPad }]}>
        <View style={[
          styles.headerInner,
          { paddingHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}>
          <View style={styles.logoWrap}>
            <Ionicons name="shield-checkmark" size={r.isTablet ? 26 : 22} color="#F5C842" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { fontSize: r.isTablet ? 22 : 18 }]}>
              Found Item Report
            </Text>
            <Text style={[styles.headerSub, { fontSize: r.isTablet ? 13 : 11 }]}>
              Help return this item to its owner
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── ITEM SUMMARY CARD ──────────────────────────────── */}
        <View style={styles.itemSummary}>
          <View style={[styles.itemIcon, { backgroundColor: `${catColor}15` }]}>
            <Ionicons name={catIcon} size={r.isTablet ? 28 : 24} color={catColor} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { fontSize: r.isTablet ? 18 : 16 }]}>
              {item.name}
            </Text>
            {item.category && (
              <Text style={[styles.itemCategory, { fontSize: r.isTablet ? 12 : 11 }]}>
                {item.category}
              </Text>
            )}
          </View>
        </View>

        {/* ── MAIN QUESTION ──────────────────────────────────── */}
        <View style={styles.questionSection}>
          <Text style={[styles.questionTitle, { fontSize: r.isTablet ? 20 : 18 }]}>
            What did you do with it?
          </Text>
          <Text style={[styles.questionSub, { fontSize: r.isTablet ? 14 : 13 }]}>
            Select one option below
          </Text>
        </View>

        {/* ── ACTION OPTIONS ─────────────────────────────────── */}
        <View style={styles.optionsGrid}>
          {ACTION_OPTIONS.map((option) => {
            const isSelected = selectedAction === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  { borderColor: isSelected ? option.color : 'rgba(26,22,17,0.1)' },
                ]}
                onPress={() => setSelectedAction(option.id)}
                activeOpacity={0.7}
              >
                <View style={styles.optionTop}>
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  {isSelected && (
                    <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text style={[styles.optionTitle, { fontSize: r.isTablet ? 15 : 14 }]}>
                  {option.title}
                </Text>
                <Text style={[styles.optionSubtitle, { fontSize: r.isTablet ? 12 : 11 }]}>
                  {option.subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── FOLLOW-UP INPUTS ───────────────────────────────── */}
        {selectedOption && (
          <View style={styles.followUpSection}>
            
            {/* Location input for turned_in and left_it */}
            {selectedOption.needsLocation && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { fontSize: r.isTablet ? 12 : 11 }]}>
                  WHERE EXACTLY? <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="location-outline" size={18} color="rgba(26,22,17,0.4)" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { fontSize: r.isTablet ? 15 : 14 }]}
                    placeholder={
                      selectedOption.id === 'turned_in'
                        ? 'e.g., Main Guard Post, Admin Office'
                        : 'e.g., Library 2nd floor, near entrance'
                    }
                    placeholderTextColor="rgba(26,22,17,0.35)"
                    value={locationNote}
                    onChangeText={setLocationNote}
                    multiline
                  />
                </View>
              </View>
            )}

            {/* Optional finder name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontSize: r.isTablet ? 12 : 11 }]}>
                YOUR NAME <Text style={styles.optional}>(Optional)</Text>
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color="rgba(26,22,17,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontSize: r.isTablet ? 15 : 14 }]}
                  placeholder="Leave blank to remain anonymous"
                  placeholderTextColor="rgba(26,22,17,0.35)"
                  value={finderName}
                  onChangeText={setFinderName}
                />
              </View>
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: selectedOption.color },
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <Text style={[styles.submitButtonText, { fontSize: r.isTablet ? 16 : 15 }]}>
                  Notifying Owner...
                </Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={r.isTablet ? 22 : 20} color="#FFFFFF" />
                  <Text style={[styles.submitButtonText, { fontSize: r.isTablet ? 16 : 15 }]}>
                    Notify Owner
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Privacy note */}
            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#F5C842" />
              <Text style={[styles.privacyText, { fontSize: r.isTablet ? 12 : 11 }]}>
                The owner will be notified via app and SMS. Your contact info will not be shared unless you choose to chat.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />

      </ScrollView>
    </View>
  );
}

// ── STYLES ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 24,
  },

  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    color: 'rgba(26,22,17,0.5)',
    fontWeight: '500',
  },

  errorIcon: {
    marginBottom: 20,
  },
  errorTitle: {
    fontWeight: '900',
    color: '#D00803',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    color: 'rgba(26,22,17,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 400,
  },

  // ── Header ──
  header: {
    backgroundColor: '#1A1611',
    paddingBottom: 20,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245,196,66,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,196,66,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '900',
    color: '#F5F0E8',
    letterSpacing: 0.5,
  },
  headerSub: {
    color: 'rgba(245,240,232,0.6)',
    marginTop: 2,
    lineHeight: 18,
  },

  // ── Body ──
  body: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 20,
    gap: 20,
  },

  // ── Item Summary ──
  itemSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(26,22,17,0.08)',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '800',
    color: '#1A1611',
    marginBottom: 2,
  },
  itemCategory: {
    color: 'rgba(26,22,17,0.5)',
    fontWeight: '600',
  },

  // ── Question ──
  questionSection: {
    marginTop: 8,
  },
  questionTitle: {
    fontWeight: '900',
    color: '#1A1611',
    marginBottom: 4,
  },
  questionSub: {
    color: 'rgba(26,22,17,0.55)',
  },

  // ── Options Grid ──
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  optionCardSelected: {
    borderWidth: 2,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  optionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionIcon: {
    fontSize: 32,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontWeight: '800',
    color: '#1A1611',
    marginBottom: 4,
  },
  optionSubtitle: {
    color: 'rgba(26,22,17,0.55)',
    lineHeight: 18,
  },

  // ── Follow-up Section ──
  followUpSection: {
    gap: 16,
    marginTop: 4,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontWeight: '700',
    color: '#1A1611',
    letterSpacing: 0.5,
  },
  required: {
    color: '#D00803',
  },
  optional: {
    color: 'rgba(26,22,17,0.4)',
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(26,22,17,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputIcon: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    color: '#1A1611',
    minHeight: 24,
  },

  // ── Submit Button ──
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Privacy Note ──
  privacyNote: {
    backgroundColor: 'rgba(245,196,66,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,196,66,0.25)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  privacyText: {
    flex: 1,
    color: 'rgba(26,22,17,0.7)',
    lineHeight: 18,
  },
});
