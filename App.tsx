import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { openDatabase } from "./src/database/db";
import { SQLiteDatabase } from "expo-sqlite";
import { View, ActivityIndicator, Text } from "react-native";
import { DatabaseProvider } from "./src/context/DatabaseContext";
import { DisplaySettingsProvider } from "./src/context/DisplaySettingsContext";
import BookListScreen from "./src/screens/BookListScreen";
import BookIndexScreen from "./src/screens/Bookindexscreen";
import VerseListScreen from "./src/screens/VerseListScreen";
import VerseScreen from "./src/screens/VerseScreen";
import BookmarksScreen from "./src/screens/BookmarksScreen";
import NotesScreen from "./src/screens/NotesScreen";

const BooksStackNav = createNativeStackNavigator();
const SavedStackNav = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function BooksStack() {
  return (
    <BooksStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#8B0000" },
        headerTintColor: "#fff",
      }}
    >
      <BooksStackNav.Screen name="BookList" component={BookListScreen} options={{ title: "Vedabase" }} />
      <BooksStackNav.Screen name="BookIndex" component={BookIndexScreen} options={({ route }: any) => ({ title: route.params.bookName })} />
      <BooksStackNav.Screen name="VerseList" component={VerseListScreen} options={({ route }: any) => ({ title: route.params.divisionName })} />
      <BooksStackNav.Screen name="Verse" component={VerseScreen} options={({ route }: any) => ({ title: route.params.divisionName })} />
      <BooksStackNav.Screen name="Notes" component={NotesScreen} options={{ title: "Notes" }} />
    </BooksStackNav.Navigator>
  );
}

function SavedStack() {
  return (
    <SavedStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#8B0000" },
        headerTintColor: "#fff",
      }}
    >
      <SavedStackNav.Screen name="Bookmarks" component={BookmarksScreen} options={{ title: "Saved" }} />
      <SavedStackNav.Screen name="Verse" component={VerseScreen} options={({ route }: any) => ({ title: route.params.divisionName })} />
      <SavedStackNav.Screen name="Notes" component={NotesScreen} options={{ title: "Notes" }} />
    </SavedStackNav.Navigator>
  );
}

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
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: "#8B0000",
            }}
          >
            <Tab.Screen
              name="VedabaseTab"
              component={BooksStack}
              options={{
                title: "Vedabase",
                tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>📚</Text>,
              }}
            />
            <Tab.Screen
              name="SavedTab"
              component={SavedStack}
              options={{
                title: "Saved",
                tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>★</Text>,
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </DisplaySettingsProvider>
    </DatabaseProvider>
  );
}