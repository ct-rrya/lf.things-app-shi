import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';

export default function AdminDebug() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  async function testConnection() {
    setLoading(true);
    const tests = [];
    
    try {
      // Test 1: Basic connection
      tests.push({ name: 'Database Connection', status: 'testing' });
      const { data: connData, error: connError } = await supabase.from('audit_log').select('count').limit(1);
      tests[0].status = connError ? 'failed' : 'success';
      tests[0].message = connError ? connError.message : 'Connected successfully';
      
      // Test 2: Check audit_log table
      tests.push({ name: 'audit_log Table', status: 'testing' });
      const { data: tableData, error: tableError } = await supabase
        .from('audit_log')
        .select('id')
        .limit(1);
      
      if (tableError && tableError.code === '42P01') {
        tests[1].status = 'failed';
        tests[1].message = 'Table does not exist (42P01)';
      } else if (tableError) {
        tests[1].status = 'failed';
        tests[1].message = tableError.message;
      } else {
        tests[1].status = 'success';
        tests[1].message = `Table exists, ${tableData?.length || 0} records`;
      }
      
      // Test 3: Check admins table
      tests.push({ name: 'admins Table', status: 'testing' });
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .limit(1);
      
      if (adminError && adminError.code === '42P01') {
        tests[2].status = 'failed';
        tests[2].message = 'Table does not exist (42P01)';
      } else if (adminError) {
        tests[2].status = 'failed';
        tests[2].message = adminError.message;
      } else {
        tests[2].status = 'success';
        tests[2].message = `Table exists, ${adminData?.length || 0} records`;
      }
      
      // Test 4: Check admin_passcodes table
      tests.push({ name: 'admin_passcodes Table', status: 'testing' });
      const { data: passcodeData, error: passcodeError } = await supabase
        .from('admin_passcodes')
        .select('id')
        .limit(1);
      
      if (passcodeError && passcodeError.code === '42P01') {
        tests[3].status = 'failed';
        tests[3].message = 'Table does not exist (42P01)';
      } else if (passcodeError) {
        tests[3].status = 'failed';
        tests[3].message = passcodeError.message;
      } else {
        tests[3].status = 'success';
        tests[3].message = `Table exists, ${passcodeData?.length || 0} records`;
      }
      
    } catch (err) {
      tests.push({ name: 'Exception', status: 'failed', message: err.message });
    } finally {
      setResults(tests);
      setLoading(false);
    }
  }

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Database Debug</Text>
        <Text style={styles.pageSub}>Check database connection and tables</Text>
      </View>

      <TouchableOpacity
        style={styles.testButton}
        onPress={testConnection}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
        <Text style={styles.testButtonText}>
          {loading ? 'Testing...' : 'Run Tests'}
        </Text>
      </TouchableOpacity>

      <View style={styles.results}>
        {results.map((test, index) => (
          <View key={index} style={styles.testResult}>
            <View style={styles.testHeader}>
              <Text style={styles.testName}>{test.name}</Text>
              <View style={[
                styles.statusBadge,
                test.status === 'success' && styles.statusSuccess,
                test.status === 'failed' && styles.statusFailed,
                test.status === 'testing' && styles.statusTesting,
              ]}>
                <Text style={styles.statusText}>
                  {test.status === 'success' ? '✓' : 
                   test.status === 'failed' ? '✗' : 
                   test.status === 'testing' ? '...' : '?'}
                </Text>
              </View>
            </View>
            <Text style={styles.testMessage}>{test.message || 'No message'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Common Issues:</Text>
        <Text style={styles.instruction}>1. Tables don't exist - Run the SQL migrations</Text>
        <Text style={styles.instruction}>2. RLS policies blocking - Check RLS policies</Text>
        <Text style={styles.instruction}>3. Connection failed - Check environment variables</Text>
        <Text style={styles.instruction}>4. Service key invalid - Regenerate Supabase service key</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  content: { padding: 28, gap: 24 },
  pageHeader: { gap: 4 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1A1611' },
  pageSub: { fontSize: 13, color: '#8A8070' },

  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A1611',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  testButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  results: { gap: 12 },
  testResult: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testName: { fontSize: 15, fontWeight: '600', color: '#1A1611' },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
  },
  statusSuccess: { backgroundColor: '#E8F5E9' },
  statusFailed: { backgroundColor: '#FFEBEE' },
  statusTesting: { backgroundColor: '#FFF3E0' },
  statusText: { fontSize: 12, fontWeight: '700' },
  testMessage: { fontSize: 13, color: '#8A8070', lineHeight: 18 },

  instructions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    gap: 8,
  },
  instructionsTitle: { fontSize: 15, fontWeight: '700', color: '#1A1611', marginBottom: 4 },
  instruction: { fontSize: 13, color: '#8A8070', lineHeight: 18 },
});