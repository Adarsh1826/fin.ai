import React, { useEffect, useState, useContext } from "react";
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
} from "react-native";
import { ThemeContext } from "@/app/_layout";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  image: string;
}

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

  const fadeAnim = useState(new Animated.Value(1))[0];

  const colors = {
    light: {
      card: "#f5f9f8",
      text: "#111",
      accent: "#21bf73",
      modalOverlay: "rgba(0,0,0,0.2)",
      inputBg: "#e8f0ef",
    },
    dark: {
      card: "#1c1c1c",
      text: "#fff",
      accent: "#21bf73",
      modalOverlay: "rgba(0,0,0,0.6)",
      inputBg: "#222",
    },
  };
  const current = colors[theme];

  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false"
    )
      .then((res) => res.json())
      .then((data) => {
        setCoins(data);
        setFilteredCoins(data);
        setSelectedCoin(data[0]);
      })
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);
    const filtered = coins.filter(
      (coin) =>
        coin.symbol.toLowerCase().includes(text.toLowerCase()) ||
        coin.name.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredCoins(filtered);
    setGeminiSuggestion("");
  };

  const handleNeedHelp = async () => {
    if (!selectedCoin) return;

    setGeminiLoading(true);
    setGeminiSuggestion(null);

    Animated.timing(fadeAnim, { toValue: 0.3, duration: 300, useNativeDriver: true }).start();

    try {
      const promptText = `
You are an educational AI assistant. Your task is to provide a concise cryptocurrency recommendation
for educational purposes ONLY.

The current price of ${selectedCoin.symbol.toUpperCase()} is $${selectedCoin.current_price.toLocaleString()} USD.

Analyze this price and provide:

1. An approximate price range or price point for **entering** the market, relative to the current price.
2. An approximate price range or price point for **exiting** the market, relative to the current price.

Answer in **exact numbers** where possible, or ranges if precise numbers aren't available.
Provide your response in this format:

Enter: <price or range in USD>
Exit: <price or range in USD>

Keep it short, 2-3 sentences max, purely for educational purposes, and do NOT give financial advice.
`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: promptText }],
              },
            ],
          }),
        }
      );

      const data = await res.json();
      const suggestion = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No suggestion returned";

      setGeminiSuggestion(suggestion);
    } catch (err) {
      console.error(err);
      setGeminiSuggestion("Error fetching suggestion from Gemini");
    } finally {
      setGeminiLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={current.accent} />
      </View>
    );
  }

  return (
    <Animated.View style={[style.cont, { backgroundColor: current.card, opacity: fadeAnim }]}>
      {/* Logo */}
      <View style={[style.logoContainer, { borderColor: current.accent }]}>
        {selectedCoin?.image && <Image source={{ uri: selectedCoin.image }} style={style.logo} />}
      </View>

      {/* Details */}
      <View style={style.details}>
        <Text style={[style.label, { color: current.text }]}>Coin</Text>
        <TouchableOpacity
          style={[style.dropdown, { backgroundColor: current.inputBg, borderColor: current.accent }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[style.dropdownText, { color: current.accent }]}>
            {selectedCoin?.symbol.toUpperCase()}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[style.label, { color: current.text }]}>Current Price</Text>
          <TouchableOpacity style={[style.helpButton, { borderColor: current.accent }]} onPress={handleNeedHelp}>
            <Text style={[style.helpButtonText, { color: current.accent }]}>Need Help</Text>
          </TouchableOpacity>
        </View>

        <Text style={[style.price, { color: current.accent }]}>
          ${selectedCoin?.current_price?.toLocaleString() ?? "-"}
        </Text>

        {geminiLoading && <ActivityIndicator size="small" color={current.accent} />}
        {geminiSuggestion && (
          <Text style={[style.geminiText, { color: current.accent, marginTop: 10 }]}>{geminiSuggestion}</Text>
        )}
      </View>

      {/* Modal */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <TouchableOpacity
          style={[style.modalOverlay, { backgroundColor: current.modalOverlay }]}
          onPress={() => setModalVisible(false)}
        >
          <View style={[style.modalContent, { backgroundColor: current.card }]}>
            <TextInput
              style={[style.searchInput, { backgroundColor: current.inputBg, color: current.text }]}
              placeholder="Search coin..."
              placeholderTextColor={theme === "dark" ? "#aaa" : "#555"}
              value={searchText}
              onChangeText={handleSearch}
            />

            <FlatList
              data={filteredCoins}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[style.modalItem, { borderBottomColor: theme === "dark" ? "#555" : "#ccc" }]}
                  onPress={() => {
                    setSelectedCoin(item);
                    setModalVisible(false);
                    setSearchText("");
                    setFilteredCoins(coins);
                    setGeminiSuggestion("");
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image source={{ uri: item.image }} style={style.coinLogo} />
                    <Text style={[style.modalItemText, { color: current.text }]}>
                      {item.symbol.toUpperCase()} - ${item.current_price.toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  );
}

const style = StyleSheet.create({
  cont: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  logo: { width: 55, height: 55 },
  details: { flex: 1, marginLeft: 20 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  price: { fontSize: 20, fontWeight: "700", marginTop: 6 },
  dropdown: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  dropdownText: { fontSize: 15, fontWeight: "700" },
  helpButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  helpButtonText: {
    fontWeight: "700",
  },
  geminiText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  modalContent: {
    width: "90%",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  searchInput: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 14,
    fontWeight: "600",
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.7,
  },
  modalItemText: { fontSize: 16, fontWeight: "500" },
  coinLogo: { width: 32, height: 32, marginRight: 12 },
});
