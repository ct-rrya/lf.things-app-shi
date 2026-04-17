import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors } from '../styles/colors';

// 20 DiceBear adventurer seeds to pick from
const AVATAR_SEEDS = [
  'Felix','Mia','Liam','Zoe','Noah','Aria','Ethan','Luna',
  'Aiden','Chloe','Mason','Lily','Logan','Ella','Lucas','Nora',
  'Oliver','Ava','Elijah','Sophia',
];

function getAvatarUrl(seed) {
  const s = encodeURIComponent(seed || 'default');
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${s}&backgroundColor=f5c842&radius=50`;
}

export default function AccountSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('Felix');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const router = useRouter();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email);

      const { data: student } = await supabase
        .from('students')
        .select('full_name, student_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (student) setStudentId(student.student_id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_seed')
        .eq('id', user.id)
        .maybeSingle();

      setDisplayName(profile?.display_name || student?.full_name || '');
      setBio(profile?.bio || '');
      setAvatarSeed(profile?.avatar_seed || student?.student_id || 'Felix');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_seed: avatarSeed,
        }, { onConflict: 'id' });

      if (error) throw error;
      Alert.alert('Saved', 'Your profile has been updated.');
      router.back();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  const headerTopPad = Platform.OS === 'ios' ? 52
    : Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8
    : 16;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerTopPad }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => setShowAvatarPicker(!showAvatarPicker)}
            activeOpacity={0.85}
          >
            {Platform.OS === 'web' ? (
              <Image
                source={{ uri: getAvatarUrl(avatarSeed) }}
                style={styles.avatarImg}
              />
            ) : (
              <SvgUri
                uri={getAvatarUrl(avatarSeed)}
                width={96}
                height={96}
              />
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="pencil" size={12} color="#1A1611" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change avatar</Text>
        </View>

        {/* Avatar picker grid */}
        {showAvatarPicker && (
          <View style={styles.avatarGrid}>
            {AVATAR_SEEDS.map((seed) => (
              <TouchableOpacity
                key={seed}
                style={[styles.avatarOption, avatarSeed === seed && styles.avatarOptionSelected]}
                onPress={() => { setAvatarSeed(seed); setShowAvatarPicker(false); }}
                activeOpacity={0.8}
              >
                {Platform.OS === 'web' ? (
                  <Image source={{ uri: getAvatarUrl(seed) }} style={styles.avatarOptionImg} />
                ) : (
                  <SvgUri
                    uri={getAvatarUrl(seed)}
                    width={52}
                    height={52}
                  />
                )}
                {avatarSeed === seed && (
                  <View style={styles.avatarOptionCheck}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor="#B8AFA4"
              />
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>BIO</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMulti]}
                value={bio}
                onChangeText={setBio}
                placeholder="Write something about yourself…"
                placeholderTextColor="#B8AFA4"
                multiline
                textAlignVertical="top"
                maxLength={120}
              />
              <Text style={styles.charCount}>{bio.length}/120</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <Text style={styles.fieldReadOnly}>{email}</Text>
              <Text style={styles.fieldNote}>Contact admin to change email</Text>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>STUDENT ID</Text>
              <Text style={styles.fieldReadOnly}>{studentId || '—'}</Text>
              <Text style={styles.fieldNote}>Cannot be changed</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },

  header: {
    backgroundColor: '#1A1611',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  saveBtn: { backgroundColor: colors.gold, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#1A1611' },

  content: { padding: 20, gap: 24 },

  avatarSection: { alignItems: 'center', gap: 8 },
  avatarWrap: { position: 'relative', width: 96, height: 96 },
  avatarImg: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.gold },
  avatarEditBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#F5F0E8',
  },
  avatarHint: { fontSize: 12, color: '#8A8070' },

  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: '#E8E0D0',
  },
  avatarOption: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  avatarOptionSelected: { borderColor: colors.gold },
  avatarOptionImg: { width: '100%', height: '100%', backgroundColor: colors.gold },
  avatarOptionCheck: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center',
  },

  section: { gap: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#8A8070', letterSpacing: 1.2, textTransform: 'uppercase', paddingLeft: 4 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8E0D0', overflow: 'hidden' },
  field: { padding: 14, gap: 4 },
  fieldDivider: { height: 1, backgroundColor: '#F5F0E8' },
  fieldLabel: { fontSize: 9, fontWeight: '700', color: '#8A8070', letterSpacing: 1, textTransform: 'uppercase' },
  fieldInput: {
    fontSize: 14, color: '#1A1611', paddingVertical: 4,
    ...(Platform.OS === 'web' && { outlineWidth: 0 }),
  },
  fieldInputMulti: { minHeight: 60, lineHeight: 20 },
  charCount: { fontSize: 10, color: '#B8AFA4', textAlign: 'right' },
  fieldReadOnly: { fontSize: 14, color: '#1A1611', fontWeight: '500', paddingVertical: 4 },
  fieldNote: { fontSize: 11, color: '#B8AFA4' },
});
