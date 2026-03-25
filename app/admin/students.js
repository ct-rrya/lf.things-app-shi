import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';
import { CTU_PROGRAMS, CTU_YEAR_LEVELS } from '../../lib/ctuConstants';

const EMPTY_FORM = { student_id: '', full_name: '', email: '', program: '', year_level: '', section: '' };

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => { fetchStudents(); }, [filterProgram, filterStatus]);

  async function fetchStudents() {
    setLoading(true);
    try {
      let query = supabase.from('students').select('*').order('full_name');
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

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.includes(search)
  );

  // ── Add single student ────────────────────────────────────────
  async function handleAddStudent() {
    if (!form.student_id || !form.full_name || !form.program || !form.year_level) {
      Alert.alert('Missing Fields', 'Student ID, Full Name, Program and Year Level are required.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('students').insert([{
        ...form,
        student_id: form.student_id.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        section: form.section.trim() || null,
      }]);
      if (error) throw error;
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      fetchStudents();
      Alert.alert('Success', `${form.full_name} has been added to the master list.`);
    } catch (err) {
      Alert.alert('Error', err.message.includes('unique') ? 'Student ID already exists.' : err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle student status ─────────────────────────────────────
  async function toggleStatus(student) {
    const next = student.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('students').update({ status: next }).eq('id', student.id);
    if (error) { Alert.alert('Error', error.message); return; }
    fetchStudents();
  }

  // ── CSV Import ────────────────────────────────────────────────
  function downloadTemplate() {
    const header = 'student_id,full_name,email,program,year_level,section';
    const example = '21-12345,Juan Dela Cruz,juan@example.com,BSIT,1st Year,A';
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
    const required = ['student_id', 'full_name', 'program', 'year_level'];
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
      if (!row.full_name)  { errors.push(`Row ${i}: missing full_name`); continue; }
      if (!row.program)    { errors.push(`Row ${i}: missing program`); continue; }
      if (!row.year_level) { errors.push(`Row ${i}: missing year_level`); continue; }

      rows.push({
        student_id: row.student_id,
        full_name: row.full_name,
        email: row.email || null,
        program: row.program,
        year_level: row.year_level,
        section: row.section || null,
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
      const { error } = await supabase.from('students').upsert(csvPreview, { onConflict: 'student_id' });
      if (error) throw error;
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
      {/* ── PAGE HEADER ── */}
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

      {/* ── FILTERS ── */}
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

      {/* ── TABLE ── */}
      <ScrollView style={styles.tableWrap} showsVerticalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            {['Student ID', 'Full Name', 'Program', 'Year', 'Section', 'Status', ''].map((h) => (
              <Text key={h} style={[styles.cell, styles.headCell]}>{h}</Text>
            ))}
          </View>
          {loading ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>Loading…</Text></View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>No students found</Text></View>
          ) : filtered.map((s) => (
            <View key={s.id} style={styles.tableRow}>
              <Text style={[styles.cell, styles.idCell]}>{s.student_id}</Text>
              <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>{s.full_name}</Text>
              <Text style={[styles.cell, styles.subCell]}>{s.program}</Text>
              <Text style={[styles.cell, styles.subCell]}>{s.year_level}</Text>
              <Text style={[styles.cell, styles.subCell]}>{s.section || '—'}</Text>
              <View style={styles.cell}>
                <View style={[styles.statusBadge, s.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, s.status === 'active' ? styles.badgeTextActive : styles.badgeTextInactive]}>
                    {s.status}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.cell} onPress={() => toggleStatus(s)} activeOpacity={0.7}>
                <Text style={styles.toggleText}>
                  {s.status === 'active' ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── ADD STUDENT MODAL ── */}
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
                { key: 'full_name',  label: 'Full Name *',  placeholder: 'Juan Dela Cruz' },
                { key: 'email',      label: 'Email',        placeholder: 'optional' },
                { key: 'section',    label: 'Section',      placeholder: 'e.g. 3A' },
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

      {/* ── CSV IMPORT MODAL ── */}
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
                  Required columns: <Text style={{ fontWeight: '700' }}>student_id, full_name, program, year_level</Text>{'\n'}
                  Optional: email, section{'\n'}
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
                  placeholder={'student_id,full_name,program,year_level,section\n21-12345,Juan Dela Cruz,BSIT,1st Year,A'}
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
                      {r.student_id} — {r.full_name} ({r.program}, {r.year_level})
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
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E0D0',
  },
  filterChipActive: { backgroundColor: '#1A1611', borderColor: '#1A1611' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#8A8070' },
  filterChipTextActive: { color: '#FFFFFF' },

  tableWrap: { flex: 1, paddingHorizontal: 28 },
  table: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8E0D0', overflow: 'hidden', marginBottom: 24 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F5F0E8' },
  tableHead: { backgroundColor: '#F5F0E8', borderBottomColor: '#E8E0D0' },
  cell: { flex: 1, fontSize: 13 },
  headCell: { fontSize: 10, fontWeight: '700', color: '#8A8070', letterSpacing: 0.8, textTransform: 'uppercase' },
  idCell: { fontWeight: '700', color: '#1A1611', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  nameCell: { flex: 2, fontWeight: '600', color: '#1A1611' },
  subCell: { color: '#8A8070' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeActive: { backgroundColor: '#E8F5E9' },
  badgeInactive: { backgroundColor: '#F5F0E8' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextActive: { color: '#43A047' },
  badgeTextInactive: { color: '#8A8070' },
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
