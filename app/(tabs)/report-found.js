// Purpose: Report found items

/*
Functions:
    •	handleSubmit(): Saves found item and triggers matching
    •	triggerAIMatching(): Calls AI matching algorithm
    •	Photo upload to Supabase Storage
*/

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Image,
  Platform, useWindowDimensions, StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { colors } from '../../styles/colors';
import { CATEGORIES, getCategoryFields } from '../../lib/categoryForms';
import { findMatches } from '../../lib/aiMatching';
import { CTU_LOCATIONS } from '../../lib/ctuConstants';

// ── Responsive helpers ─────────────────────────────────────────
function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWeb = Platform.OS === 'web';

  const hPad = isTablet || isWeb ? Math.min(width * 0.05, 40) : 16;
  const maxContentWidth = isWeb && width > 900 ? 860 : undefined;
  const headerTopPad = isWeb ? 16
    : Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8
    : 52;
  const fontScale = isTablet ? 1.1 : 1;
  const catColumns = isWeb && width >= 900 ? 5 : isTablet ? 4 : 3;
  const twoColForm = isWeb && width >= 900;
  const photoHeight = isTablet ? 200 : 160;

  return {
    isTablet, isWeb, hPad, maxContentWidth,
    headerTopPad, fontScale, catColumns, twoColForm, photoHeight,
  };
}

// Category icon map
const CATEGORY_ICONS = {
  'id':           'card-outline',
  'keys':         'key-outline',
  'laptop':       'laptop-outline',
  'phone':        'phone-portrait-outline',
  'bottle':       'water-outline',
  'wallet':       'wallet-outline',
  'bag':          'bag-outline',
  'watch':        'time-outline',
  'headphones':   'headset-outline',
  'other':        'ellipsis-horizontal-circle-outline',
};

