import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from "react-native-safe-area-context";

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



  const getReportingMonth = (dateStr: string): string => {
    const cutoff = 25;
    // dateStr is 'YYYY-MM-DD'
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    let year = parseInt(yearStr);
    let month = parseInt(monthStr);
    const day = parseInt(dayStr);

    // If the day is after the cutoff, it belongs to the next month
    if (day > cutoff) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }

    return `${year}-${String(month).padStart(2, '0')}`;
  };

  useFocusEffect(
    useCallback(() => {
      loadMonthlySums();
      // eslint-disable-next-line react-hooks/exhaustive-deps
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

        if (games.length > 0 || fundValue !== undefined) {
          hasAnyData = true;

          const fund = parseInt(fundValue !== undefined ? (fundValue || '0') : '8800');
          const dailyTotal = fund + income;

          const monthStr = getReportingMonth(dateStr);

          if (sums[monthStr] === undefined) sums[monthStr] = 0;
          sums[monthStr] += dailyTotal;
          grandTotal += dailyTotal;
        }
      });

      setFinalTotal(grandTotal);

      const result: { month: string, name: string, sum: number }[] = [];
      const d = new Date();
      // Current reporting month based on today's date and the cutoff
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const currentReportingMonthStr = getReportingMonth(todayStr);

      // If there are no games at all, or current month doesn't have any games but we want it to be visible as an empty start state 
      // User might want even current month hidden if empty, let's strictly hide if no games, but keep current month as fallback if completely empty app.
      if (!hasAnyData) {
        // Extract year and month from the generated reporting month string to show correct name
        const [repYear, repMonth] = currentReportingMonthStr.split('-');
        result.push({
          month: currentReportingMonthStr,
          name: `${MONTH_NAMES[parseInt(repMonth) - 1]} ${repYear}`,
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
    // Determine visual name of the currently selected month
    const [y, m] = currentMonth.split('-');
    const mName = `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
    Alert.alert(
      "Delete Month",
      `Are you sure you want to delete all games and funds for ${mName} (Using cutoff day: 25)?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMonth() }
      ]
    );
  };

  const deleteMonth = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const gameKeys = keys.filter(k => k.startsWith('games_'));
      const fundKeys = keys.filter(k => k.startsWith('fund_'));

      const keysToDelete: string[] = [];

      // We need to figure out which dates belong to `currentMonth`
      for (const k of gameKeys) {
        const dateStr = k.replace('games_', '').trim();
        if (getReportingMonth(dateStr) === currentMonth) {
          keysToDelete.push(k);
        }
      }
      for (const k of fundKeys) {
        const dateStr = k.replace('fund_', '').trim();
        if (getReportingMonth(dateStr) === currentMonth) {
          keysToDelete.push(k);
        }
      }

      await AsyncStorage.multiRemove(keysToDelete);

      // Reload the data
      loadMonthlySums();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to delete month data.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Volta Counter</Text>
        </View>
        <View style={styles.heroCardContainer}>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Total Balance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              {finalTotal > 0 && <Text style={[styles.heroValue, styles.heroValuePositive, { fontSize: 32, paddingBottom: 2 }]}>+</Text>}
              {finalTotal < 0 && <Text style={[styles.heroValue, styles.heroValueNegative, { fontSize: 32, paddingBottom: 2 }]}>-</Text>}
              <Text style={[
                styles.heroValue,
                finalTotal >= 0 ? styles.heroValuePositive : styles.heroValueNegative
              ]}>
                {Math.abs(finalTotal)}
              </Text>
              <Text style={styles.heroCurrency}> AMD</Text>
            </View>
          </View>
        </View>

        <View style={styles.navContainer}>
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
                  !styles.monthSumActive && { color: data.sum >= 0 ? (data.sum > 0 ? '#10B981' : '#0F172A') : '#F43F5E' }
                ]}>
                  {data.sum > 0 ? '+' : ''}{data.sum}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>Activity</Text>
            <TouchableOpacity style={styles.deleteMonthButton} onPress={confirmDeleteMonth}>
              <Text style={styles.deleteMonthText}>Clear Month</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.calendarContainer}>
            <Calendar
              current={currentMonth + '-01'}
              onMonthChange={(month: any) => {
                setCurrentMonth(month.dateString.substring(0, 7));
              }}
              onDayPress={(day: any) => {
                router.push(`/day/${day.dateString}` as any);
              }}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#64748B',
                selectedDayBackgroundColor: '#6366F1',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#6366F1',
                dayTextColor: '#0F172A',
                textDisabledColor: '#CBD5E1',
                dotColor: '#6366F1',
                selectedDotColor: '#ffffff',
                arrowColor: '#6366F1',
                monthTextColor: '#0F172A',
                indicatorColor: '#6366F1',
                textDayFontWeight: '600',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14
              }}
            />
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: '#F8FAFC' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 10, letterSpacing: -0.5 },
  heroCardContainer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: '#F8FAFC' },
  heroCard: { backgroundColor: '#6366F1', borderRadius: 24, padding: 24, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8, marginBottom: 24 },
  heroLabel: { color: '#E0E7FF', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  heroValue: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  heroCurrency: { color: '#E0E7FF', fontSize: 18, fontWeight: '700', marginBottom: 6, marginLeft: 4 },
  heroValuePositive: { color: '#FFFFFF' },
  heroValueNegative: { color: '#FDA4AF' },
  navContainer: { marginBottom: 24 },
  navScroll: { paddingHorizontal: 20, gap: 12 },
  monthCard: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', minWidth: 110, shadowColor: '#475569', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  monthCardActive: { backgroundColor: '#1E293B', borderColor: '#1E293B', shadowColor: '#1E293B', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12 },
  monthName: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  monthNameActive: { color: '#94A3B8' },
  monthSum: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  monthSumActive: { color: '#FFFFFF' },
  calendarSection: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 10 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  calendarTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  deleteMonthButton: { backgroundColor: '#FFE4E6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
  deleteMonthText: { color: '#E11D48', fontSize: 13, fontWeight: '700' },
  calendarContainer: { paddingHorizontal: 10, paddingBottom: 40 }
});
