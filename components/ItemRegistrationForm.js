import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ITEM_CATEGORIES, registerItem, uploadItemPhotos } from '../lib/itemService';

export default function ItemRegistrationForm({ userId, studentId, onSuccess }) {
  const [step, setStep] = useState('category'); // 'category' or 'details'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);

  // Common fields
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);

  // Dynamic metadata fields
  const [metadata, setMetadata] = useState({});

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setStep('details');
    setMetadata({}); // Reset metadata when changing category
  };

  const handlePickImage = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit Reached', 'You can only upload up to 3 photos');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0]]);
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleMetadataChange = (fieldName, value) => {
    setMetadata({ ...metadata, [fieldName]: value });
  };

  const validateForm = () => {
    if (!itemName.trim()) {
      Alert.alert('Validation Error', 'Please enter an item name');
      return false;
    }

    // Validate required category-specific fields
    const categoryConfig = ITEM_CATEGORIES[selectedCategory];
    for (const field of categoryConfig.fields) {
      if (field.required && !metadata[field.name]) {
        Alert.alert('Validation Error', `Please fill in ${field.label}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Upload photos first
      let photoUrls = [];
      if (photos.length > 0) {
        const uploadResult = await uploadItemPhotos(null, photos);
        if (uploadResult.success) {
          photoUrls = uploadResult.urls;
        }
      }

      // Register item
      const result = await registerItem({
        userId,
        studentId,
        name: itemName,
        category: selectedCategory,
        description,
        photoUrls,
        metadata,
      });

      if (result.success) {
        Alert.alert('Success', 'Item registered successfully!', [
          {
            text: 'OK',
            onPress: () => onSuccess(result.item),
          },
        ]);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to register item');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryGrid = () => (
    <View style={styles.categoryGrid}>
      {Object.entries(ITEM_CATEGORIES).map(([key, config]) => (
        <TouchableOpacity
          key={key}
          style={styles.categoryCard}
          onPress={() => handleCategorySelect(key)}
        >
          <Text style={styles.categoryIcon}>{config.icon}</Text>
          <Text style={styles.categoryLabel}>{config.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderField = (field) => {
    switch (field.type) {
      case 'text':
        return (
          <TextInput
            style={styles.input}
            placeholder={field.label}
            value={metadata[field.name] || ''}
            onChangeText={(value) => handleMetadataChange(field.name, value)}
          />
        );

      case 'textarea':
        return (
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={field.label}
            value={metadata[field.name] || ''}
            onChangeText={(value) => handleMetadataChange(field.name, value)}
            multiline
            numberOfLines={4}
          />
        );

      case 'number':
        return (
          <TextInput
            style={styles.input}
            placeholder={field.label}
            value={metadata[field.name]?.toString() || ''}
            onChangeText={(value) => handleMetadataChange(field.name, parseInt(value) || 0)}
            keyboardType="numeric"
          />
        );

      case 'date':
        return (
          <TextInput
            style={styles.input}
            placeholder={`${field.label} (YYYY-MM-DD)`}
            value={metadata[field.name] || ''}
            onChangeText={(value) => handleMetadataChange(field.name, value)}
          />
        );

      case 'boolean':
        return (
          <View style={styles.booleanField}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <View style={styles.booleanButtons}>
              <TouchableOpacity
                style={[
                  styles.booleanButton,
                  metadata[field.name] === true && styles.booleanButtonActive,
                ]}
                onPress={() => handleMetadataChange(field.name, true)}
              >
                <Text
                  style={[
                    styles.booleanButtonText,
                    metadata[field.name] === true && styles.booleanButtonTextActive,
                  ]}
                >
                  Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.booleanButton,
                  metadata[field.name] === false && styles.booleanButtonActive,
                ]}
                onPress={() => handleMetadataChange(field.name, false)}
              >
                <Text
                  style={[
                    styles.booleanButtonText,
                    metadata[field.name] === false && styles.booleanButtonTextActive,
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'select':
        return (
          <View style={styles.selectField}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <View style={styles.selectOptions}>
              {field.options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    metadata[field.name] === option && styles.selectOptionActive,
                  ]}
                  onPress={() => handleMetadataChange(field.name, option)}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      metadata[field.name] === option && styles.selectOptionTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderDetailsForm = () => {
    const categoryConfig = ITEM_CATEGORIES[selectedCategory];

    return (
      <ScrollView style={styles.detailsForm}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('category')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {categoryConfig.icon} {categoryConfig.label}
          </Text>
        </View>

        {/* Common Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <Text style={styles.fieldLabel}>Item Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., My Blue Laptop"
            value={itemName}
            onChangeText={setItemName}
          />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Distinguishing features or marks"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Category-Specific Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item Details</Text>
          {categoryConfig.fields.map((field) => (
            <View key={field.name} style={styles.fieldContainer}>
              {field.type !== 'boolean' && field.type !== 'select' && (
                <Text style={styles.fieldLabel}>
                  {field.label} {field.required && '*'}
                </Text>
              )}
              {renderField(field)}
            </View>
          ))}
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos (Up to 3)</Text>
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 3 && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={handlePickImage}>
                <Text style={styles.addPhotoText}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Register Item</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {step === 'category' ? renderCategoryGrid() : renderDetailsForm()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  categoryCard: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.66%',
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailsForm: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
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
    height: 80,
    textAlignVertical: 'top',
  },
  booleanField: {
    marginBottom: 16,
  },
  booleanButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  booleanButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  booleanButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  booleanButtonText: {
    fontSize: 16,
    color: '#333',
  },
  booleanButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  selectField: {
    marginBottom: 16,
  },
  selectOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
  },
  selectOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#333',
  },
  selectOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 40,
    color: '#999',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
