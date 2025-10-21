import { View,Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { Button } from "@react-navigation/elements";
import TopNavBar from "../navbar/topnav";
import Card from "../card/coin-card";
import { useState } from "react";


export default function Home() {
   
    return(
        <SafeAreaView>
            <TopNavBar/>
            <Card />
        </SafeAreaView>
    )
}