export default function ReportFound() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({});
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const r = useResponsive();

  // ── LOGIC (unchanged) ──────────────────────────────────────────
  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow access to your photos'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0]);
  }

  async function uploadPhoto(uri) {
    try {
      const fileName = `found/${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      // Use the actual MIME type from the blob, fall back to jpeg
      const mimeType = blob.type || 'image/jpeg';
      const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
      const fullName = `${fileName}.${ext}`;
      const { error } = await supabase.storage
        .from('item-photos')
        .upload(fullName, blob, { contentType: mimeType, cacheControl: '3600', upsert: false });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      const { data: { publicUrl } } = supabase.storage.from('item-photos').getPublicUrl(fullName);
      return publicUrl;
    } catch (error) {
      throw new Error(error.message || 'Failed to upload photo.');
    }
  }

  async function handleSubmit() {
    if (!photo) { Alert.alert('Photo Required', 'Please add a photo of the found item'); return; }
    const finalLocation = location === 'Other' ? customLocation.trim() : location;
    if (!finalLocation) { Alert.alert('Location Required', 'Please specify where you found the item'); return; }
    const fields = getCategoryFields(category.id);
    const missingFields = fields.filter(f => f.required && !formData[f.name]?.trim());
    if (missingFields.length > 0) { Alert.alert('Missing Information', `Please fill in: ${missingFields.map(f => f.label).join(', ')}`); return; }
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Please sign in to report items');
      const photoUrl = await uploadPhoto(photo.uri);
      const { data: foundItem, error: insertError } = await supabase.from('found_items').insert([{
        reporter_id: user.id, category: category.id, ...formData,
        description: description.trim() || null, photo_url: photoUrl,
        found_location: finalLocation, status: 'pending',
      }]).select().single();
      if (insertError) throw new Error(`Database error: ${insertError.message}`);
      const { data: lostItems } = await supabase.from('items').select('*').eq('status', 'lost');
      let matchCount = 0;
      try {
        const matches = await findMatches(foundItem, lostItems || []);
        matchCount = matches.length;
        if (matches.length > 0) {
          await supabase.from('ai_matches').insert(matches.map(match => ({
            lost_item_id: match.lostItem.id, found_item_id: foundItem.id,
            match_score: match.score, match_details: { reasoning: match.reasoning, breakdown: match.breakdown },
          })));
        }
      } catch (aiError) { console.error('AI matching error:', aiError); }
      setStep(1); setCategory(null); setSelectedCategory(null); setFormData({});
      setDescription(''); setLocation(''); setCustomLocation(''); setPhoto(null);
      Alert.alert(
        '✅ Item Reported Successfully!',
        matchCount > 0
          ? `Your report has been submitted. AI found ${matchCount} potential match(es). The owner(s) will be notified.`
          : "Your report has been submitted. We'll notify you if we find a match with any lost items.",
        [{ text: 'View My Reports', onPress: () => router.push('/profile') }, { text: 'Done', style: 'cancel', onPress: () => router.push('/home') }]
      );
    } catch (error) {
      let errorMessage = 'Failed to report item';
      if (error.message.includes('Bucket not found')) errorMessage = 'Storage not configured.';
      else if (error.message.includes('Policy')) errorMessage = 'Storage permission error.';
      else if (error.message) errorMessage = error.message;
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }
  // ── END LOGIC ──────────────────────────────────────────────────

  // ── STEP 1: Category Picker ─────────────────────────────────
  if (step === 1) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.grape} />

        <View style={[styles.header, { paddingTop: r.headerTopPad }]}>
          <View style={styles.headerBlob1} />
          <View style={styles.headerBlob2} />

          <View style={[styles.headerInner, { paddingHorizontal: r.hPad }, r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerEyebrow}>FOUND SOMETHING?</Text>
              <Text style={[styles.headerTitle, { fontSize: r.isTablet ? 22 : 19 }]}>
                Report Found Item
              </Text>
              <Text style={[styles.headerSub, { fontSize: r.isTablet ? 12 : 10 }]}>
                Help return it to its owner
              </Text>
            </View>
          </View>

          {/* Stepper */}
          <View style={[styles.stepperContainer, { paddingHorizontal: r.hPad }, r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' }]}>
            <View style={styles.stepper}>
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, styles.stepCircleActive]}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <Text style={[styles.stepLabel, styles.stepLabelActive]}>Category</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.stepItem}>
                <View style={styles.stepCircle}>
                  <Text style={[styles.stepNumber, styles.stepNumberInactive]}>2</Text>
                </View>
                <Text style={styles.stepLabel}>Details</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerWave} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: r.hPad }, r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' }]}
          showsVerticalScrollIndicator={false}
        >
          {/* AI Banner */}
          <View style={styles.aiBanner}>
            <View style={styles.aiBannerIcon}>
              <Ionicons name="flash" size={16} color={colors.gold} />
            </View>
            <View style={styles.aiBannerBody}>
              <Text style={styles.aiBannerTitle}>AI-Powered Matching</Text>
              <Text style={[styles.aiBannerText, { fontSize: r.isTablet ? 12 : 11 }]}>
                Your report is automatically matched with lost items. Owners are notified instantly.
              </Text>
            </View>
          </View>

          <View style={styles.promptBlock}>
            <Text style={[styles.sectionTitle, { fontSize: r.isTablet ? 19 : 17 }]}>
              What did you find?
            </Text>
            <Text style={[styles.sectionSub, { fontSize: r.isTablet ? 13 : 12 }]}>
              Select the closest category to continue
            </Text>
          </View>

          {/* Category grid */}
          <View style={[styles.categoryGrid, { gap: r.isTablet ? 12 : 10 }]}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              const colWidth = `${Math.floor(100 / r.catColumns) - 1}%`;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    { width: colWidth },
                    isSelected && styles.categoryCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setCategory(cat);
                    setStep(2);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.categoryIconWrap, isSelected && styles.categoryIconWrapSelected]}>
                    <Ionicons
                      name={CATEGORY_ICONS[cat.id] || 'cube-outline'}
                      size={r.isTablet ? 28 : 24}
                      color={isSelected ? colors.gold : colors.grape}
                    />
                  </View>
                  <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected, { fontSize: r.isTablet ? 12 : 10 }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    );
  }

  // ── STEP 2: Details Form ────────────────────────────────────
  const fields = getCategoryFields(category.id);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={colors.grape} />

      <View style={[styles.header, { paddingTop: r.headerTopPad }]}>
        <View style={styles.headerBlob1} />
        <View style={styles.headerBlob2} />

        <View style={[styles.headerInner, { paddingHorizontal: r.hPad }, r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerEyebrow}>ITEM DETAILS</Text>
            <Text style={[styles.headerTitle, { fontSize: r.isTablet ? 20 : 18 }]}>
              Found <Text style={styles.headerTitleAccent}>{category.label}</Text>
            </Text>
            <Text style={[styles.headerSub, { fontSize: r.isTablet ? 12 : 10 }]}>
              Fill in the details below
            </Text>
          </View>
        </View>

        {/* Stepper */}
        <View style={[styles.stepperContainer, { paddingHorizontal: r.hPad }, r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.stepper}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepLabel, styles.stepLabelCompleted]}>Category</Text>
            </View>
            <View style={[styles.stepLine, styles.stepLineCompleted]} />
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Details</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerWave} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: r.hPad }, r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Photo Upload ── */}
        <TouchableOpacity
          style={[styles.photoUpload, photo && styles.photoUploaded, { height: r.photoHeight }]}
          onPress={pickImage}
          activeOpacity={0.85}
        >
          {photo ? (
            <>
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              <View style={styles.photoOverlay}>
                <View style={styles.photoOverlayPill}>
                  <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.photoOverlayText}>Change Photo</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.photoIconWrap}>
                <Ionicons name="camera-outline" size={r.isTablet ? 30 : 26} color="#8A8070" />
              </View>
              <Text style={styles.photoText}>Add a Photo</Text>
              <View style={styles.photoRequiredPill}>
                <View style={styles.photoRequiredDot} />
                <Text style={styles.photoRequired}>Required · Helps AI match faster</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* ── Form Fields ── */}
        <View style={r.twoColForm ? styles.formTwoCols : styles.formSingleCol}>

          {/* Left col: dynamic fields */}
          <View style={[styles.formCol, r.twoColForm && styles.formColHalf]}>

            <View style={styles.formSectionHeader}>
              <View style={styles.formSectionDot} />
              <Text style={styles.formSectionLabel}>Item Details</Text>
            </View>

            {fields.map((field) => (
              <View key={field.name} style={styles.formGroup}>
                <Text style={styles.label}>
                  {field.label.toUpperCase()}
                  {field.required
                    ? <Text style={styles.required}> *</Text>
                    : <Text style={styles.optional}> (optional)</Text>
                  }
                </Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.input, { fontSize: r.isTablet ? 14 : 13 }]}
                    placeholder={field.placeholder}
                    placeholderTextColor="#B8AFA4"
                    value={formData[field.name] || ''}
                    onChangeText={(text) => setFormData({ ...formData, [field.name]: text })}
                  />
                </View>
              </View>
            ))}

            <View style={styles.formGroup}>
              <Text style={styles.label}>ADDITIONAL DETAILS</Text>
              <TextInput
                style={[styles.inputWrap, styles.textArea, { fontSize: r.isTablet ? 14 : 13 }]}
                placeholder="Any other distinguishing features…"
                placeholderTextColor="#B8AFA4"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Right col: location + AI banner */}
          <View style={[styles.formCol, r.twoColForm && styles.formColHalf]}>

            <View style={styles.formSectionHeader}>
              <View style={[styles.formSectionDot, { backgroundColor: colors.gold }]} />
              <Text style={styles.formSectionLabel}>Where Found</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                LOCATION <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerContainer}>
                {CTU_LOCATIONS.map((loc) => {
                  const isSelected = location === loc;
                  return (
                    <TouchableOpacity
                      key={loc}
                      style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                      onPress={() => setLocation(loc)}
                      activeOpacity={0.75}
                    >
                      {isSelected && (
                        <Ionicons name="location" size={11} color={colors.grape} style={{ marginRight: 3 }} />
                      )}
                      <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                        {loc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {location === 'Other' && (
                <View style={[styles.inputWrap, { marginTop: 6 }]}>
                  <Ionicons name="location-outline" size={15} color="#8A8070" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { fontSize: r.isTablet ? 14 : 13 }]}
                    placeholder="Specify location…"
                    placeholderTextColor="#B8AFA4"
                    value={customLocation}
                    onChangeText={setCustomLocation}
                  />
                </View>
              )}
            </View>

            {/* AI Banner */}
            <View style={styles.aiBannerCompact}>
              <View style={styles.aiBannerCompactIcon}>
                <Ionicons name="sparkles" size={14} color={colors.gold} />
              </View>
              <Text style={[styles.aiBannerCompactText, { fontSize: r.isTablet ? 12 : 11 }]}>
                AI will automatically match this with lost reports and notify potential owners.
              </Text>
            </View>

          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled, r.twoColForm && styles.submitBtnWide]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {!loading && <Ionicons name="paper-plane-outline" size={r.isTablet ? 20 : 17} color="#FFFFFF" />}
          <Text style={[styles.submitText, { fontSize: r.isTablet ? 14 : 13 }]}>
            {loading ? 'PROCESSING…' : 'REPORT FOUND ITEM'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── STYLES ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },

  // ── Header ──
  header: {
    backgroundColor: colors.grape,
    paddingBottom: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  headerBlob1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -40,
    right: -30,
  },
  headerBlob2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245,200,66,0.07)',
    top: 30,
    right: 55,
  },
  headerWave: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: '#F5F0E8',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerTextWrap: { flex: 1 },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(245,200,66,0.7)',
    letterSpacing: 2,
    marginBottom: 3,
  },
  headerTitle: {
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  headerTitleAccent: { color: colors.gold },
  headerSub: {
    color: 'rgba(255,255,255,0.45)',
    marginTop: 3,
  },

  // ── Stepper ──
  stepperContainer: { paddingTop: 14, paddingBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  stepCircleCompleted: { backgroundColor: '#10b981', borderColor: '#10b981' },
  stepNumber: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  stepNumberInactive: { color: 'rgba(255,255,255,0.3)' },
  stepLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stepLabelActive: { color: '#FFFFFF', fontWeight: '700' },
  stepLabelCompleted: { color: 'rgba(16,185,129,0.8)' },
  stepLine: { width: 44, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 1 },
  stepLineCompleted: { backgroundColor: '#10b981' },

  // ── Content ──
  content: { paddingTop: 20, gap: 14 },

  // ── AI Banner (step 1) ──
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  aiBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  aiBannerBody: { flex: 1, gap: 2 },
  aiBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1611',
    letterSpacing: 0.1,
  },
  aiBannerText: {
    color: '#8A8070',
    lineHeight: 16,
    fontWeight: '400',
  },

  // Compact AI banner (step 2 sidebar)
  aiBannerCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    borderRadius: 12,
    padding: 12,
  },
  aiBannerCompactIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(245,200,66,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  aiBannerCompactText: {
    flex: 1,
    color: '#8a6a10',
    lineHeight: 16,
    fontWeight: '400',
    paddingTop: 1,
  },

  // ── Prompt block ──
  promptBlock: { gap: 3 },
  sectionTitle: { fontWeight: '800', color: '#1A1611', letterSpacing: -0.2 },
  sectionSub: { color: '#8A8070', lineHeight: 18 },

  // ── Category grid ──
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  categoryCard: {
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  categoryCardSelected: {
    backgroundColor: colors.grape,
    borderColor: colors.gold,
    elevation: 5,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconWrapSelected: { backgroundColor: 'rgba(245,200,66,0.18)' },
  categoryLabel: { fontWeight: '700', color: '#1A1611', textAlign: 'center', letterSpacing: 0.1, paddingHorizontal: 4 },
  categoryLabelSelected: { color: '#FFFFFF' },

  // ── Photo Upload ──
  photoUpload: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D0C8BC',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  photoUploaded: {
    borderStyle: 'solid',
    borderColor: '#E8E0D0',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoOverlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  photoOverlayText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  photoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: { fontSize: 14, fontWeight: '700', color: '#1A1611' },
  photoRequiredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(229,57,53,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  photoRequiredDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E53935',
  },
  photoRequired: { fontSize: 11, color: '#E53935', fontWeight: '600' },

  // ── Form layout ──
  formSingleCol: { gap: 14 },
  formTwoCols: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  formCol: { gap: 14 },
  formColHalf: { flex: 1, minWidth: 0 },

  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  formSectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.grape,
  },
  formSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A8070',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── Form fields ──
  formGroup: { gap: 5 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1611',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  required: { color: '#E53935' },
  optional: { color: '#8A8070', fontWeight: '500', fontSize: 9, letterSpacing: 0.3, textTransform: 'none' },
  inputWrap: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inputIcon: { marginRight: 9, flexShrink: 0 },
  input: { flex: 1, color: '#1A1611', paddingVertical: 12 },
  textArea: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    color: '#1A1611',
    flexDirection: 'column',
    minHeight: 88,
  },

  // ── Location Picker ──
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 4,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
    backgroundColor: '#FFFFFF',
  },
  pickerOptionSelected: {
    borderColor: colors.grape,
    backgroundColor: `${colors.grape}10`,
  },
  pickerOptionText: { fontSize: 12, color: '#1A1611', fontWeight: '500' },
  pickerOptionTextSelected: { fontWeight: '700', color: colors.grape },

  // ── Submit ──
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A1611',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 6,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnWide: { maxWidth: 400 },
  submitText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.8 },
});