// Lost Report Modal - Form for reporting lost items

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, ScrollView, Platform,
  ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors } from '../styles/colors';
import { showAlert } from '../lib/alert';

export default function LostReportModal({ visible, onClose, item, existingReport, onSuccess }) {
  const [lastSeenLocation, setLastSeenLocation] = useState(existingReport?.last_seen_location || '');
  const [lastSeenDate, setLastSeenDate] = useState(
    existingReport?.last_seen_date 
      ? new Date(existingReport.last_seen_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [circumstances, setCircumstances] = useState(existingReport?.circumstances || '');
  const [notes, setNotes] = useState(existingReport?.notes || '');
  const [loading, setLoading] = useState(false);

  const isEditMode = !!existingReport;

  async function handleSubmit() {
    // Validation
    if (!lastSeenLocation.trim()) {
      showAlert('Location Required', 'Please enter where you last saw this item.');
      return;
    }

    if (!lastSeenDate) {
      showAlert('Date Required', 'Please select when you last saw this item.');
      return;
    }

    if (!circumstances.trim()) {
      showAlert('Circumstances Required', 'Please describe how you lost this item.');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to report a lost item');
      }

      if (isEditMode) {
        // Update existing report
        const { error: updateError } = await supabase
          .from('lost_reports')
          .update({
            last_seen_location: lastSeenLocation.trim(),
            last_seen_date: lastSeenDate,
            circumstances: circumstances.trim(),
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReport.id);

        if (updateError) throw updateError;

        showAlert('✅ Report Updated', 'Your lost item report has been updated successfully.');
      } else {
        // Create new report
        const { error: insertError } = await supabase
          .from('lost_reports')
          .insert([{
            item_id: item.id,
            user_id: user.id,
            last_seen_location: lastSeenLocation.trim(),
            last_seen_date: lastSeenDate,
            circumstances: circumstances.trim(),
            notes: notes.trim() || null,
            status: 'reported',
          }]);

        if (insertError) throw insertError;

        // Update item status to 'lost'
        const { error: statusError } = await supabase
          .from('items')
          .update({ status: 'lost' })
          .eq('id', item.id);

        if (statusError) throw statusError;

        showAlert(
          '✅ Report Submitted',
          'Your lost item report has been submitted. We\'ll notify you if anyone finds it.',
          [{ text: 'OK', onPress: () => {
            onSuccess?.();
            onClose();
          }}]
        );
      }

      if (isEditMode) {
        onSuccess?.();
        onClose();
      }

    } catch (error) {
      console.error('Error submitting lost report:', error);
      showAlert(
        'Submission Failed',
        error.message || 'Could not submit your report. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (!isEditMode) {
      // Reset form only if creating new report
      setLastSeenLocation('');
      setLastSeenDate(new Date().toISOString().split('T')[0]);
      setCircumstances('');
      setNotes('');
    }
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="alert-circle" size={22} color={colors.grape} />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {isEditMode ? 'Update Lost Report' : 'Report Lost Item'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {item?.name || 'Item'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleCancel}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color="#8A8070" />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Last Seen Location */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                LAST SEEN LOCATION <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.helperText}>
                Where did you last see or use this item?
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="location-outline" size={16} color="#8A8070" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Library, 2nd floor near computers"
                  placeholderTextColor="#B8AFA4"
                  value={lastSeenLocation}
                  onChangeText={setLastSeenLocation}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Last Seen Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                DATE LAST SEEN <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.helperText}>
                When did you last have this item?
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="calendar-outline" size={16} color="#8A8070" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#B8AFA4"
                  value={lastSeenDate}
                  onChangeText={setLastSeenDate}
                  editable={!loading}
                  keyboardType="default"
                />
              </View>
              <Text style={styles.dateHint}>
                Format: YYYY-MM-DD (e.g., 2026-04-21)
              </Text>
            </View>

            {/* Circumstances */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                HOW DID YOU LOSE IT? <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.helperText}>
                Describe the circumstances of how you lost this item
              </Text>
              <TextInput
                style={[styles.inputWrap, styles.textArea]}
                placeholder="e.g., I left it on a table in the cafeteria during lunch break. When I came back 10 minutes later, it was gone."
                placeholderTextColor="#B8AFA4"
                value={circumstances}
                onChangeText={setCircumstances}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>

            {/* Additional Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                ADDITIONAL NOTES
                <Text style={styles.optional}> (optional)</Text>
              </Text>
              <Text style={styles.helperText}>
                Any other details that might help locate your item
              </Text>
              <TextInput
                style={[styles.inputWrap, styles.textArea]}
                placeholder="e.g., I've checked with the security office and cafeteria staff but no one has seen it."
                placeholderTextColor="#B8AFA4"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
              <Text style={styles.infoBannerText}>
                {isEditMode 
                  ? 'Update your report with any new information that might help locate your item.'
                  : 'After submitting, your item will be marked as lost and you\'ll be notified if anyone finds it.'
                }
              </Text>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.buttonPrimaryText}>
                    {isEditMode ? 'Update Report' : 'Submit Report'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 22, 17, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F5F0E8',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  // Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(94, 53, 177, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1611',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#8A8070',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(138, 128, 112, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  // Form
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1611',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  required: {
    color: '#E53935',
  },
  optional: {
    color: '#8A8070',
    fontWeight: '500',
    fontSize: 9,
    letterSpacing: 0.3,
    textTransform: 'none',
  },
  helperText: {
    fontSize: 11,
    color: '#8A8070',
    marginBottom: 8,
    lineHeight: 16,
  },
  inputWrap: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#1A1611',
    fontSize: 14,
    paddingVertical: 12,
  },
  textArea: {
    paddingVertical: 12,
    paddingHorizontal: 13,
    minHeight: 100,
    alignItems: 'flex-start',
  },
  dateHint: {
    fontSize: 10,
    color: '#8A8070',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 17,
  },

  // Footer
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D0',
    backgroundColor: '#FFFFFF',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(138, 128, 112, 0.1)',
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1611',
  },
  buttonPrimary: {
    backgroundColor: colors.grape,
    shadowColor: colors.grape,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
