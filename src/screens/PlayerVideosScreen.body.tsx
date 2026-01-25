import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';

import type { RootStackParamList, PlayerVideoItem } from '../types';
import { COACHES } from '../data/coaches';
import { styles } from '../styles/styles';

type PlayerVideosProps = NativeStackScreenProps<RootStackParamList, 'PlayerVideos'>;

const MAX_VIDEO_SECONDS = 120;
const MAX_PRACTICE_VIDEOS = 2;

const PlayerVideosScreen: React.FC<PlayerVideosProps> = ({ navigation }) => {
  const [videos, setVideos] = useState<PlayerVideoItem[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string>(''); // bulk assign dropdown

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your media library.');
      return;
    }

    if (videos.length >= MAX_PRACTICE_VIDEOS) {
      Alert.alert(
        'Upload limit reached',
        `You can upload a maximum of ${MAX_PRACTICE_VIDEOS} practice videos.`
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const durationSec =
      typeof asset.duration === 'number' ? asset.duration / 1000 : undefined;

    if (durationSec && durationSec > MAX_VIDEO_SECONDS) {
      Alert.alert('Video too long', 'Please choose a short practice video (max 2 minutes).');
      return;
    }

    setVideos(prev => [
      ...prev,
      {
        uri: asset.uri,
        durationSec: durationSec ? Math.round(durationSec) : undefined,
        uploadedBy: 'player',
        context: 'practice',
        coachId: '',       // always a string
        status: 'draft',   // draft until confirmed
      },
    ]);

    Alert.alert('Uploaded', 'Now select a coach and tap Confirm to share.');
  };

  const setCoachForVideo = (index: number, coachId: string) => {
    setVideos(prev =>
      prev.map((v, i) => {
        if (i !== index) return v;

        // Once shared, don’t allow changing coach
        if (v.status === 'shared') return v;

        return { ...v, coachId };
      })
    );
  };

  const confirmShareVideo = (index: number) => {
    setVideos(prev => {
      const v = prev[index];
      if (!v) return prev;

      if (v.status === 'shared') {
        Alert.alert('Already shared', 'This video is already shared and cannot be changed.');
        return prev;
      }

      if (!v.coachId) {
        Alert.alert('Select a coach', 'Please choose a coach before confirming.');
        return prev;
      }

      // later: save to Firebase / notify coach
      Alert.alert('Shared', 'Video shared with the selected coach.');

      return prev.map((item, i) =>
        i === index ? { ...item, status: 'shared' } : item
      );
    });
  };

  // Bulk assign: apply ONLY to draft videos, never overwrite shared videos
  const assignCoachToAllVideos = (coachId: string) => {
    setSelectedCoachId(coachId);

    setVideos(prev =>
      prev.map(v => {
        if (v.status === 'shared') return v;
        return { ...v, coachId };
      })
    );
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.formScroll}>
        <Text style={styles.sectionTitle}>Practice Videos</Text>

        <Text style={styles.playerWelcomeSubText}>
          Upload up to 2 short practice clips (max 2 minutes) for your coach to review.
        </Text>

        {/* 1) VIDEO UPLOAD SPACE */}
        <TouchableOpacity style={styles.videoUploadCard} onPress={pickVideo}>
          <Text style={styles.videoUploadHint}>+ Upload practice video</Text>
          <Text style={styles.videoUploadMeta}>
            {videos.length}/{MAX_PRACTICE_VIDEOS} uploaded
          </Text>
        </TouchableOpacity>

        {/* empty vs list */}
        {videos.length === 0 ? (
          <Text style={styles.playerCardEmptyText}>
            No videos uploaded yet. Start by adding your first practice clip.
          </Text>
        ) : (
          <View style={{ marginTop: 16 }}>
            {videos.map((video, index) => {
              const isShared = video.status === 'shared';
              const coachName = COACHES.find(c => c.id === video.coachId)?.name ?? '';

              return (
                <View key={index} style={styles.videoItemCard}>
                  <Text style={styles.videoItemTitle}>Practice Video {index + 1}</Text>

                  {video.durationSec ? (
                    <Text style={styles.videoItemMeta}>Duration: {video.durationSec}s</Text>
                  ) : null}

                  <Video
                    source={{ uri: video.uri }}
                    style={styles.videoPlayer}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                  />

                  <Text style={styles.assignLabel}>Select coach for review</Text>

                  <View style={styles.pickerCard}>
                    <Picker
                      enabled={!isShared}
                      selectedValue={video.coachId}
                      onValueChange={(value) =>
                        setCoachForVideo(index, String(value))
                      }
                    >
                      <Picker.Item label="Select a coach..." value="" />
                      {COACHES.map(c => (
                        <Picker.Item key={c.id} label={c.name} value={c.id} />
                      ))}
                    </Picker>
                  </View>

                  {/* TEXT ONLY highlighted (not the component box) */}
                  {video.coachId ? (
                    <Text style={styles.selectedRow}>
                      <Text style={styles.selectedLabel}>Selected: </Text>
                      <Text style={styles.selectedCoachName}>{coachName}</Text>
                    </Text>
                  ) : null}

                  {isShared ? (
                    <View style={styles.sharedPill}>
                      <Text style={styles.sharedPillText}>✅ Shared</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.confirmButton,
                        !video.coachId ? { opacity: 0.5 } : null,
                      ]}
                      disabled={!video.coachId}
                      onPress={() => confirmShareVideo(index)}
                    >
                      <Text style={styles.confirmButtonText}>Confirm & Share</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* 2) DROPDOWN BELOW UPLOAD (bulk assign) */}
        <View style={{ marginTop: 18 }}>
          <Text style={styles.statsLabel}>Select coach for review</Text>

          <View style={styles.pickerCard}>
            <Picker
              selectedValue={selectedCoachId}
              onValueChange={(value) => assignCoachToAllVideos(String(value))}
            >
              <Picker.Item label="Select a coach..." value="" />
              {COACHES.map(c => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
            </Picker>
          </View>

          {selectedCoachId && videos.length > 0 ? (
            <Text style={styles.dropdownHelperText}>
              Coach assigned to all draft videos (shared videos are locked).
            </Text>
          ) : null}
        </View>

        {/* 3) BACK BUTTON */}
        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>⬅ Return to Player Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlayerVideosScreen;
