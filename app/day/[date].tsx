import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Game = {
    id: string;
    player1Score: string;
    player2Score: string;
};

export default function DayPage() {
    const { date } = useLocalSearchParams<{ date: string }>();
    const router = useRouter();

    const [games, setGames] = useState<Game[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [player1Score, setPlayer1Score] = useState('');
    const [player2Score, setPlayer2Score] = useState('');
    const [fund, setFund] = useState('8800');
    const [tempFund, setTempFund] = useState('8800');
    const [editingGameId, setEditingGameId] = useState<string | null>(null);

    useEffect(() => {
        if (date) {
            loadGames();
        }
    }, [date]);

    const loadGames = async () => {
        try {
            const storedGames = await AsyncStorage.getItem(`games_${date} `);
            if (storedGames) {
                setGames(JSON.parse(storedGames));
            }
            const storedFund = await AsyncStorage.getItem(`fund_${date} `);
            if (storedFund) {
                setFund(storedFund);
                setTempFund(storedFund);
            }
        } catch (error) {
            console.error('Failed to load data', error);
        }
    };

    const saveGame = async () => {
        if (!player1Score || !player2Score) {
            Alert.alert("Error", "Please enter scores for both players.");
            return;
        }

        let updatedGames;

        if (editingGameId) {
            updatedGames = games.map(g =>
                g.id === editingGameId
                    ? { ...g, player1Score, player2Score }
                    : g
            );
        } else {
            const newGame: Game = {
                id: Date.now().toString(),
                player1Score,
                player2Score,
            };
            updatedGames = [...games, newGame];
        }

        try {
            await AsyncStorage.setItem(`games_${date} `, JSON.stringify(updatedGames));
            setGames(updatedGames);
            closeModal();
        } catch (error) {
            console.error('Failed to save game', error);
        }
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setEditingGameId(null);
        setPlayer1Score('');
        setPlayer2Score('');
    };

    const openEditModal = (game: Game) => {
        setEditingGameId(game.id);
        setPlayer1Score(game.player1Score);
        setPlayer2Score(game.player2Score);
        setIsModalVisible(true);
    };

    const confirmDelete = (gameId: string) => {
        Alert.alert(
            "Delete Game",
            "Are you sure you want to delete this game?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteGame(gameId) }
            ]
        );
    };

    const deleteGame = async (gameId: string) => {
        const updatedGames = games.filter(g => g.id !== gameId);
        try {
            await AsyncStorage.setItem(`games_${date} `, JSON.stringify(updatedGames));
            setGames(updatedGames);
        } catch (error) {
            console.error('Failed to delete game', error);
        }
    };

    const saveSettings = async () => {
        try {
            await AsyncStorage.setItem(`fund_${date} `, tempFund);
            setFund(tempFund);
            setIsSettingsModalVisible(false);
        } catch (error) {
            console.error('Failed to save settings', error);
        }
    };

    const revenue = games.reduce((sum, g) => sum + (parseInt(g.player2Score || '0') - parseInt(g.player1Score || '0')), 0);
    const income = revenue * 70;
    const finalTotal = parseInt(fund || '0') + income;

    let dateTitle = date;
    if (date) {
        const [y, m, d] = date.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        if (!isNaN(dateObj.getTime())) {
            dateTitle = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButtonTop}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{dateTitle}</Text>
                    <TouchableOpacity onPress={() => setIsSettingsModalVisible(true)} style={styles.gearButton}>
                        <Text style={styles.gearIcon}>⚙️</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.summaryContainer}>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabel}>Fund</Text>
                            <Text style={styles.summaryValue}>{fund}</Text>
                        </View>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabel}>Revenue</Text>
                            <Text style={[styles.summaryValue, { color: revenue >= 0 ? '#10B981' : '#F43F5E' }]}>
                                {revenue > 0 ? '+' : ''}{revenue}
                            </Text>
                        </View>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabel}>Income</Text>
                            <Text style={[styles.summaryValue, { color: income >= 0 ? '#10B981' : '#F43F5E' }]}>
                                {income > 0 ? '+' : ''}{income}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Daily Total</Text>
                        <View style={styles.totalValueRow}>
                            <Text style={[styles.totalValueText, { color: finalTotal >= 0 ? '#6366F1' : '#F43F5E' }]}>
                                {finalTotal > 0 ? '+' : ''}{finalTotal}
                            </Text>
                            <Text style={styles.totalCurrency}> AMD</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Games ({games.length})</Text>
                </View>

                <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
                    {games.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>🎮</Text>
                            <Text style={styles.emptyText}>No games recorded yet</Text>
                            <Text style={styles.emptySubtext}>Tap the button below to add your first game for the day.</Text>
                        </View>
                    ) : (
                        games.map((game, index) => (
                            <View key={game.id} style={styles.gameCard}>
                                <View style={styles.gameHeader}>
                                    <Text style={styles.gameNumber}>Game {index + 1}</Text>
                                    <View style={styles.gameActions}>
                                        <TouchableOpacity onPress={() => openEditModal(game)} style={styles.actionButton}>
                                            <Text style={styles.actionIcon}>✏️</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => confirmDelete(game.id)} style={[styles.actionButton, styles.deleteActionButton]}>
                                            <Text style={styles.actionIcon}>🗑️</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.scoreRow}>
                                    <View style={styles.playerScoreBox}>
                                        <Text style={styles.playerLabel}>Player 1</Text>
                                        <Text style={styles.scoreText}>{game.player1Score}</Text>
                                    </View>
                                    <View style={styles.vsBadge}>
                                        <Text style={styles.vsText}>VS</Text>
                                    </View>
                                    <View style={styles.playerScoreBox}>
                                        <Text style={styles.playerLabel}>Player 2</Text>
                                        <Text style={styles.scoreText}>{game.player2Score}</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>

                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.addButton} onPress={() => {
                        setEditingGameId(null);
                        setPlayer1Score('');
                        setPlayer2Score('');
                        setIsModalVisible(true);
                    }}>
                        <Text style={styles.addButtonText}>Add New Game</Text>
                    </TouchableOpacity>
                </View>

                <Modal
                    visible={isModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={closeModal}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editingGameId ? 'Edit Game' : 'New Game'}</Text>
                                <TouchableOpacity onPress={closeModal} style={styles.closeIconBtn}>
                                    <Text style={styles.closeIconText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Player 1 Score</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={player1Score}
                                    onChangeText={setPlayer1Score}
                                    placeholder="0"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Player 2 Score</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={player2Score}
                                    onChangeText={setPlayer2Score}
                                    placeholder="0"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <TouchableOpacity style={styles.saveButton} onPress={saveGame}>
                                <Text style={styles.saveButtonText}>Save Game</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <Modal
                    visible={isSettingsModalVisible}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setIsSettingsModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Daily Settings</Text>
                                <TouchableOpacity onPress={() => setIsSettingsModalVisible(false)} style={styles.closeIconBtn}>
                                    <Text style={styles.closeIconText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Starting Fund</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={tempFund}
                                    onChangeText={setTempFund}
                                    placeholder="8800"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
                                <Text style={styles.saveButtonText}>Update Settings</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#F8FAFC' },
    backButtonTop: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#475569', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    backIcon: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', lineHeight: 24 },
    title: { fontSize: 20, fontWeight: '800', color: '#0F172A', flex: 1, textAlign: 'center' },
    gearButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#475569', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    gearIcon: { fontSize: 18 },
    summaryContainer: { marginHorizontal: 20, marginBottom: 20 },
    summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
    summaryBox: { flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', shadowColor: '#475569', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    summaryLabel: { fontSize: 12, color: '#64748B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
    summaryValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    totalBox: { backgroundColor: '#1E293B', padding: 24, borderRadius: 20, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6, alignItems: 'center' },
    totalLabel: { color: '#94A3B8', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    totalValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
    totalValueText: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
    totalCurrency: { color: '#94A3B8', fontSize: 16, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
    listHeader: { paddingHorizontal: 24, marginBottom: 12 },
    listTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    listContainer: { flex: 1 },
    listContent: { paddingHorizontal: 20, paddingBottom: 20 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 40, paddingHorizontal: 20 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
    gameCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#475569', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#F8FAFC' },
    gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    gameNumber: { fontSize: 14, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    gameActions: { flexDirection: 'row', gap: 12 },
    actionButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    deleteActionButton: { backgroundColor: '#FFE4E6' },
    actionIcon: { fontSize: 14 },
    scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
    playerScoreBox: { alignItems: 'center', flex: 1 },
    playerLabel: { fontSize: 13, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase' },
    scoreText: { fontSize: 32, fontWeight: '800', color: '#0F172A' },
    vsBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    vsText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
    bottomBar: { padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 8 },
    addButton: { backgroundColor: '#6366F1', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    closeIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    closeIconText: { fontSize: 14, fontWeight: 'bold', color: '#64748B' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 18, fontWeight: '600', color: '#0F172A' },
    saveButton: { backgroundColor: '#10B981', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 8, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }
});
