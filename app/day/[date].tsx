import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
            const storedGames = await AsyncStorage.getItem(`games_${date}`);
            if (storedGames) {
                setGames(JSON.parse(storedGames));
            }
            const storedFund = await AsyncStorage.getItem(`fund_${date}`);
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
            await AsyncStorage.setItem(`games_${date}`, JSON.stringify(updatedGames));
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
            await AsyncStorage.setItem(`games_${date}`, JSON.stringify(updatedGames));
            setGames(updatedGames);
        } catch (error) {
            console.error('Failed to delete game', error);
        }
    };

    const saveSettings = async () => {
        try {
            await AsyncStorage.setItem(`fund_${date}`, tempFund);
            setFund(tempFund);
            setIsSettingsModalVisible(false);
        } catch (error) {
            console.error('Failed to save settings', error);
        }
    };

    const revenue = games.reduce((sum, g) => sum + (parseInt(g.player2Score || '0') - parseInt(g.player1Score || '0')), 0);
    const income = revenue * 70;
    const finalTotal = parseInt(fund || '0') + income;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Games on {date}</Text>
                <TouchableOpacity onPress={() => setIsSettingsModalVisible(true)} style={styles.gearButton}>
                    <Text style={styles.gearIcon}>⚙️</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.summaryContainer}>
                <View style={styles.summaryColumn}>
                    <Text style={styles.summaryLabel}>Fund</Text>
                    <Text style={styles.summaryValue}>{fund}</Text>
                </View>
                <View style={styles.summaryColumn}>
                    <Text style={styles.summaryLabel}>Revenue</Text>
                    <Text style={[styles.summaryValue, { color: revenue >= 0 ? '#34c759' : '#ff3b30' }]}>
                        {revenue > 0 ? '+' : ''}{revenue}
                    </Text>
                </View>
                <View style={styles.summaryColumn}>
                    <Text style={styles.summaryLabel}>Income</Text>
                    <Text style={[styles.summaryValue, { color: income >= 0 ? '#34c759' : '#ff3b30' }]}>
                        {income > 0 ? '+' : ''}{income}
                    </Text>
                </View>
                <View style={styles.summaryColumn}>
                    <Text style={styles.summaryLabel}>Total</Text>
                    <Text style={[styles.summaryValue, { color: '#007AFF' }]}>
                        {finalTotal} AMD
                    </Text>
                </View>
            </View>

            <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
                {games.length === 0 ? (
                    <Text style={styles.emptyText}>No games recorded yet.</Text>
                ) : (
                    games.map((game, index) => (
                        <View key={game.id} style={styles.gameCard}>
                            <View style={styles.gameHeader}>
                                <Text style={styles.gameNumber}>Game {index + 1}</Text>
                                <View style={styles.gameActions}>
                                    <TouchableOpacity onPress={() => openEditModal(game)} style={styles.actionButton}>
                                        <Text style={styles.editIcon}>✏️</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => confirmDelete(game.id)} style={styles.actionButton}>
                                        <Text style={styles.deleteIcon}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreText}>Player 1: {game.player1Score}</Text>
                                <Text style={styles.scoreText}>Player 2: {game.player2Score}</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.addButton} onPress={() => {
                    setEditingGameId(null);
                    setPlayer1Score('');
                    setPlayer2Score('');
                    setIsModalVisible(true);
                }}>
                    <Text style={styles.addButtonText}>Add Game</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>

            {/* Create Game Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingGameId ? 'Edit Game' : 'New Game Scores'}</Text>

                        <Text style={styles.label}>Player 1 Score:</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={player1Score}
                            onChangeText={setPlayer1Score}
                            placeholder="0"
                        />

                        <Text style={styles.label}>Player 2 Score:</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={player2Score}
                            onChangeText={setPlayer2Score}
                            placeholder="0"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeModal}>
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveGame}>
                                <Text style={[styles.buttonText, { color: 'white' }]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Settings Modal */}
            <Modal
                visible={isSettingsModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsSettingsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Day Settings</Text>

                        <Text style={styles.label}>Starting Fund:</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={tempFund}
                            onChangeText={setTempFund}
                            placeholder="8800"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsSettingsModalVisible(false)}>
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveSettings}>
                                <Text style={[styles.buttonText, { color: 'white' }]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
        position: 'relative',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    gearButton: {
        position: 'absolute',
        right: 20,
        padding: 5,
    },
    gearIcon: {
        fontSize: 24,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 15,
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryColumn: {
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    listContainer: {
        flex: 1,
        width: '100%',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: '#888',
        fontSize: 16,
        marginTop: 40,
    },
    gameCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    gameHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    gameNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
    },
    gameActions: {
        flexDirection: 'row',
    },
    actionButton: {
        marginLeft: 15,
        padding: 5,
    },
    editIcon: {
        fontSize: 18,
    },
    deleteIcon: {
        fontSize: 18,
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    scoreText: {
        fontSize: 16,
        color: '#333',
    },
    buttonContainer: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#eee',
    },
    addButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
    },
    addButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 15,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#007AFF',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        width: '80%',
        padding: 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    modalButton: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#e5e5ea',
    },
    saveButton: {
        backgroundColor: '#34c759',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
});
