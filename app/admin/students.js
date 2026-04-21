import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';
import { CTU_PROGRAMS, CTU_YEAR_LEVELS } from '../../lib/ctuConstants';
import { logStudentChange, AuditActions } from '../../lib/auditLog';

// UPDATED: Removed full_name, changed year_level to year_level (keep as is)
const EMPTY_FORM = { 
  student_id: '', 
  first_name: '', 
  last_name: '', 
  middle_name: '',
  email: '', 
  program: '', 
  year_level: '', 
  section: '',
  phone_number: ''
};

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // Show all by default
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [importing, setImporting] = useState(false);

  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetchStudents(); }, [filterProgram, filterStatus]);

  async function fetchStudents() {
    setLoading(true);
    try {
      let query = supabase.from('students').select('*').order('last_name');
      if (filterStatus) query = query.eq('status', filterStatus);
      if (filterProgram) query = query.eq('program', filterProgram);
      const { data, error } = await query;
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  // UPDATED: Search by first_name + last_name
  const filtered = students.filter(s => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) ||
      s.student_id.includes(search);
  });

  // UPDATED: Handle add student with new schema
  async function handleAddStudent() {
    if (!form.student_id || !form.first_name || !form.last_name || !form.program || !form.year_level) {
      Alert.alert('Missing Fields', 'Student ID, First Name, Last Name, Program and Year Level are required.');
      return;
    }
    setSaving(true);
    try {
      const studentData = {
        student_id: form.student_id.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        middle_name: form.middle_name.trim() || null,
        email: form.email.trim(),
        program: form.program,
        year_level: form.year_level,
        section: form.section.trim(),
        phone_number: form.phone_number.trim() || null,
        status: 'active',
      };
      
      const { data, error } = await supabase.from('students').insert([studentData]).select().single();
      if (error) throw error;
      
      await logStudentChange(AuditActions.STUDENT_ADDED, data.student_id, null, studentData);
      
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      fetchStudents();
      Alert.alert('Success', `${form.first_name} ${form.last_name} has been added to the master list.`);
    } catch (err) {
      Alert.alert('Error', err.message.includes('unique') ? 'Student ID already exists.' : err.message);
    } finally {
      setSaving(false);
    }
  }

  // Toggle status remains the same
  function confirmToggleStatus(student) {
    const next = student.status === 'active' ? 'inactive' : 'active';
    setConfirm({
      message: `Are you sure you want to ${next === 'inactive' ? 'deactivate' : 'activate'} ${student.first_name} ${student.last_name}?`,
      detail: next === 'inactive'
        ? 'They will no longer be able to sign in.'
        : 'They will be able to sign in again.',
      danger: next === 'inactive',
      onConfirm: () => toggleStatus(student, next),
    });
  }

  async function toggleStatus(student, next) {
    const { error } = await supabase.from('students').update({ status: next }).eq('student_id', student.student_id);
    if (error) { Alert.alert('Error', error.message); return; }
    
    await logStudentChange(
      AuditActions.STUDENT_STATUS_CHANGED,
      student.student_id,
      { status: student.status, full_name: `${student.first_name} ${student.last_name}` },
      { status: next, full_name: `${student.first_name} ${student.last_name}` }
    );
    
    fetchStudents();
  }

  // UPDATED: CSV Import with new schema
  function downloadTemplate() {
    const header = 'student_id,first_name,last_name,middle_name,email,program,year_level,section,phone_number';
    const example = '21-12345,Juan,Dela Cruz,Cruz,juan@example.com,BSIT,1st Year,A,09123456789';
    const csv = `${header}\n${example}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ctu_students_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { setCsvErrors(['CSV must have a header row and at least one data row.']); return; }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const required = ['student_id', 'first_name', 'last_name', 'program', 'year_level'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length) {
      setCsvErrors([`Missing required columns: ${missing.join(', ')}`]);
      setCsvPreview([]);
      return;
    }

    const rows = [];
    const errors = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });

      if (!row.student_id) { errors.push(`Row ${i}: missing student_id`); continue; }
      if (!row.first_name)  { errors.push(`Row ${i}: missing first_name`); continue; }
      if (!row.last_name)  { errors.push(`Row ${i}: missing last_name`); continue; }
      if (!row.program)    { errors.push(`Row ${i}: missing program`); continue; }
      if (!row.year_level) { errors.push(`Row ${i}: missing year_level`); continue; }

      rows.push({
        student_id: row.student_id,
        first_name: row.first_name,
        last_name: row.last_name,
        middle_name: row.middle_name || null,
        email: row.email || null,
        program: row.program,
        year_level: row.year_level,
        section: row.section || null,
        phone_number: row.phone_number || null,
        status: 'active',
      });
    }
    setCsvPreview(rows);
    setCsvErrors(errors);
  }

  async function handleImport() {
    if (!csvPreview.length) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.from('students').upsert(csvPreview, { onConflict: 'student_id' }).select();
      if (error) throw error;
      
      await logStudentChange(
        AuditActions.STUDENT_IMPORTED,
        null,
        null,
        { count: csvPreview.length, students: csvPreview.map(s => s.student_id) }
      );
      
      setShowImportModal(false);
      setCsvText('');
      setCsvPreview([]);
      setCsvErrors([]);
      fetchStudents();
      Alert.alert('Import Complete', `${csvPreview.length} students imported successfully.`);
    } catch (err) {
      Alert.alert('Import Failed', err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Students</Text>
          <Text style={styles.pageSub}>{filtered.length} student{filtered.length !== 1 ? 's' : ''} found</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowImportModal(true)} activeOpacity={0.8}>
            <Ionicons name="cloud-upload-outline" size={16} color="#1A1611" />
            <Text style={styles.btnSecondaryText}>Import CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={16} color="#1A1611" />
            <Text style={styles.btnPrimaryText}>Add Student</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTERS */}
      <View style={styles.filters}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={15} color="#8A8070" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID…"
            placeholderTextColor="#B8AFA4"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          {['active', 'inactive', 'graduated', ''].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
              onPress={() => setFilterStatus(s)}
            >
              <Text style={[styles.filterChipText, filterStatus === s && styles.filterChipTextActive]}>
                {s || 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* TABLE */}
      <ScrollView style={styles.tableWrap} showsVerticalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.cell, styles.headCell]}>Student ID</Text>
            <Text style={[styles.cell, styles.headCell, { flex: 2 }]}>Full Name</Text>
            <Text style={[styles.cell, styles.headCell]}>Program</Text>
            <Text style={[styles.cell, styles.headCell]}>Year</Text>
            <Text style={[styles.cell, styles.headCell]}>Section</Text>
            <Text style={[styles.cell, styles.headCell, { flex: 1.5 }]}>Email</Text>
            <Text style={[styles.cell, styles.headCell]}>Phone</Text>
            <Text style={[styles.cell, styles.headCell]}>Status</Text>
            <Text style={[styles.cell, styles.headCell]}></Text>
          </View>
          {loading ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>Loading…</Text></View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>No students found</Text></View>
          ) : filtered.map((s) => (
            <View key={s.student_id} style={styles.tableRow}>
              <Text style={[styles.cell, styles.idCell]}>{s.student_id}</Text>
              <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>
                {s.first_name} {s.last_name}
                {s.middle_name ? ` ${s.middle_name}` : ''}
              </Text>
              <Text style={[styles.cell, styles.subCell]}>{s.program || '—'}</Text>
              <Text style={[styles.cell, styles.subCell]}>{s.year_level || '—'}</Text>
              <Text style={[styles.cell, styles.subCell]}>{s.section || '—'}</Text>
              <Text style={[styles.cell, styles.emailCell]} numberOfLines={1}>
                {s.email || '—'}
              </Text>
              <Text style={[styles.cell, styles.subCell]}>{s.phone_number || '—'}</Text>
              <View style={styles.cell}>
                <View style={[styles.statusBadge, s.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, s.status === 'active' ? styles.badgeTextActive : styles.badgeTextInactive]}>
                    {s.status}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.cell} onPress={() => confirmToggleStatus(s)} activeOpacity={0.7}>
                <Text style={styles.toggleText}>
                  {s.status === 'active' ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ADD STUDENT MODAL - UPDATED */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Student</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#1A1611" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {[
                { key: 'student_id', label: 'Student ID *', placeholder: '21-12345' },
                { key: 'first_name', label: 'First Name *', placeholder: 'Juan' },
                { key: 'last_name',  label: 'Last Name *',  placeholder: 'Dela Cruz' },
                { key: 'middle_name',label: 'Middle Name', placeholder: 'Optional' },
                { key: 'email',      label: 'Email *',     placeholder: 'juan@ctu.edu.ph' },
                { key: 'section',    label: 'Section',     placeholder: 'e.g., A' },
                { key: 'phone_number', label: 'Phone Number', placeholder: 'Optional' },
              ].map((f) => (
                <View key={f.key} style={styles.formGroup}>
                  <Text style={styles.formLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder={f.placeholder}
                    placeholderTextColor="#B8AFA4"
                    value={form[f.key]}
                    onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                  />
                </View>
              ))}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Program *</Text>
                <View style={styles.chipGroup}>
                  {CTU_PROGRAMS.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.chip, form.program === p && styles.chipActive]}
                      onPress={() => setForm({ ...form, program: p })}
                    >
                      <Text style={[styles.chipText, form.program === p && styles.chipTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Year Level *</Text>
                <View style={styles.chipGroup}>
                  {CTU_YEAR_LEVELS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.chip, form.year_level === y && styles.chipActive]}
                      onPress={() => setForm({ ...form, year_level: y })}
                    >
                      <Text style={[styles.chipText, form.year_level === y && styles.chipTextActive]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowAddModal(false)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, saving && { opacity: 0.6 }]} onPress={handleAddStudent} disabled={saving}>
                <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Add Student'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONFIRM MODAL - Same */}
      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxWidth: 360 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Action</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={{ fontSize: 14, color: '#1A1611', lineHeight: 22 }}>{confirm?.message}</Text>
              {confirm?.detail && <Text style={{ fontSize: 13, color: '#8A8070', marginTop: 6 }}>{confirm.detail}</Text>}
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setConfirm(null)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, confirm?.danger && { backgroundColor: '#E53935' }]}
                onPress={() => { confirm?.onConfirm(); setConfirm(null); }}
              >
                <Text style={[styles.btnPrimaryText, confirm?.danger && { color: '#FFFFFF' }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CSV IMPORT MODAL - Updated */}
      <Modal visible={showImportModal} transparent animationType="fade" onRequestClose={() => setShowImportModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxWidth: 600 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Students via CSV</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#1A1611" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.csvInfo}>
                <Ionicons name="information-circle-outline" size={16} color="#5B8CFF" />
                <Text style={styles.csvInfoText}>
                  Required columns: <Text style={{ fontWeight: '700' }}>student_id, first_name, last_name, program, year_level</Text>{'\n'}
                  Optional: middle_name, email, section, phone_number{'\n'}
                  First row must be the header. Existing student IDs will be updated.
                </Text>
              </View>

              <TouchableOpacity style={styles.templateBtn} onPress={downloadTemplate} activeOpacity={0.8}>
                <Ionicons name="download-outline" size={15} color="#43A047" />
                <Text style={styles.templateBtnText}>Download CSV Template</Text>
              </TouchableOpacity>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Paste CSV content</Text>
                <TextInput
                  style={[styles.formInput, styles.csvTextArea]}
                  placeholder={'student_id,first_name,last_name,middle_name,email,program,year_level,section,phone_number\n21-12345,Juan,Dela Cruz,Cruz,juan@example.com,BSIT,1st Year,A,09123456789'}
                  placeholderTextColor="#B8AFA4"
                  value={csvText}
                  onChangeText={(v) => { setCsvText(v); setCsvPreview([]); setCsvErrors([]); }}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity style={styles.btnSecondary} onPress={() => parseCSV(csvText)}>
                <Ionicons name="eye-outline" size={15} color="#1A1611" />
                <Text style={styles.btnSecondaryText}>Preview</Text>
              </TouchableOpacity>

              {csvErrors.length > 0 && (
                <View style={styles.errorBox}>
                  {csvErrors.map((e, i) => <Text key={i} style={styles.errorText}>⚠ {e}</Text>)}
                </View>
              )}

              {csvPreview.length > 0 && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>{csvPreview.length} rows ready to import</Text>
                  {csvPreview.slice(0, 5).map((r, i) => (
                    <Text key={i} style={styles.previewRow}>
                      {r.student_id} — {r.first_name} {r.last_name} ({r.program}, {r.year_level})
                    </Text>
                  ))}
                  {csvPreview.length > 5 && (
                    <Text style={styles.previewMore}>…and {csvPreview.length - 5} more</Text>
                  )}
                </View>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowImportModal(false)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, (!csvPreview.length || importing) && { opacity: 0.5 }]}
                onPress={handleImport}
                disabled={!csvPreview.length || importing}
              >
                <Ionicons name="cloud-upload-outline" size={15} color="#1A1611" />
                <Text style={styles.btnPrimaryText}>{importing ? 'Importing…' : `Import ${csvPreview.length} Students`}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 28, paddingBottom: 16,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1A1611' },
  pageSub: { fontSize: 13, color: '#8A8070', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10 },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5C842', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10,
  },
  btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#1A1611' },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D0',
  },
  btnSecondaryText: { fontSize: 13, fontWeight: '600', color: '#1A1611' },

  filters: { paddingHorizontal: 28, gap: 10, marginBottom: 12 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1,
    borderColor: '#E8E0D0', paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1611', ...(Platform.OS === 'web' && { outlineWidth: 0 }) },
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#8A8070' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E0D0',
  },
  filterChipActive: { backgroundColor: '#1A1611', borderColor: '#1A1611' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#8A8070' },
  filterChipTextActive: { color: '#FFFFFF' },

  tableWrap: { flex: 1, paddingHorizontal: 28 },
  table: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#E8E0D0', 
    overflow: 'hidden', 
    marginBottom: 24,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tableRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F0E8' 
  },
  tableHead: { 
    backgroundColor: '#FAF8F3', 
    borderBottomWidth: 2,
    borderBottomColor: '#E8E0D0',
    paddingVertical: 12,
  },
  cell: { flex: 1, fontSize: 13 },
  headCell: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#5A5248', 
    letterSpacing: 1, 
    textTransform: 'uppercase' 
  },
  idCell: { 
    fontWeight: '700', 
    color: '#1A1611', 
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  nameCell: { flex: 2, fontWeight: '600', color: '#1A1611', fontSize: 14 },
  emailCell: { flex: 1.5, color: '#5A5248', fontSize: 12, fontWeight: '500' },
  registeredBadge: { color: '#43A047', fontWeight: '700', fontSize: 11 },
  subCell: { color: '#8A8070', fontSize: 12 },
  statusBadge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeActive: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  badgeInactive: { backgroundColor: '#FFF3E0', borderColor: '#FFE082' },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  badgeTextActive: { color: '#2E7D32' },
  badgeTextInactive: { color: '#F57C00' },
  toggleText: { fontSize: 12, color: '#5B8CFF', fontWeight: '600' },
  emptyRow: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#8A8070', fontSize: 13 },

  overlay: { flex: 1, backgroundColor: 'rgba(26,22,17,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: {
    backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 480,
    maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E0D0',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A1611' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20, gap: 14 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#E8E0D0', justifyContent: 'flex-end' },

  formGroup: { gap: 6 },
  formLabel: { fontSize: 10, fontWeight: '700', color: '#1A1611', letterSpacing: 1, textTransform: 'uppercase' },
  formInput: {
    backgroundColor: '#F5F0E8', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D0',
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, color: '#1A1611',
    ...(Platform.OS === 'web' && { outlineWidth: 0 }),
  },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: '#E8E0D0' },
  chipActive: { backgroundColor: '#1A1611', borderColor: '#1A1611' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#8A8070' },
  chipTextActive: { color: '#FFFFFF' },

  csvInfo: { flexDirection: 'row', gap: 8, backgroundColor: '#EEF2FF', borderRadius: 10, padding: 12 },
  csvInfoText: { flex: 1, fontSize: 12, color: '#3B4FBF', lineHeight: 18 },
  templateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  templateBtnText: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  csvTextArea: { height: 140, textAlignVertical: 'top' },
  errorBox: { backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, gap: 4 },
  errorText: { fontSize: 12, color: '#E53935' },
  previewBox: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, gap: 4 },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#43A047', marginBottom: 4 },
  previewRow: { fontSize: 12, color: '#2E7D32' },
  previewMore: { fontSize: 12, color: '#8A8070', marginTop: 4 },
});
