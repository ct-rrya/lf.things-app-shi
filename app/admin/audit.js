import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';

export default function AdminAudit() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLog(); }, []);

  async function fetchLog() {
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setLog(data || []);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Audit Log</Text>
        <Text style={styles.pageSub}>All system actions, last 100 entries</Text>
      </View>
      <ScrollView style={styles.tableWrap}>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            {['Action', 'Target', 'Target ID', 'Date'].map(h => (
              <Text key={h} style={[styles.cell, styles.headCell]}>{h}</Text>
            ))}
          </View>
          {loading ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>Loading…</Text></View>
          ) : log.length === 0 ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>No audit entries yet</Text></View>
          ) : log.map((entry) => (
            <View key={entry.id} style={styles.tableRow}>
              <Text style={[styles.cell, styles.actionCell]}>{entry.action}</Text>
              <Text style={[styles.cell, styles.subCell]}>{entry.target_type || '—'}</Text>
              <Text style={[styles.cell, styles.idCell]} numberOfLines={1}>{entry.target_id || '—'}</Text>
              <Text style={[styles.cell, styles.subCell]}>{new Date(entry.created_at).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  pageHeader: { padding: 28, paddingBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1A1611' },
  pageSub: { fontSize: 13, color: '#8A8070', marginTop: 2 },
  tableWrap: { flex: 1, paddingHorizontal: 28 },
  table: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8E0D0', overflow: 'hidden', marginBottom: 24 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F5F0E8' },
  tableHead: { backgroundColor: '#F5F0E8', borderBottomColor: '#E8E0D0' },
  cell: { flex: 1, fontSize: 13 },
  headCell: { fontSize: 10, fontWeight: '700', color: '#8A8070', letterSpacing: 0.8, textTransform: 'uppercase' },
  actionCell: { flex: 2, fontWeight: '600', color: '#1A1611' },
  subCell: { color: '#8A8070' },
  idCell: { color: '#8A8070', fontSize: 11, fontFamily: 'monospace' },
  emptyRow: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#8A8070', fontSize: 13 },
});
