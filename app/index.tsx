import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from 'react-native-calendars';

type Game = {
  id: string;
  player1Score: string;
  player2Score: string;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Index() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthsData, setMonthsData] = useState<{ month: string, name: string, sum: number }[]>([]);
  const [finalTotal, setFinalTotal] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      loadMonthlySums();
    }, [])
  );

  const loadMonthlySums = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const gameKeys = keys.filter(k => k.startsWith('games_'));
      const fundKeys = keys.filter(k => k.startsWith('fund_'));

      const storedGames = await AsyncStorage.multiGet(gameKeys);
      const storedFunds = await AsyncStorage.multiGet(fundKeys);

      const sums: Record<string, number> = {};
      let grandTotal = 0;
      let hasAnyData = false;

      const gamesMap = new Map<string, Game[]>();
      storedGames.forEach(([k, v]) => { if (v) gamesMap.set(k.replace('games_', ''), JSON.parse(v)); });

      const fundsMap = new Map<string, string>();
      storedFunds.forEach(([k, v]) => { if (v) fundsMap.set(k.replace('fund_', ''), v); });

      const allDatesArray = Array.from(new Set([...gamesMap.keys(), ...fundsMap.keys()]));

      allDatesArray.forEach(dateStr => {
        const games = gamesMap.get(dateStr) || [];
        const fundValue = fundsMap.get(dateStr);

        let income = 0;
        games.forEach(g => {
          const revenue = parseInt(g.player2Score || '0') - parseInt(g.player1Score || '0');
          income += revenue * 70;
        });

        // The day is considered active if there are games, or if a fund was explicitly saved
        if (games.length > 0 || fundValue !== undefined) {
          hasAnyData = true;

          const fund = parseInt(fundValue !== undefined ? (fundValue || '0') : '8800');
          const dailyTotal = fund + income;

          const monthStr = dateStr.substring(0, 7);

          if (sums[monthStr] === undefined) sums[monthStr] = 0;
          sums[monthStr] += dailyTotal;
          grandTotal += dailyTotal;
        }
      });

      setFinalTotal(grandTotal);

      const result: { month: string, name: string, sum: number }[] = [];
      const d = new Date();
      const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      // If there are no games at all, or current month doesn't have any games but we want it to be visible as an empty start state 
      // User might want even current month hidden if empty, let's strictly hide if no games, but keep current month as fallback if completely empty app.
      if (!hasAnyData) {
        result.push({
          month: currentMonthStr,
          name: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
          sum: 0
        });
      } else {
        // Sort months chronologically
        const sortedMonthStrs = Object.keys(sums).sort();

        sortedMonthStrs.forEach(mStr => {
          const [yearStr, monthStr] = mStr.split('-');
          const year = parseInt(yearStr);
          const month = parseInt(monthStr);

          result.push({
            month: mStr,
            name: `${MONTH_NAMES[month - 1]} ${year}`,
            sum: sums[mStr]
          });
        });

        // If current month is not in the list (meaning no games played this month yet), 
        // we might still want to add it to the end so user can select it. 
        // Or per request "if there is game added in that month show it otherwise dont show", 
        // we strictly only show months with games. Let's strictly only show months with games.
      }

      setMonthsData(result);

      // If the currently selected month is not in the list anymore (e.g. they deleted all games from a month),
      // we should probably select the most recent month with data
      if (result.length > 0 && !result.find(r => r.month === currentMonth)) {
        // Default to the last month (most recent usually since it's sorted chronologically)
        setCurrentMonth(result[result.length - 1].month);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDeleteMonth = () => {
    Alert.alert(
      "Delete Month",
      `Are you sure you want to delete all games and funds for ${currentMonth}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMonth() }
      ]
    );
  };

  const deleteMonth = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const monthGamesKeys = keys.filter(k => k.startsWith(`games_${currentMonth}`));
      const monthFundKeys = keys.filter(k => k.startsWith(`fund_${currentMonth}`));

      await AsyncStorage.multiRemove([...monthGamesKeys, ...monthFundKeys]);

      // Reload the data
      loadMonthlySums();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to delete month data.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.navContainer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Balance</Text>
          <Text style={[
            styles.totalValue,
            { color: finalTotal >= 0 ? (finalTotal > 0 ? '#34c759' : '#333') : '#ff3b30' }
          ]}>
            {finalTotal > 0 ? '+' : ''}{finalTotal}
          </Text>
        </View>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navScroll}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {monthsData.map((data, index) => (
            <TouchableOpacity
              key={data.month}
              style={[styles.monthCard, currentMonth === data.month && styles.monthCardActive]}
              onPress={() => setCurrentMonth(data.month)}
            >
              <Text style={[styles.monthName, currentMonth === data.month && styles.monthNameActive]}>{data.name}</Text>
              <Text style={[
                styles.monthSum,
                currentMonth === data.month && styles.monthSumActive,
                !styles.monthSumActive && { color: data.sum >= 0 ? (data.sum > 0 ? '#34c759' : '#333') : '#ff3b30' }
              ]}>
                {data.sum > 0 ? '+' : ''}{data.sum}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.calendarHeader}>
        <TouchableOpacity style={styles.deleteMonthButton} onPress={confirmDeleteMonth}>
          <Text style={styles.deleteMonthText}>Delete {currentMonth} Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendarContainer}>
        <Calendar
          current={currentMonth + '-01'}
          onMonthChange={(month: any) => {
            setCurrentMonth(month.dateString.substring(0, 7));
          }}
          onDayPress={(day: any) => {
            router.push(`/day/${day.dateString}` as any);
          }}
          theme={{
            todayTextColor: '#007AFF',
            selectedDayBackgroundColor: '#007AFF',
            arrowColor: '#007AFF',
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navContainer: {
    paddingVertical: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  navScroll: {
    paddingHorizontal: 15,
  },
  monthCard: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  monthCardActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  monthName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  monthNameActive: {
    color: '#fff',
  },
  monthSum: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  monthSumActive: {
    color: '#fff',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  deleteMonthButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteMonthText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  calendarContainer: {
    flex: 1,
    paddingTop: 10,
  }
});
