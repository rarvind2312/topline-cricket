import React from 'react';
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Video, ResizeMode } from 'expo-av';

import type { RootStackParamList, CoachVideoItem } from '../types';

import { styles } from '../styles/styles';
import { toplineLogo } from '../constants/assets';

type CoachVideoReviewProps = NativeStackScreenProps<
  RootStackParamList,
  'CoachVideoReview'
>;

const CoachVideoReviewScreenBody: React.FC<CoachVideoReviewProps> = ({
  navigation,
}) => {
  // Mock list for now — later comes from Firebase Storage + Firestore
  const [videos, setVideos] = React.useState<CoachVideoItem[]>([
    {
      id: '1',
      uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      playerName: 'Sachin Arvind',
      createdAt: 'Today',
      uploadedBy: 'player',
      context: 'selfTraining',
      reviewed: false,
      durationSec: 45,
    },
    {
      id: '2',
      uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      playerName: 'Nanak Sidana',
      createdAt: 'Yesterday',
      uploadedBy: 'player',
      context: 'selfTraining',
      reviewed: true,
      feedback: 'Great balance. Wait a fraction longer before playing the drive.',
      durationSec: 65,
    },
  ]);

  const [tab, setTab] = React.useState<'pending' | 'reviewed'>('pending');

  const [selected, setSelected] = React.useState<CoachVideoItem | null>(null);
  const [draftFeedback, setDraftFeedback] = React.useState('');

  const filtered = React.useMemo(() => {
    return videos.filter((v) => (tab === 'pending' ? !v.reviewed : v.reviewed));
  }, [videos, tab]);

  const openReview = (item: CoachVideoItem) => {
    setSelected(item);
    setDraftFeedback(item.feedback ?? '');
  };

  const closeReview = () => {
    setSelected(null);
    setDraftFeedback('');
  };

  const saveFeedback = () => {
    if (!selected) return;

    const trimmed = draftFeedback.trim();
    if (!trimmed) {
      Alert.alert('Feedback required', 'Please enter feedback before saving.');
      return;
    }

    setVideos((prev) =>
      prev.map((v) =>
        v.id === selected.id ? { ...v, reviewed: true, feedback: trimmed } : v
      )
    );

    Alert.alert('Saved ✅', 'Feedback has been saved for the player.');
    closeReview();
  };

  const getMetaLabel = (v: CoachVideoItem) => {
    const who = v.uploadedBy === 'player' ? 'Player upload' : 'Coach upload';
    const ctx = v.context === 'selfTraining' ? 'Self training' : 'Topline centre';
    return `${who} • ${ctx}`;
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.formScroll}>
        {/* Header row + logo */}
        <View style={styles.coachTopHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Video Review</Text>
            <Text style={styles.playerWelcomeSubText}>
              Review practice videos and add feedback.
            </Text>
          </View>

          <Image
            source={toplineLogo}
            style={styles.coachTopRightLogo}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('CoachDashboard')}
        >
          <Text style={styles.secondaryButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>

        {/* Tabs */}
        <View style={styles.coachTabsRow}>
          <TouchableOpacity
            style={[
              styles.coachTabPill,
              tab === 'pending' ? styles.coachTabPillActive : null,
            ]}
            onPress={() => setTab('pending')}
          >
            <Text
              style={[
                styles.coachTabText,
                tab === 'pending' ? styles.coachTabTextActive : null,
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.coachTabPill,
              tab === 'reviewed' ? styles.coachTabPillActive : null,
            ]}
            onPress={() => setTab('reviewed')}
          >
            <Text
              style={[
                styles.coachTabText,
                tab === 'reviewed' ? styles.coachTabTextActive : null,
              ]}
            >
              Reviewed
            </Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <View style={styles.coachCardEmpty}>
            <Text style={styles.playerCardEmptyText}>
              {tab === 'pending'
                ? 'No pending videos right now.'
                : 'No reviewed videos yet.'}
            </Text>
          </View>
        ) : (
          filtered.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={styles.coachVideoCard}
              onPress={() => openReview(v)}
              activeOpacity={0.85}
            >
              <View style={styles.coachVideoCardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coachVideoTitle}>{v.playerName}</Text>
                  <Text style={styles.coachVideoMeta}>
                    {v.createdAt} • {getMetaLabel(v)}
                  </Text>

                  {typeof v.durationSec === 'number' ? (
                    <Text style={styles.coachVideoMeta}>
                      Duration: {v.durationSec}s
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.coachStatusPill,
                    v.reviewed
                      ? styles.coachStatusPillDone
                      : styles.coachStatusPillPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.coachStatusText,
                      v.reviewed
                        ? styles.coachStatusTextDone
                        : styles.coachStatusTextPending,
                    ]}
                  >
                    {v.reviewed ? 'Reviewed' : 'Pending'}
                  </Text>
                </View>
              </View>

              <Text style={styles.coachVideoCTA}>
                Tap to {v.reviewed ? 'view' : 'review'} →
              </Text>
            </TouchableOpacity>
          ))
        )}

        {/* Review Modal */}
        <Modal visible={!!selected} animationType="slide" onRequestClose={closeReview}>
          <SafeAreaView style={styles.screenContainer}>
            <ScrollView contentContainerStyle={styles.formScroll}>
              <View style={styles.coachReviewHeaderRow}>
                <Text style={styles.sectionTitle}>Review</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={toplineLogo}
                    style={styles.coachTopRightLogoSmall}
                    resizeMode="contain"
                  />

                  <TouchableOpacity onPress={closeReview} style={{ marginLeft: 10 }}>
                    <Text style={styles.coachCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {selected ? (
                <>
                  <View style={styles.coachCard}>
                    <Text style={styles.playerCardTitle}>{selected.playerName}</Text>
                    <Text style={styles.playerCardSubtitle}>
                      {selected.createdAt} • {getMetaLabel(selected)}
                    </Text>

                    <View style={{ marginTop: 12 }}>
                      <Video
                        source={{ uri: selected.uri }}
                        style={styles.videoPlayer}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                      />
                    </View>
                  </View>

                  <View style={styles.coachCard}>
                    <Text style={styles.statsLabel}>Coach feedback</Text>
                    <TextInput
                      style={[
                        styles.statsInput,
                        { height: 110, textAlignVertical: 'top' },
                      ]}
                      multiline
                      placeholder="Write feedback for the player (e.g. wait for the ball, head still, strong front leg)."
                      value={draftFeedback}
                      onChangeText={setDraftFeedback}
                    />

                    <TouchableOpacity
                      style={[styles.primaryButton, { marginTop: 12 }]}
                      onPress={saveFeedback}
                    >
                      <Text style={styles.primaryButtonText}>Save Feedback</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CoachVideoReviewScreenBody;
