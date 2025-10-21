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
  const { theme } = useContext(ThemeContext);

  const [coins, setCoins] = useState<Coin[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<Coin[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const colors = {
    light: {
      background: "#fff",
      card: "#f5f9f8",
      text: "#111",
      accent: "#21bf73", // Groww green
      modalOverlay: "rgba(0,0,0,0.2)",
      inputBg: "#e8f0ef",
    },
    dark: {
      background: "#121212",
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
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={current.accent} />
      </View>
    );
  }

  return (
    <View style={[style.cont, { backgroundColor: current.card }]}>
      {/* Logo */}
      <View style={[style.logoContainer, { borderColor: current.accent }]}>
        {selectedCoin?.image && (
          <Image source={{ uri: selectedCoin.image }} style={style.logo} />
        )}
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

        <Text style={[style.label, { color: current.text }]}>Current Price</Text>
        <Text style={[style.price, { color: current.accent }]}>
          ${selectedCoin?.current_price?.toLocaleString() ?? "-"}
        </Text>
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
                  style={style.modalItem}
                  onPress={() => {
                    setSelectedCoin(item);
                    setModalVisible(false);
                    setSearchText("");
                    setFilteredCoins(coins);
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
    </View>
  );
}

const style = StyleSheet.create({
  cont: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  logo: { width: 50, height: 50 },
  details: { flex: 1, marginLeft: 16 },
  label: { fontSize: 12, fontWeight: "500", marginBottom: 4 },
  price: { fontSize: 18, fontWeight: "bold", marginTop: 4 },
  dropdown: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  dropdownText: { fontSize: 14, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 320,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  searchInput: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    fontWeight: "500",
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  modalItemText: { fontSize: 16 },
  coinLogo: { width: 28, height: 28, marginRight: 10 },
});
