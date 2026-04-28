import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { openDatabase } from "./src/database/db";
import { SQLiteDatabase } from "expo-sqlite";
import { View, ActivityIndicator } from "react-native";
import { DatabaseProvider } from "./src/context/DatabaseContext";
import BookListScreen from "./src/screens/BookListScreen";
import DivisionScreen from "./src/screens/DivisionScreen";
import VerseScreen from "./src/screens/VerseScreen";

export type RootStackParamList = {
  BookList: undefined;
  Division: { bookId: number; bookName: string };
  Verse: { divisionId: number; divisionName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  useEffect(() => {
    openDatabase().then(setDb).catch(console.error);
  }, []);

  if (!db) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <DatabaseProvider value={db}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: "#8B0000" },
            headerTintColor: "#fff",
          }}
        >
          <Stack.Screen
            name="BookList"
            component={BookListScreen}
            options={{ title: "Vedabase" }}
          />
          <Stack.Screen
            name="Division"
            component={DivisionScreen}
            options={({ route }) => ({ title: route.params.bookName })}
          />
          <Stack.Screen
            name="Verse"
            component={VerseScreen}
            options={({ route }) => ({ title: route.params.divisionName })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </DatabaseProvider>
  );
}
