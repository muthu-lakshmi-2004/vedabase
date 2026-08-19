import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { openDatabase } from "./src/database/db";
import { SQLiteDatabase } from "expo-sqlite";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { DatabaseProvider } from "./src/context/DatabaseContext";
import { DisplaySettingsProvider } from "./src/context/DisplaySettingsContext";
import BookListScreen from "./src/screens/BookListScreen";
import BookIndexScreen from "./src/screens/Bookindexscreen";
import VerseListScreen from "./src/screens/VerseListScreen";
import VerseScreen from "./src/screens/VerseScreen";
import BookBookmarksScreen from "./src/screens/BookBookmarksScreen";
import NotesScreen from "./src/screens/NotesScreen";

export type RootStackParamList = {
  BookList: undefined;
  BookIndex: { bookId: number; bookName: string };
  Division: { bookId: number };
  VerseList: {
    divisionId: number;
    divisionName: string;
    bookName?: string;
    chapterNumber?: string;
  };
  Verse: {
    divisionId: number;
    divisionName: string;
    bookName?: string;
    chapterNumber?: string;
    verseNumber?: string;
  };
  Notes: { divisionId: number; divisionName: string };
  BookBookmarks: { bookId: number; bookName: string };
};

const RootStackNav = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    openDatabase()
      .then(setDb)
      .catch((err) => {
        console.error("DB open failed:", err);
        setError(err?.message ?? String(err));
      });
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "red", fontWeight: "bold", marginBottom: 10 }}>DB Error:</Text>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );
  }

  if (!db) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <DatabaseProvider value={db}>
      <DisplaySettingsProvider>
        <NavigationContainer>
          <RootStackNav.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: "#8B0000" },
              headerTintColor: "#fff",
            }}
          >
            <RootStackNav.Screen
              name="BookList"
              component={BookListScreen}
              options={{ title: "Vedabase" }}
            />
            <RootStackNav.Screen
              name="BookIndex"
              component={BookIndexScreen}
              options={({ route, navigation }: any) => ({
                title: route.params.bookName,
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("BookBookmarks", {
                        bookId: route.params.bookId,
                        bookName: route.params.bookName,
                      })
                    }
                  >
                    <Text style={{ color: "#fff", fontSize: 20 }}>★</Text>
                  </TouchableOpacity>
                ),
              })}
            />
            <RootStackNav.Screen
              name="VerseList"
              component={VerseListScreen}
              options={({ route }: any) => ({ title: route.params.divisionName })}
            />
            <RootStackNav.Screen
              name="Verse"
              component={VerseScreen}
              options={({ route }: any) => {
                const { bookName, chapterNumber, verseNumber, divisionName } = route.params;
                let title = bookName ?? divisionName;
                if (bookName && chapterNumber && verseNumber) {
                  title = `${bookName} ${chapterNumber}.${verseNumber}`;
                } else if (bookName && verseNumber) {
                  title = `${bookName} ${verseNumber}`;
                } else if (bookName && chapterNumber) {
                  title = `${bookName} ${chapterNumber}`;
                } else if (bookName) {
                  title = `${bookName} — ${divisionName}`;
                }
                return { title };
              }}
            />
            <RootStackNav.Screen
              name="Notes"
              component={NotesScreen}
              options={{ title: "Notes" }}
            />
            <RootStackNav.Screen
              name="BookBookmarks"
              component={BookBookmarksScreen}
              options={({ route }: any) => ({ title: `${route.params.bookName} Bookmarks` })}
            />
          </RootStackNav.Navigator>
        </NavigationContainer>
      </DisplaySettingsProvider>
    </DatabaseProvider>
  );
}