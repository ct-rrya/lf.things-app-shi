import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { createLostReport } from '../lib/lostReportService';

export default function LostReportForm({ item, userId, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [lastSeenLocation, setLastSeenLocation] = useState('');
  const [lastSeenDate, setLastSeenDate] = useState('');
  const [circumstances, setCircumstances] = useState('');
  const [notes, setNotes] = useState('');

  const validateForm = () => {
    if (!lastSeenLocation.trim()) {
      Alert.alert('Validation Error', 'Please enter where you last saw the item');
      return false;
    }

    if (!lastSeenDate.trim()) {
      Alert.alert('Validation Error', 'Please enter when you last saw the item');
      return false;
    }

    // Basic date validation (YYYY-MM-DD format)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(lastSeenDate)) {
      Alert.alert('Validation Error', 'Please enter date in YYYY-MM-DD format');
      return false;
    }

    if (!circumstances.trim()) {
      Alert.alert('Validation Error', 'Please describe how the item was lost');
      return false;
    }

    if (circumstances.trim().length < 20) {
      Alert.alert('Validation Error', 'Please provide more details (at least 20 characters)');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    Alert.alert(
      'Confirm Lost Report',
      'Are you sure you want to report this item as lost? This will change the item status and notify others.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);

            try {
              const result = await createLostReport({
                itemId: item.id,
                userId,
                lastSeenLocation: lastSeenLocation.trim(),
                lastSeenDate,
                circumstances: circumstances.trim(),
                notes: notes.trim(),
              });

              if (result.success) {
                Alert.alert('Success', 'Lost report submitted successfully', [
                  {
                    text: 'OK',
                    onPress: () => onSuccess(result.report),
                  },
                ]);
              } else {
                Alert.alert('Error', result.error);
              }
            } catch (error) {
              console.error('Submit error:', error);
              Alert.alert('Error', 'Failed to submit lost report');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report Lost Item</Text>
        <Text style={styles.subtitle}>
          Fill out this form to formally report your item as lost
        </Text>
      </View>

      {/* Item Info */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Last Seen Location <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Library 3rd Floor, Cafeteria, Classroom 201"
            value={lastSeenLocation}
            onChangeText={setLastSeenLocation}
            autoCapitalize="words"
          />
          <Text style={styles.hint}>
            Be as specific as possible to help others identify the location
          </Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Last Seen Date <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (e.g., 2026-04-21)"
            value={lastSeenDate}
            onChangeText={setLastSeenDate}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.hint}>
            Enter the date when you last had or saw the item
          </Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            How was it lost? <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Describe the circumstances of how you lost the item. Include details like what you were doing, where you were going, etc."
            value={circumstances}
            onChangeText={setCircumstances}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>
            {circumstances.length}/20 characters minimum
          </Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Any other information that might help locate your item"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>What happens next?</Text>
        <Text style={styles.infoText}>
          • Your item status will change to "Lost"{'\n'}
          • You'll receive notifications when someone scans your QR code{'\n'}
          • Finders can contact you through the app{'\n'}
          • You can update this report if the item is found
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  itemInfo: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  form: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: '#ff3b30',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textarea: {
    height: 120,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#ff3b30',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
