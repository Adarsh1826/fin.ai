import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
  TextInput,
  Animated,
  Pressable,
  Platform,
  Dimensions,
} from "react-native";
import { ThemeContext } from "@/app/_layout";

import Svg, { Path, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import * as shape from "d3-shape";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  image: string;
}

/* ---------------------------
   Debounce helper
   --------------------------- */
function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ---------------------------
   Sparkline (internal)
   - lightweight: fetch initial klines and open websocket for updates
   - expects binance symbol like "BTCUSDT"
   --------------------------- */
function Sparkline({
  pair = "BTCUSDT",
  interval = "1m",
  points = 60,
  width = 300,
  height = 84,
  accent = "#34d399",
}: {
  pair?: string; // e.g. BTCUSDT
  interval?: string;
  points?: number;
  width?: number;
  height?: number;
  accent?: string;
}) {
  const [data, setData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${points}`;
    fetch(url)
      .then((r) => r.json())
      .then((klines) => {
        if (!mounted) return;
        const closes = (klines || []).map((k: any) => Number(k[4]));
        setData(closes);
      })
      .catch((e) => {
        console.warn("Sparkline kline fetch failed", e);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [pair, interval, points]);

  // websocket for live updates
  useEffect(() => {
    if (!pair) return;
    const streamSymbol = pair.toLowerCase();
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamSymbol}@kline_${interval}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const k = msg.k;
        const close = Number(k.c);
        setData((prev) => {
          const copy = prev.slice();
          if (copy.length < points) {
            copy.push(close);
            return copy;
          } else {
            copy.shift();
            copy.push(close);
            return copy;
          }
        });
      } catch (err) {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      // ignore
    };

    return () => {
      try {
        ws.close();
      } catch (e) {}
    };
  }, [pair, interval, points]);

  // compute path
  const padding = 6;
  const { pathD, areaD, minVal, maxVal } = useMemo(() => {
    if (!data || data.length === 0) return { pathD: "", areaD: "", minVal: 0, maxVal: 0 };
    const values = data.slice(-points);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const len = values.length;
    const w = width;
    const h = height;
    const xScale = (i: number) => {
      if (len === 1) return padding + (w - padding * 2) / 2;
      return padding + (i / (len - 1)) * (w - padding * 2);
    };
    const yScale = (v: number) => {
      if (max === min) return h / 2;
      const norm = (v - min) / (max - min);
      return h - padding - norm * (h - padding * 2);
    };
    const pts = values.map((v, i) => [xScale(i), yScale(v)]);
    const line = shape
      .line()
      .x((d: any) => d[0])
      .y((d: any) => d[1])
      .curve(shape.curveMonotoneX)(pts);
    const area = shape
      .area()
      .x((d: any) => d[0])
      .y0(height - padding)
      .y1((d: any) => d[1])
      .curve(shape.curveMonotoneX)(pts);
    return { pathD: line || "", areaD: area || "", minVal: min, maxVal: max };
  }, [data, width, height, points]);

  const latest = data.length ? data[data.length - 1] : undefined;
  const prev = data.length > 1 ? data[data.length - 2] : undefined;
  const up = prev == null ? true : (latest ?? 0) >= prev;

  const stroke = up ? accent : "#fb7185";

  return (
    <View style={{ width, height: height + 12 }}>
      <View style={{ position: "absolute", right: 6, top: 0 }}>
        <Text style={{ fontSize: 12, fontWeight: "800", color: stroke }}>{latest ? latest.toLocaleString() : "--"}</Text>
      </View>

      <View style={{ width, height }}>
        {loading ? (
          <View style={{ width, height, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={accent} />
          </View>
        ) : (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={`g-${pair}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stroke} stopOpacity="0.14" />
                <Stop offset="1" stopColor={stroke} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>

            <Rect x="0" y="0" width={width} height={height} rx={8} fill="transparent" />
            {areaD ? <Path d={areaD} fill={`url(#g-${pair})`} /> : null}
            {pathD ? <Path d={pathD} stroke={stroke} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
          </Svg>
        )}
      </View>
    </View>
  );
}

/* ---------------------------
   Main Card (updated)
   - embeds Sparkline under actions
   --------------------------- */
