
import { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';


const QUALITIES = [
    { id: '1080p', label: 'Full HD', description: 'Best clarity', size: 'Size not yet available' },
    { id: '720p', label: 'HD', description: 'Recommended', size: 'Size not yet available' },
    { id: '480p', label: 'Standard', description: 'Balanced quality', size: 'Size not yet available' },
    { id: '360p', label: 'Data saver', description: 'Smaller file', size: 'Size not yet available' },
];

export default function QualityScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        platform?: string;
        url?: string;
    }>();

    const [selectedQuality, setSelectedQuality] = useState('720p');

    const platform =
        typeof params.platform === 'string' ? params.platform : 'Video';

    const videoUrl =
        typeof params.url === 'string' ? params.url : '';

    const handleContinue = () => {
        if (!videoUrl) {
            Alert.alert(
                'Missing URL',
                'Please return and enter a video URL.',
            );
            return;
        }

        router.push({
            pathname: '/download-progress',
            params: {
                platform,
                url: videoUrl,
                quality: selectedQuality,
            },
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="dark" />

            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                    accessibilityRole="button"
                >
                    <Text style={styles.backText}>‹  Back</Text>
                </Pressable>

                <Text style={styles.eyebrow}>DOWNLOAD SETTINGS</Text>
                <Text style={styles.title}>Choose quality</Text>
                <Text style={styles.subtitle}>
                    Select your preferred video quality before continuing.
                </Text>

                <View style={styles.sourceCard}>
                    <View style={styles.sourceIcon}>
                        <Text style={styles.sourceIconText}>↗</Text>
                    </View>

                    <View style={styles.sourceContent}>
                        <Text style={styles.sourceLabel}>Selected platform</Text>
                        <Text style={styles.sourcePlatform}>{platform}</Text>
                        <Text style={styles.url} numberOfLines={2}>
                            {videoUrl}
                        </Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Available quality options</Text>

                {QUALITIES.map((quality) => {
                    const selected = selectedQuality === quality.id;

                    return (
                        <Pressable
                            key={quality.id}
                            onPress={() => setSelectedQuality(quality.id)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            style={[
                                styles.qualityCard,
                                selected && styles.qualityCardSelected,
                            ]}
                        >
                            <View
                                style={[
                                    styles.qualityIcon,
                                    selected && styles.qualityIconSelected,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.qualityIconText,
                                        selected && styles.qualityIconTextSelected,
                                    ]}
                                >
                                    HD
                                </Text>
                            </View>

                            <View style={styles.qualityContent}>
                                <View style={styles.qualityTitleRow}>
                                    <Text style={styles.qualityName}>{quality.id}</Text>
                                    {quality.id === '720p' && (
                                        <Text style={styles.recommended}>POPULAR</Text>
                                    )}
                                </View>

                                <Text style={styles.qualityDescription}>
                                    {quality.label} · {quality.description}
                                </Text>

                                <Text style={styles.qualitySize}>{quality.size}</Text>
                            </View>

                            <View
                                style={[
                                    styles.radio,
                                    selected && styles.radioSelected,
                                ]}
                            >
                                {selected && <View style={styles.radioDot} />}
                            </View>
                        </Pressable>
                    );
                })}

                <View style={styles.notice}>
                    <Text style={styles.noticeIcon}>ⓘ</Text>
                    <Text style={styles.noticeText}>
                        These are sample quality choices. Actual resolutions and file
                        sizes depend on the supported video source and will be shown
                        once stream detection is implemented.
                    </Text>
                </View>

                <Pressable
                    onPress={handleContinue}
                    style={({ pressed }) => [
                        styles.continueButton,
                        pressed && styles.buttonPressed,
                    ]}
                >
                    <Text style={styles.continueText}>Continue</Text>
                    <Text style={styles.continueArrow}>→</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    container: {
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom: 32,
    },
    backButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingRight: 16,
        marginBottom: 24,
    },
    backText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2563EB',
    },
    eyebrow: {
        color: '#2563EB',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.7,
    },
    title: {
        color: '#111827',
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.8,
        marginTop: 10,
    },
    subtitle: {
        color: '#64748B',
        fontSize: 13,
        lineHeight: 20,
        marginTop: 9,
        marginBottom: 23,
    },
    sourceCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 17,
        padding: 15,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 27,
    },
    sourceIcon: {
        width: 43,
        height: 43,
        borderRadius: 13,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sourceIconText: {
        fontSize: 24,
        color: '#2563EB',
        fontWeight: '700',
    },
    sourceContent: {
        flex: 1,
    },
    sourceLabel: {
        color: '#94A3B8',
        fontSize: 11,
    },
    sourcePlatform: {
        color: '#111827',
        fontSize: 15,
        fontWeight: '700',
        marginTop: 3,
    },
    url: {
        color: '#64748B',
        fontSize: 11,
        lineHeight: 16,
        marginTop: 5,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 13,
    },
    qualityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        marginBottom: 11,
    },
    qualityCardSelected: {
        borderColor: '#2563EB',
        backgroundColor: '#F0F5FF',
    },
    qualityIcon: {
        width: 45,
        height: 45,
        borderRadius: 13,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qualityIconSelected: {
        backgroundColor: '#DBEAFE',
    },
    qualityIconText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '800',
    },
    qualityIconTextSelected: {
        color: '#2563EB',
    },
    qualityContent: {
        flex: 1,
    },
    qualityTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 7,
    },
    qualityName: {
        color: '#111827',
        fontSize: 15,
        fontWeight: '800',
    },
    recommended: {
        color: '#2563EB',
        backgroundColor: '#DBEAFE',
        overflow: 'hidden',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: '800',
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    qualityDescription: {
        color: '#64748B',
        fontSize: 11,
        marginTop: 4,
    },
    qualitySize: {
        color: '#94A3B8',
        fontSize: 10,
        marginTop: 5,
    },
    radio: {
        width: 20,
        height: 20,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: '#2563EB',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#2563EB',
    },
    notice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#EFF6FF',
        padding: 13,
        borderRadius: 13,
        marginTop: 8,
    },
    noticeIcon: {
        color: '#2563EB',
        fontSize: 14,
    },
    noticeText: {
        flex: 1,
        color: '#475569',
        fontSize: 11,
        lineHeight: 17,
    },
    continueButton: {
        minHeight: 53,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#2563EB',
        borderRadius: 15,
        marginTop: 22,
    },
    continueText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    continueArrow: {
        color: '#FFFFFF',
        fontSize: 20,
    },
    buttonPressed: {
        opacity: 0.8,
    },
});
