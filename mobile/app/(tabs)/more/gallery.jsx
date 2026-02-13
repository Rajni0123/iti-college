import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, Dimensions, RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../../src/constants/colors';
import { getGallery, uploadGalleryImage, deleteGalleryImage } from '../../../src/services/api';
import LoadingScreen from '../../../src/components/LoadingScreen';
import EmptyState from '../../../src/components/EmptyState';
import ConfirmDialog from '../../../src/components/ConfirmDialog';
import Toast from 'react-native-toast-message';

const API_BASE = 'https://manerpvtiti.space/api/';
const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_SIZE = (SCREEN_WIDTH - 16 * 2 - 8 * 2) / 3;

export default function GalleryScreen() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchGallery = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await getGallery();
      const data = res.data?.data || res.data?.images || (Array.isArray(res.data) ? res.data : []);
      setImages(data);
    } catch (e) {
      console.error('Failed to fetch gallery:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchGallery(); }, []);

  const pickImage = () => {
    Alert.alert('Upload Image', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permission needed', 'Camera permission is required'); return; }
          const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!result.canceled && result.assets?.length > 0) uploadImage(result.assets[0]);
        },
      },
      {
        text: 'Library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permission needed', 'Media library permission is required'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!result.canceled && result.assets?.length > 0) uploadImage(result.assets[0]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadImage = async (asset) => {
    try {
      setUploading(true);
      const formData = new FormData();
      const uri = asset.uri;
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('image', { uri, name: filename, type });
      await uploadGalleryImage(formData);
      Toast.show({ type: 'success', text1: 'Image uploaded' });
      fetchGallery();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGalleryImage(deleteId);
      Toast.show({ type: 'success', text1: 'Image deleted' });
      setDeleteId(null);
      fetchGallery();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to delete image' });
      setDeleteId(null);
    }
  };

  const renderItem = ({ item }) => {
    const imageUrl = item.image_url?.startsWith('http') ? item.image_url : API_BASE + item.image_url;
    return (
      <View style={styles.imageWrap}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        <TouchableOpacity style={styles.deleteOverlay} onPress={() => setDeleteId(item.id)}>
          <Text style={styles.deleteX}>X</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={images}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        numColumns={3}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={images.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState title="No images" subtitle="Upload images to the gallery" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchGallery(true)} colors={[Colors.primary]} />}
      />

      <TouchableOpacity style={styles.fab} onPress={pickImage} disabled={uploading}>
        <Text style={styles.fabText}>{uploading ? 'Uploading...' : '+ Upload Image'}</Text>
      </TouchableOpacity>

      <ConfirmDialog
        visible={!!deleteId}
        title="Delete Image"
        message="Are you sure you want to delete this image?"
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  columnWrapper: { gap: 8 },
  imageWrap: {
    width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 10, overflow: 'hidden',
    marginBottom: 8, backgroundColor: '#e2e8f0',
  },
  image: { width: '100%', height: '100%' },
  deleteOverlay: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(220,38,38,0.85)', width: 24, height: 24,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  deleteX: { color: '#fff', fontSize: 12, fontWeight: '800' },
  fab: {
    position: 'absolute', bottom: 20, right: 20, left: 20,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
