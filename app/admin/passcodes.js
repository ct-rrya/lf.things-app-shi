import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';

export default function AdminPasscodes() {
  const [passcodes, setPasscodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchPasscodes();
  }, []);

  async function fetchPasscodes() {
    try {
      const { data, error } = await supabase
        .from('admin_passcodes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPasscodes(data || []);
    } catch (err) {
      console.error('Error fetching passcodes:', err);
      Alert.alert('Error', 'Failed to load passcodes');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPasscode() {
    if (!newPasscode.trim() || !newName.trim()) {
      Alert.alert('Error', 'Passcode and name are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_passcodes')
        .insert({
          passcode: newPasscode.trim(),
          name: newName.trim(),
          description: newDescription.trim() || null,
          is_active: true,
        });
      
      if (error) throw error;
      
      Alert.alert('Success', 'Passcode added successfully');
      setShowAddModal(false);
      setNewPasscode('');
      setNewName('');
      setNewDescription('');
      fetchPasscodes();
    } catch (err) {
      console.error('Error adding passcode:', err);
      Alert.alert('Error', err.message || 'Failed to add passcode');
    }
  }

  async function togglePasscodeActive(id, currentActive) {
    try {
      const { error } = await supabase
        .from('admin_passcodes')
        .update({ is_active: !currentActive })
        .eq('id', id);
      
      if (error) throw error;
      
      fetchPasscodes();
    } catch (err) {
      console.error('Error toggling passcode:', err);
      Alert.alert('Error', 'Failed to update passcode');
    }
  }

  async function deletePasscode(id) {
    Alert.alert(
      'Delete Passcode',
      'Are you sure you want to delete this passcode?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('admin_passcodes')
                .delete()
                .eq('id', id);
              
              if (error) throw error;
              
              fetchPasscodes();
            } catch (err) {
              console.error('Error deleting passcode:', err);
              Alert.alert('Error', 'Failed to delete passcode');
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Admin Passcodes</Text>
        <Text style={styles.pageSub}>Manage access codes for admin portal</Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add New Passcode</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading passcodes...</Text>
        </View>
      ) : passcodes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="key-outline" size={48} color="#E8E0D0" />
          <Text style={styles.emptyText}>No passcodes found</Text>
          <Text style={styles.emptySub}>Add your first passcode to get started</Text>
        </View>
      ) : (
        <View style={styles.passcodesList}>
          {passcodes.map((passcode) => (
            <View key={passcode.id} style={styles.passcodeCard}>
              <View style={styles.passcodeHeader}>
                <View style={styles.passcodeInfo}>
                  <Text style={styles.passcodeName}>{passcode.name}</Text>
                  <Text style={styles.passcodeCode}>{passcode.passcode}</Text>
                  {passcode.description && (
                    <Text style={styles.passcodeDesc}>{passcode.description}</Text>
                  )}
                </View>
                <View style={styles.passcodeActions}>
                  <TouchableOpacity
                    style={[styles.statusButton, passcode.is_active && styles.statusActive]}
                    onPress={() => togglePasscodeActive(passcode.id, passcode.is_active)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.statusText}>
                      {passcode.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deletePasscode(passcode.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#E53935" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.passcodeFooter}>
                <Text style={styles.passcodeDate}>
                  Created: {new Date(passcode.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add Passcode Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Passcode</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#8A8070" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Passcode *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter passcode"
                  value={newPasscode}
                  onChangeText={setNewPasscode}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., Main Admin Passcode"
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Description (optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., For admin portal access"
                  value={newDescription}
                  onChangeText={setNewDescription}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleAddPasscode}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveText}>Add Passcode</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  content: { padding: 28, gap: 24 },
  pageHeader: { gap: 4 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1A1611' },
  pageSub: { fontSize: 13, color: '#8A8070' },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A1611',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#8A8070' },

  emptyContainer: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#8A8070' },
  emptySub: { fontSize: 13, color: '#B8AFA4', textAlign: 'center' },

  passcodesList: { gap: 12 },
  passcodeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  passcodeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  passcodeInfo: { flex: 1, gap: 4 },
  passcodeName: { fontSize: 15, fontWeight: '700', color: '#1A1611' },
  passcodeCode: {
    fontSize: 13,
    fontFamily: 'monospace',
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  passcodeDesc: { fontSize: 13, color: '#8A8070', marginTop: 4 },
  passcodeActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#43A047',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E53935',
  },
  statusActiveText: {
    color: '#43A047',
  },
  deleteButton: { padding: 6 },
  passcodeFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F0E8' },
  passcodeDate: { fontSize: 11, color: '#B8AFA4' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,22,17,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D0',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1611' },
  modalBody: { padding: 24, gap: 20 },
  modalInputGroup: { gap: 8 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#1A1611' },
  modalInput: {
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1611',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D0',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#8A8070' },
  modalSaveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1A1611',
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});