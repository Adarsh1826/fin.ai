import { View,Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { Button } from "@react-navigation/elements";
import TopNavBar from "../navbar/topnav";
import Card from "../card/card";
import { useState } from "react";
const fakeCoins = [
  { symbol: "BTC", price: 27450, logo: "https://cryptologos.cc/logos/bitcoin-btc-logo.png" },
  { symbol: "ETH", price: 1830, logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png" },
  { symbol: "ADA", price: 0.42, logo: "https://cryptologos.cc/logos/cardano-ada-logo.png" },
  { symbol: "SOL", price: 22.7, logo: "https://cryptologos.cc/logos/solana-sol-logo.png" },
  { symbol: "XRP", price: 0.52, logo: "https://cryptologos.cc/logos/xrp-xrp-logo.png" },
  { symbol: "DOGE", price: 0.067, logo: "https://cryptologos.cc/logos/dogecoin-doge-logo.png" },
  { symbol: "LTC", price: 87.5, logo: "https://cryptologos.cc/logos/litecoin-ltc-logo.png" },
];

export default function Home() {
   
    return(
        <SafeAreaView>
            <TopNavBar/>
            <Card />
        </SafeAreaView>
    )
}
const style = StyleSheet.create({
    nav: {
        color: 'white',
    },
});
