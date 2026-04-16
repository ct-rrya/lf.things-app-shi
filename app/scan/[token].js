import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors } from '../../styles/colors';

export default function ScanPage() {
  const { token } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  
  // Form state
  const [selectedOption, setSelectedOption] = useState(null); // 'turn_in' or 'have_it'
  const [finderName, setFinderName] = useState('');
  const [phone, setPhone] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [locationNote, setLocationNote] = useState('');

  useEffect(() => {
    fetchItem();
  }, [token]);

  async function fetchItem() {
    try {
      // Try qr_token first, fall back to id
      let { data, error } = await supabase
        .from('items')
        .select('id, name, description, category, status, user_id')
        .eq('qr_token', token)
        .maybeSingle();

      if (!data) {
        // Fallback: treat token as item id
        ({ data, error } = await supabase
          .from('items')
          .select('id, name, description, category, status, user_id')
          .eq('id', token)
          .maybeSingle());
      }

      if (error) throw error;
      setItem(data);
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    // Validation
    if (!selectedOption) {
      Alert.alert('Please Select an Option', 'Choose whether you\'ll turn it in or keep it with you.');
      return;
    }

    if (selectedOption === 'have_it') {
      // Check if at least one contact method is provided
      if (!phone.trim() && !facebook.trim() && !instagram.trim()) {
        Alert.alert(
          'Contact Info Required',
          'Please provide at least one way for the owner to contact you (phone, Facebook, or Instagram).'
        );
        return;
      }
    }

    try {
      // Create scan event
      const { error } = await supabase
        .from('scan_events')
        .insert({
          item_id: item.id,
          action: selectedOption,
          finder_name: finderName.trim() || 'Anonymous Finder',
          finder_phone: phone.trim() || null,
          finder_contact: facebook.trim() || instagram.trim() || null,
          finder_email: null,
          location_note: locationNote.trim() || null,
          finder_user_id: null,
        });

      if (error) throw error;

      // Update item status
      await supabase
        .from('items')
        .update({
          status: selectedOption === 'turn_in' ? 'at_admin' : 'located'
        })
        .eq('id', item.id);

      // Notify the owner via notifications table
      await supabase.from('notifications').insert({
        user_id: item.user_id,
        type: selectedOption === 'turn_in' ? 'item_turned_in' : 'item_located',
        title: selectedOption === 'turn_in' ? 'Item Turned In' : 'Item Located',
        body: selectedOption === 'turn_in'
          ? `Someone found your ${item.name} and turned it in to the SSG Office.`
          : `Someone found your ${item.name} and still has it. Check your notifications for contact details.`,
        data: { item_id: item.id },
      }).maybeSingle(); // ignore error if notifications table doesn't exist yet

      setSubmitted(true);
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit. Please try again.');
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingDots}>
          <View style={[styles.loadingDot, { opacity: 1 }]} />
          <View style={[styles.loadingDot, { opacity: 0.6 }]} />
          <View style={[styles.loadingDot, { opacity: 0.3 }]} />
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.ember} />
        </View>
        <Text style={styles.errorTitle}>Item Not Found</Text>
        <Text style={styles.errorText}>
          This QR code is invalid or the item has been removed.
        </Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#10b981" />
        </View>
        <Text style={styles.successTitle}>Thank You!</Text>
        <Text style={styles.successText}>
          {selectedOption === 'turn_in'
            ? 'The owner has been notified that their item is being turned in to the SSG Office.'
            : 'The owner has been notified and will contact you soon using the details you provided.'}
        </Text>
        <Text style={styles.successSubtext}>
          Your honesty helps reunite lost items with their owners. 🙏
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="qr-code" size={32} color={colors.gold} />
        </View>
        <Text style={styles.label}>FOUND ITEM</Text>
        <Text style={styles.title}>Help Return This</Text>
        <Text style={styles.subtitle}>Choose how you'd like to help</Text>
      </View>

      {/* Item Card */}
      <View style={styles.itemCard}>
        <View style={styles.itemIcon}>
          <Ionicons name="cube" size={28} color={colors.grape} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.itemDescription}>{item.description}</Text>
          )}
          {item.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Option Selection */}
      <View style={styles.optionsSection}>
        <Text style={styles.sectionTitle}>What would you like to do?</Text>

        {/* Option A: Turn it in */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            selectedOption === 'turn_in' && styles.optionCardSelected,
          ]}
          onPress={() => setSelectedOption('turn_in')}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <View style={[
              styles.optionRadio,
              selectedOption === 'turn_in' && styles.optionRadioSelected,
            ]}>
              {selectedOption === 'turn_in' && (
                <View style={styles.optionRadioDot} />
              )}
            </View>
            <View style={styles.optionIconWrap}>
              <Ionicons name="business" size={22} color="#10b981" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Turn it in to SSG Office</Text>
              <Text style={styles.optionSubtitle}>
                I'll surrender it to the Student Affairs Office
              </Text>
            </View>
          </View>
          {selectedOption === 'turn_in' && (
            <View style={styles.optionNote}>
              <Ionicons name="information-circle" size={14} color="#059669" />
              <Text style={styles.optionNoteText}>
                The owner will be notified to pick it up from the SSG Office
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Option B: I still have it */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            selectedOption === 'have_it' && styles.optionCardSelected,
          ]}
          onPress={() => setSelectedOption('have_it')}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <View style={[
              styles.optionRadio,
              selectedOption === 'have_it' && styles.optionRadioSelected,
            ]}>
              {selectedOption === 'have_it' && (
                <View style={styles.optionRadioDot} />
              )}
            </View>
            <View style={[styles.optionIconWrap, { backgroundColor: 'rgba(69,53,75,0.1)' }]}>
              <Ionicons name="hand-right" size={22} color={colors.grape} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>I still have it</Text>
              <Text style={styles.optionSubtitle}>
                I'll keep it safe and meet with the owner
              </Text>
            </View>
          </View>
          {selectedOption === 'have_it' && (
            <View style={styles.optionNote}>
              <Ionicons name="information-circle" size={14} color={colors.grape} />
              <Text style={styles.optionNoteText}>
                Provide at least one contact method below
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Contact Form (only if "have_it" selected) */}
      {selectedOption === 'have_it' && (
        <View style={styles.contactForm}>
          <Text style={styles.formTitle}>Your Contact Details</Text>
          <Text style={styles.formSubtitle}>
            At least one contact method is required
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>YOUR NAME (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Juan Dela Cruz"
              placeholderTextColor="rgba(69,53,75,0.35)"
              value={finderName}
              onChangeText={setFinderName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>PHONE NUMBER</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="call-outline" size={16} color="#8A8070" />
              <TextInput
                style={styles.inputField}
                placeholder="09XX XXX XXXX"
                placeholderTextColor="rgba(69,53,75,0.35)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>FACEBOOK</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="logo-facebook" size={16} color="#8A8070" />
              <TextInput
                style={styles.inputField}
                placeholder="Profile link or username"
                placeholderTextColor="rgba(69,53,75,0.35)"
                value={facebook}
                onChangeText={setFacebook}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>INSTAGRAM</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="logo-instagram" size={16} color="#8A8070" />
              <TextInput
                style={styles.inputField}
                placeholder="@username"
                placeholderTextColor="rgba(69,53,75,0.35)"
                value={instagram}
                onChangeText={setInstagram}
              />
            </View>
          </View>
        </View>
      )}

      {/* Location Note (optional for both) */}
      {selectedOption && (
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            {selectedOption === 'turn_in' ? 'ADDITIONAL NOTE (OPTIONAL)' : 'WHERE YOU FOUND IT (OPTIONAL)'}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={
              selectedOption === 'turn_in'
                ? 'Any additional details...'
                : 'e.g., Library 2nd floor, near entrance'
            }
            placeholderTextColor="rgba(69,53,75,0.35)"
            value={locationNote}
            onChangeText={setLocationNote}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Submit Button */}
      {selectedOption && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            selectedOption === 'turn_in' ? styles.submitButtonGreen : styles.submitButtonGrape,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Ionicons
            name={selectedOption === 'turn_in' ? 'business' : 'send'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.submitButtonText}>
            {selectedOption === 'turn_in' ? 'Confirm Turn In' : 'Notify Owner'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Privacy Banner */}
      <View style={styles.privacyBanner}>
        <Ionicons name="shield-checkmark" size={18} color="#059669" />
        <Text style={styles.privacyText}>
          {selectedOption === 'turn_in'
            ? 'No contact info needed. The owner will pick up from SSG Office.'
            : 'Only the contact details you provide will be shared with the owner.'}
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  content: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F0E8',
    gap: 16,
  },

  // Loading
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.grape,
  },
  loadingText: {
    fontSize: 13,
    color: 'rgba(69,53,75,0.5)',
    fontWeight: '500',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(219,179,84,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    color: colors.gold,
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.grape,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(69,53,75,0.5)',
    textAlign: 'center',
  },

  // Item Card
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(69,53,75,0.08)',
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemIcon: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(69,53,75,0.08)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.grape,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: 'rgba(69,53,75,0.6)',
    marginBottom: 6,
    lineHeight: 17,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(69,53,75,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    color: colors.grape,
    fontWeight: '600',
  },

  // Options Section
  optionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.grape,
    marginBottom: 14,
  },

  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E8E0D0',
  },
  optionCardSelected: {
    borderColor: colors.grape,
    backgroundColor: 'rgba(69,53,75,0.02)',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E8E0D0',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  optionRadioSelected: {
    borderColor: colors.grape,
  },
  optionRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.grape,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.grape,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 11,
    color: 'rgba(69,53,75,0.6)',
    lineHeight: 16,
  },
  optionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE3',
  },
  optionNoteText: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(69,53,75,0.7)',
    lineHeight: 16,
  },

  // Contact Form
  contactForm: {
    backgroundColor: 'rgba(69,53,75,0.03)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(69,53,75,0.08)',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.grape,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 11,
    color: 'rgba(69,53,75,0.6)',
    marginBottom: 14,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.grape,
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(69,53,75,0.12)',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: colors.grape,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(69,53,75,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.grape,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },

  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonGreen: {
    backgroundColor: '#10b981',
  },
  submitButtonGrape: {
    backgroundColor: colors.grape,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Privacy Banner
  privacyBanner: {
    backgroundColor: 'rgba(5,150,105,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(5,150,105,0.2)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    color: '#059669',
    lineHeight: 16,
    fontWeight: '500',
  },

  // Error State
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
    color: colors.ember,
  },
  errorText: {
    fontSize: 14,
    color: 'rgba(69,53,75,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Success State
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
    color: '#10b981',
  },
  successText: {
    fontSize: 15,
    color: colors.grape,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  successSubtext: {
    fontSize: 13,
    color: 'rgba(69,53,75,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
