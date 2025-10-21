import React from "react";
import { View, Text,Switch ,Image} from "react-native";
import { StyleSheet } from "react-native";
import { ThemeContext } from "@/app/_layout";
export default function TopNavBar() {
    const { theme, toggleTheme } = React.useContext(ThemeContext);
    return (
        <View style={style.cont}>
            <Image source={require('@/assets/logo/logo.png')} style={{ width: 50, height: 50 }} />
            <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                thumbColor={theme === 'dark' ? '#fff' : '#000'}
            />
        </View>
    )
}

const style = StyleSheet.create({
    cont: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal:'auto'

    },
    textCont: {
        color: 'white'
    }
})
