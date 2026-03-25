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

// ── Responsive helpers ─────────────────────────────────────────
function useResponsive() {
  const { width } = useWindowDimensions();
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
  return { isTablet, isWeb, hPad, maxContentWidth, headerTopPad, fontScale, catColumns, twoColForm };
}

// Category icon map
const CATEGORY_ICONS = {
  'id': 'card-outline',
  'keys': 'key-outline',
  'laptop': 'laptop-outline',
  'phone': 'phone-portrait-outline',
  'bottle': 'water-outline',
  'wallet': 'wallet-outline',
  'bag': 'bag-outline',
  'watch': 'time-outline',
  'headphones': 'headset-outline',
  'other': 'ellipsis-horizontal-circle-outline',
};

export default function Register() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [name, setName] = useState('');
  const [formData, setFormData] = useState({});
  const [description, setDescription] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [program, setProgram] = useState('');
  const [yearSection, setYearSection] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [socialMedia, setSocialMedia] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const r = useResponsive();

  async function pickImage() {
    if (photos.length >= 3) {
      Alert.alert('Maximum Photos', 'You can upload up to 3 photos');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      await uploadPhoto(result.assets[0]);
    }
  }

  async function uploadPhoto(asset) {
    setUploadingPhoto(true);
    setPhotoError('');
    try {
      const uri = asset.uri;
      const fileExt = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `items/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // For React Native, we need to create an ArrayBuffer from the image
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('item-photos')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('item-photos')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      setPhotos([...photos, { uri: asset.uri, url: urlData.publicUrl }]);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.message || 'Failed to upload photo';
      setPhotoError(errorMsg);
      
      // More helpful error message
      let helpText = 'Could not upload photo. ';
      if (error.message?.includes('Network')) {
        helpText += 'Please check your internet connection.';
      } else if (error.message?.includes('bucket')) {
        helpText += 'Storage bucket may not be configured. Please contact support.';
      } else {
        helpText += 'Please try again or contact support if the problem persists.';
      }
      
      Alert.alert('Upload Failed', helpText, [{ text: 'OK' }]);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto(index) {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoError('');
  }

  async function handleRegister() {
    if (!name.trim()) { Alert.alert('Error', 'Please enter an item name'); return; }
    if (photos.length === 0) { setPhotoError('Please add at least one photo of your item'); Alert.alert('Photo Required', 'Please add at least one photo of your item'); return; }
    if (!ownerName.trim()) { Alert.alert('Error', 'Please enter your full name'); return; }
    if (!program.trim() || !yearSection.trim()) { Alert.alert('Error', 'Please enter your program and year/section'); return; }
    const fields = getCategoryFields(category.id);
    const requiredFields = fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !formData[f.name]?.trim());
    if (missingFields.length > 0) { Alert.alert('Missing Information', `Please fill in: ${missingFields.map(f => f.label).join(', ')}`); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const photoUrls = photos.map(p => p.url);
      const { data, error } = await supabase.from('items').insert([{
        user_id: user.id, name: name.trim(), category: category.id, ...formData,
        description: description.trim() || null, owner_name: ownerName.trim(),
        program: program.trim(), year_section: yearSection.trim(),
        contact_phone: contactPhone.trim() || null, address: address.trim() || null,
        social_media: socialMedia.trim() || null, photo_urls: photoUrls, status: 'safe',
      }]).select().single();
      if (error) throw error;
      Alert.alert('✅ Item Registered!', 'Your QR code has been generated. You can now print it and attach it to your item.', [{ text: 'View QR Code', onPress: () => {
        setStep(1); setCategory(null); setName(''); setFormData({}); setDescription('');
        setOwnerName(''); setProgram(''); setYearSection(''); setContactPhone('');
        setAddress(''); setSocialMedia(''); setPhotos([]); setPhotoError('');
        router.push(`/item/${data.id}`);
      }}]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  // ── STEP 1: Category Selection ─────────────────────────────────
  if (step === 1) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.grape} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: r.headerTopPad }]}>
          <View style={styles.headerBlob1} />
          <View style={styles.headerBlob2} />

          <View style={[styles.headerInner, { paddingHorizontal: r.hPad }, r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' }]}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerEyebrow}>NEW ITEM</Text>
              <Text style={[styles.headerTitle, { fontSize: r.isTablet ? 26 : 22 }]}>
                Register Your Item
              </Text>
              <Text style={[styles.headerSub, { fontSize: r.isTablet ? 13 : 11 }]}>
                Get a unique QR code to protect your belongings
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
            <Text style={styles.stepIndicator}>Step 1 of 2</Text>
          </View>

          <View style={styles.headerWave} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: r.hPad }, r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.promptBlock}>
            <Text style={[styles.sectionTitle, { fontSize: r.isTablet ? 19 : 17 }]}>
              What are you registering?
            </Text>
            <Text style={[styles.sectionSub, { fontSize: r.isTablet ? 13 : 12 }]}>
              Select the category that best matches your item
            </Text>
          </View>

          {/* 3-column grid */}
          <View style={[styles.categoryGrid, { gap: r.isTablet ? 14 : 10 }]}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.categoryIconWrap, isSelected && styles.categoryIconWrapSelected]}>
                    <Ionicons
                      name={CATEGORY_ICONS[cat.id] || 'cube-outline'}
                      size={26}
                      color={isSelected ? colors.gold : colors.grape}
                    />
                  </View>
                  <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected, { fontSize: r.isTablet ? 12 : 11 }]}>
                    {cat.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.gold} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Continue button */}
          <TouchableOpacity
            style={[styles.continueBtn, !selectedCategory && styles.continueBtnDisabled]}
            onPress={() => { if (selectedCategory) { setCategory(selectedCategory); setStep(2); } }}
            disabled={!selectedCategory}
            activeOpacity={0.85}
          >
            {selectedCategory && <Ionicons name="arrow-forward-circle" size={18} color="#FFFFFF" />}
            <Text style={[styles.continueBtnText, { fontSize: r.isTablet ? 14 : 13 }]}>
              {selectedCategory ? `Continue with ${selectedCategory.label}` : 'Select a category to continue'}
            </Text>
          </TouchableOpacity>

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

      {/* Header */}
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
              Register <Text style={styles.headerTitleAccent}>{category.label}</Text>
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
        <View style={r.twoColForm ? styles.formTwoCols : styles.formSingleCol}>

          {/* ── Left / Item Details ── */}
          <View style={[styles.formCol, r.twoColForm && styles.formColHalf]}>

            {/* Section header */}
            <View style={styles.formSectionHeader}>
              <View style={styles.formSectionDot} />
              <Text style={styles.formSectionLabel}>Item Details</Text>
            </View>

            {/* Item Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                ITEM NAME <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="cube-outline" size={15} color="#8A8070" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontSize: r.isTablet ? 14 : 13 }]}
                  placeholder="e.g., My Blue Backpack"
                  placeholderTextColor="#B8AFA4"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Photo Upload */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                PHOTOS <Text style={styles.required}>*</Text>
                <Text style={styles.optional}>  up to 3</Text>
              </Text>
              <Text style={styles.helperText}>
                Shown when your QR code is scanned by a finder
              </Text>

              <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoItem}>
                    <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                    <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(index)} activeOpacity={0.7}>
                      <Ionicons name="close-circle" size={22} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                ))}

                {photos.length < 3 && (
                  <TouchableOpacity
                    style={[styles.photoUploadBtn, uploadingPhoto && styles.photoUploadBtnDisabled]}
                    onPress={pickImage}
                    disabled={uploadingPhoto}
                    activeOpacity={0.75}
                  >
                    {uploadingPhoto ? (
                      <Text style={styles.photoUploadText}>Uploading…</Text>
                    ) : (
                      <>
                        <View style={styles.photoUploadIcon}>
                          <Ionicons name="camera-outline" size={24} color={colors.grape} />
                        </View>
                        <Text style={styles.photoUploadText}>Add Photo</Text>
                        <Text style={styles.photoUploadSubtext}>{photos.length}/3</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {photoError ? (
                <Text style={styles.errorText}>{photoError}</Text>
              ) : null}

              <View style={styles.photoTips}>
                <Ionicons name="bulb-outline" size={13} color="#B8870A" />
                <Text style={styles.photoTipsText}>
                  Show full item, include marks or stickers, use good lighting
                </Text>
              </View>
            </View>

            {/* Dynamic category fields */}
            {fields.map((field) => (
              <View key={field.name} style={styles.formGroup}>
                <Text style={styles.label}>
                  {field.label.toUpperCase()}
                  {field.required ? <Text style={styles.required}> *</Text> : <Text style={styles.optional}> (optional)</Text>}
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

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>DISTINGUISHING FEATURES</Text>
              <TextInput
                style={[styles.inputWrap, styles.textArea, { fontSize: r.isTablet ? 14 : 13 }]}
                placeholder="Any unique marks, stickers, scratches…"
                placeholderTextColor="#B8AFA4"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── Right / Owner Info ── */}
          <View style={[styles.formCol, r.twoColForm && styles.formColHalf]}>

            <View style={styles.formSectionHeader}>
              <View style={[styles.formSectionDot, { backgroundColor: colors.gold }]} />
              <Text style={styles.formSectionLabel}>Your Information</Text>
            </View>

            <View style={styles.infoBanner}>
              <Ionicons name="lock-closed-outline" size={15} color="#B8870A" style={{ flexShrink: 0 }} />
              <Text style={[styles.infoBannerText, { fontSize: r.isTablet ? 12 : 11 }]}>
                Your contact info is encoded in the QR code so finders can reach you directly.
              </Text>
            </View>

            {[
              { label: 'FULL NAME', placeholder: 'Your full name', value: ownerName, onChange: setOwnerName, icon: 'person-outline', required: true },
              { label: 'PROGRAM', placeholder: 'e.g., BSCS, BSIT, BSA', value: program, onChange: setProgram, icon: 'school-outline', required: true },
              { label: 'YEAR & SECTION', placeholder: 'e.g., 3rd Year – Section A', value: yearSection, onChange: setYearSection, icon: 'calendar-outline', required: true },
              { label: 'CONTACT PHONE', placeholder: 'For valuable items', value: contactPhone, onChange: setContactPhone, icon: 'call-outline', required: false, keyboardType: 'phone-pad' },
              { label: 'ADDRESS', placeholder: 'Dorm or home address', value: address, onChange: setAddress, icon: 'home-outline', required: false },
              { label: 'SOCIAL MEDIA', placeholder: 'Facebook, Instagram, etc.', value: socialMedia, onChange: setSocialMedia, icon: 'logo-facebook', required: false },
            ].map((field) => (
              <View key={field.label} style={styles.formGroup}>
                <Text style={styles.label}>
                  {field.label}
                  {field.required
                    ? <Text style={styles.required}> *</Text>
                    : <Text style={styles.optional}> (optional)</Text>
                  }
                </Text>
                <View style={styles.inputWrap}>
                  <Ionicons name={field.icon} size={15} color="#8A8070" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { fontSize: r.isTablet ? 14 : 13 }]}
                    placeholder={field.placeholder}
                    placeholderTextColor="#B8AFA4"
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType={field.keyboardType || 'default'}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled, r.twoColForm && styles.submitBtnWide]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {!loading && <Ionicons name="qr-code-outline" size={r.isTablet ? 20 : 18} color="#FFFFFF" />}
          <Text style={[styles.submitText, { fontSize: r.isTablet ? 14 : 13 }]}>
            {loading ? 'REGISTERING…' : 'REGISTER & GENERATE QR'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── STYLES ─────────────────────────────────────────────────────
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
    lineHeight: 28,
  },
  headerTitleAccent: { color: colors.gold },
  headerSub: {
    color: 'rgba(255,255,255,0.45)',
    marginTop: 3,
  },

  // ── Stepper ──
  stepperContainer: { paddingTop: 16, paddingBottom: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 },
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
  stepIndicator: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // ── Content ──
  content: { paddingTop: 22, gap: 16 },

  promptBlock: { gap: 4 },
  sectionTitle: { fontWeight: '800', color: '#1A1611', letterSpacing: -0.2 },
  sectionSub: { color: '#8A8070', lineHeight: 18 },

  // ── Category Grid ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  categoryCard: {
    width: '31%',
    aspectRatio: 1.05,
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
    overflow: 'hidden',
  },
  categoryCardSelected: {
    backgroundColor: colors.grape,
    borderColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconWrapSelected: {
    backgroundColor: 'rgba(245,200,66,0.18)',
  },
  categoryLabel: {
    fontWeight: '700',
    color: '#1A1611',
    textAlign: 'center',
    letterSpacing: 0.1,
    paddingHorizontal: 4,
  },
  categoryLabelSelected: { color: '#FFFFFF' },
  checkmark: { position: 'absolute', top: 7, right: 7 },

  // ── Continue Button ──
  continueBtn: {
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
  continueBtnDisabled: {
    backgroundColor: 'rgba(26,22,17,0.2)',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Form layout ──
  formSingleCol: { gap: 14 },
  formTwoCols: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  formCol: { gap: 14 },
  formColHalf: { flex: 1, minWidth: 0 },

  // Section header inside form
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    marginTop: 4,
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

  // ── Form Fields ──
  formGroup: { gap: 5 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1611',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  required: { color: '#E53935' },
  optional: {
    color: '#8A8070',
    fontWeight: '500',
    fontSize: 9,
    letterSpacing: 0.3,
    textTransform: 'none',
  },
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
  input: {
    flex: 1,
    color: '#1A1611',
    paddingVertical: 12,
    fontWeight: '400',
  },
  textArea: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    color: '#1A1611',
    flexDirection: 'column',
    minHeight: 88,
  },

  // ── Info Banner ──
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
    borderRadius: 12,
    padding: 12,
  },
  infoBannerText: {
    flex: 1,
    color: '#8a6a10',
    lineHeight: 17,
    fontWeight: '500',
  },

  // ── Photos ──
  helperText: {
    fontSize: 11,
    color: '#8A8070',
    marginBottom: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  photoItem: { position: 'relative', width: 96, height: 96 },
  photoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#F5F0E8',
  },
  photoRemove: {
    position: 'absolute',
    top: -7,
    right: -7,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  photoUploadBtn: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D0C8BC',
    borderStyle: 'dashed',
    backgroundColor: '#FAFAF8',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  photoUploadBtnDisabled: { opacity: 0.5 },
  photoUploadIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoUploadText: {
    fontSize: 11,
    color: '#1A1611',
    fontWeight: '600',
  },
  photoUploadSubtext: {
    fontSize: 10,
    color: '#8A8070',
  },
  photoTips: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  photoTipsText: {
    flex: 1,
    fontSize: 11,
    color: '#8a6a10',
    lineHeight: 16,
    fontWeight: '400',
  },
  errorText: {
    fontSize: 11,
    color: '#E53935',
    fontWeight: '600',
    marginTop: 4,
  },

  // ── Submit Button ──
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A1611',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnWide: { maxWidth: 400 },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});