export default function Card() {
  const GEMINI_API_KEY = "AIzaSyDzZOpxn9ru9aXDl_BSUNi9S7i_oNqRBrc";
  const { theme } = useContext(ThemeContext);

  const [coins, setCoins] = useState<Coin[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<Coin[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiSuggestion, setGeminiSuggestion] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchText, 240);

  const fadeAnim = useState(new Animated.Value(1))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];

  const colors = {
    light: {
      card: "#ffffff",
      containerBg: "#f2f6f8",
      text: "#0b1220",
      accent: "#0ea5a4",
      modalOverlay: "rgba(2,6,23,0.25)",
      inputBg: "#f3faf9",
      muted: "#6b7280",
      logoBg: "#f8faf9",
      subtle: "#eef2f7",
    },
    dark: {
      card: "#071022",
      containerBg: "#071022",
      text: "#e6eef3",
      accent: "#34d399",
      modalOverlay: "rgba(2,6,23,0.75)",
      inputBg: "#0b1220",
      muted: "#94a3b8",
      logoBg: "#071022",
      subtle: "#0b1724",
    },
  } as const;

  const current = colors[theme as "light" | "dark"];
  const W = Dimensions.get("window").width;
  const sparkW = Math.min(360, Math.floor(W * 0.62)); // responsive width for sparkline

  useEffect(() => {
    let mounted = true;
    fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false"
    )
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setCoins(data || []);
        setFilteredCoins(data || []);
        setSelectedCoin(data?.[0] || null);
      })
      .catch((err) => console.log(err))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!debouncedSearch) return setFilteredCoins(coins);
    const q = debouncedSearch.toLowerCase();
    const filtered = coins.filter((c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    setFilteredCoins(filtered);
  }, [debouncedSearch, coins]);

  const handleNeedHelp = async () => {
    if (!selectedCoin) return;

    setGeminiLoading(true);
    setGeminiSuggestion(null);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0.6, duration: 220, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.985, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]),
    ]).start();

    try {
      const promptText = `You are an educational AI assistant. The current price of ${selectedCoin.symbol.toUpperCase()} is $${selectedCoin.current_price.toLocaleString()}. Provide short educational ranges: Enter: <USD range> Exit: <USD range>. 2 lines max. Not financial advice.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: promptText }] }] }),
        }
      );

      const data = await res.json();
      const suggestion = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No suggestion returned";
      setGeminiSuggestion(suggestion);
    } catch (err) {
      console.error(err);
      setGeminiSuggestion("Error fetching suggestion");
    } finally {
      setGeminiLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  };

  const renderLogo = (coin: Coin | null) => {
    if (!coin) return null;
    if (coin.image) return <Image source={{ uri: coin.image }} style={styles.logoImage} />;
    const initials = coin.symbol?.slice(0, 3).toUpperCase() || "?";
    return (
      <View style={[styles.fallbackLogo, { backgroundColor: current.logoBg }]}>
        <Text style={[styles.fallbackLogoText, { color: current.text }]}>{initials}</Text>
      </View>
    );
  };

  const keyExtractor = (item: Coin) => item.id;

  const emptyList = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: current.muted }]}>No coins found</Text>
      </View>
    ),
    [current.muted]
  );

  if (loading) {
    return (
      <View style={[styles.loaderWrap, { backgroundColor: current.containerBg }]}>
        <ActivityIndicator size="large" color={current.accent} />
      </View>
    );
  }

  // build binance pair from selectedCoin symbol
  const pairForSpark = selectedCoin ? `${selectedCoin.symbol.toUpperCase()}USDT` : "BTCUSDT";

  return (
    <Animated.View style={[styles.container, { backgroundColor: current.card, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      {/* Logo and quick tag */}
      <View style={styles.leftWrap}>
        <View style={[styles.logoWrap, { backgroundColor: current.subtle }]}>{renderLogo(selectedCoin)}</View>
        <View style={[styles.rankBadge, { backgroundColor: current.logoBg }]}>
          <Text style={[styles.rankText, { color: current.muted }]}>{selectedCoin ? selectedCoin.symbol.toUpperCase() : "--"}</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Text style={[styles.coinTitle, { color: current.text }]} numberOfLines={1}>
            {selectedCoin?.name ?? "Choose a coin"}
          </Text>
          <Text style={[styles.coinPrice, { color: current.accent }]}>${selectedCoin?.current_price?.toLocaleString() ?? "-"}</Text>
        </View>

        <Text style={[styles.coinSubtitle, { color: current.muted }]} numberOfLines={1}>
          {selectedCoin?.symbol?.toUpperCase()} • Live
        </Text>

        <View style={styles.actionsRow}>
          <Pressable onPress={handleNeedHelp} style={({ pressed }) => [styles.helpButton, { borderColor: current.accent, opacity: pressed ? 0.9 : 1 }]}>
            {geminiLoading ? <ActivityIndicator size="small" color={current.accent} /> : <Text style={[styles.helpBtnText, { color: current.accent }]}>Need Help</Text>}
          </Pressable>

          <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.selectBtn, { backgroundColor: current.inputBg }]}>
            <Text style={[styles.selectBtnText, { color: current.text }]}>{selectedCoin ? "Change" : "Select"}</Text>
          </TouchableOpacity>
        </View>

        {/* SPARKLINE */}
        <View style={{ marginTop: 12 }}>
          <Sparkline pair={pairForSpark} width={sparkW} height={84} accent={current.accent} />
        </View>

        {geminiSuggestion ? (
          <Text style={[styles.suggestionText, { color: current.text }]} numberOfLines={3}>
            {geminiSuggestion}
          </Text>
        ) : (
          <Text style={[styles.hint, { color: current.muted }]}>Tap "Need Help" for a short educational suggestion.</Text>
        )}
      </View>

      {/* Modal */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: current.modalOverlay }]} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: current.card }]}>
            <View style={styles.modalHeader}>
              <TextInput style={[styles.searchInput, { backgroundColor: current.inputBg, color: current.text }]} placeholder="Search coin name or symbol" placeholderTextColor={current.muted} value={searchText} onChangeText={setSearchText} autoCorrect={false} autoCapitalize="none" />
              <TouchableOpacity
                onPress={() => {
                  setSearchText("");
                  setFilteredCoins(coins);
                }}
                style={styles.clearBtn}
              >
                <Text style={{ color: current.muted, fontWeight: "700" }}>Clear</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredCoins}
              keyExtractor={keyExtractor}
              ListEmptyComponent={emptyList}
              ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: current.subtle }]} />}
              renderItem={({ item }) => (
                <Pressable
                  android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                  style={styles.coinRow}
                  onPress={() => {
                    setSelectedCoin(item);
                    setModalVisible(false);
                    setSearchText("");
                    setFilteredCoins(coins);
                    setGeminiSuggestion("");
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {item.image ? <Image source={{ uri: item.image }} style={styles.coinImg} /> : <View style={[styles.coinFallback, { backgroundColor: current.subtle }]}><Text style={[styles.coinFallbackText, { color: current.muted }]}>{item.symbol?.slice(0, 2).toUpperCase()}</Text></View>}
                    <View style={{ marginLeft: 12, maxWidth: 180 }}>
                      <Text style={[styles.coinName, { color: current.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.coinSym, { color: current.muted }]} numberOfLines={1}>
                        {item.symbol.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.coinPriceSmall, { color: current.muted }]}>${item.current_price.toLocaleString()}</Text>
                </Pressable>
              )}
              style={{ maxHeight: 420 }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  );
}

/* ---------------------------
   Styles (kept from your previous design)
   --------------------------- */
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
    marginHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  leftWrap: { width: 92, alignItems: "center", justifyContent: "center" },
  logoWrap: { width: 64, height: 64, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  logoImage: { width: 56, height: 56, borderRadius: 10 },
  fallbackLogo: { width: 56, height: 56, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  fallbackLogoText: { fontSize: 18, fontWeight: "800" },
  rankBadge: { marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  rankText: { fontSize: 12, fontWeight: "700" },
  contentWrap: { flex: 1, paddingLeft: 6 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  coinTitle: { fontSize: 16, fontWeight: "800" },
  coinPrice: { fontSize: 16, fontWeight: "900" },
  coinSubtitle: { fontSize: 12, marginTop: 4 },
  actionsRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 10 },
  helpButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.4 },
  helpBtnText: { fontWeight: "800", fontSize: 13 },
  selectBtn: { marginLeft: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  selectBtnText: { fontWeight: "800" },
  suggestionText: { marginTop: 12, fontSize: 13, lineHeight: 18 },
  hint: { marginTop: 12, fontSize: 12 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  modalCard: { width: "94%", borderRadius: 14, padding: 12, maxHeight: "86%" },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  searchInput: { flex: 1, padding: 12, borderRadius: 10, fontWeight: "600" },
  clearBtn: { marginLeft: 8 },
  sep: { height: 1, width: "100%" },
  coinRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 6 },
  coinImg: { width: 38, height: 38, borderRadius: 8 },
  coinFallback: { width: 38, height: 38, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  coinFallbackText: { fontWeight: "800" },
  coinName: { fontSize: 15, fontWeight: "800" },
  coinSym: { fontSize: 12, marginTop: 2 },
  coinPriceSmall: { fontSize: 13, fontWeight: "700" },
  emptyWrap: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14 },
});
