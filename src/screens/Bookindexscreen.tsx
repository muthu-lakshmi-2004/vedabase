import { useEffect, useState } from "react";
import {
  FlatList,
  TouchableOpacity,
  Text,
  View,
  TextInput,
  ActivityIndicator,
} from "react-native";

import { getDivisionsByBook, getVerseListByDivision } from "../api/division";
import { searchWithinBook, BookSearchResult } from "../api/search";
import { useDatabase } from "../context/DatabaseContext";
import { Division } from "../types";

function extractNumber(name: string): string {
  const match = name.match(/(\d+(?:-\d+)?)/);
  return match ? match[1] : name;
}

export default function BookIndexScreen({ route, navigation }: any) {
  const db = useDatabase();
  const { bookId, bookName } = route.params;
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getDivisionsByBook(db, bookId)
      .then(setDivisions)
      .finally(() => setLoading(false));
  }, [bookId]);

  const runSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    const r = await searchWithinBook(db, bookId, text);
    setResults(r);
    setSearching(false);
  };

  const handlePress = async (item: Division) => {
    const children = await getVerseListByDivision(db, item.id);
    if (children.length > 0) {
      navigation.navigate("VerseList", {
        divisionId: item.id,
        divisionName: item.name,
        bookName,
        chapterNumber: extractNumber(item.name),
      });
    } else {
      navigation.navigate("Verse", {
        divisionId: item.id,
        divisionName: item.name,
        bookName,
        chapterNumber: "",
      });
    }
  };

  const goToSearchResult = (r: BookSearchResult) => {
    navigation.navigate("Verse", {
      divisionId: r.division_id,
      divisionName: r.division_name,
      bookName,
      highlightQuery: searchQuery.trim(),
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: "#f5e6c8",
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#e8d9b5",
        }}
      >
        {searchOpen ? (
          <TextInput
            value={searchQuery}
            onChangeText={runSearch}
            placeholder={`Search in ${bookName}...`}
            placeholderTextColor="#a8886a"
            autoFocus
            style={{
              flex: 1,
              backgroundColor: "#fff",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              fontSize: 14,
              color: "#1a1a1a",
              marginRight: 10,
            }}
          />
        ) : (
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: "700",
              color: "#8B0000",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {bookName}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => {
            setSearchOpen((o) => !o);
            setSearchQuery("");
            setResults([]);
          }}
        >
          <Text style={{ fontSize: 18 }}>🔍</Text>
        </TouchableOpacity>
      </View>

      {searchOpen ? (
        searching ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#8B0000" />
          </View>
        ) : searchQuery.trim().length >= 3 && results.length === 0 ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: "#8B0000" }}>No results found</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, i) => `${item.division_id}-${i}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => goToSearchResult(item)}
                style={{
                  padding: 14,
                  borderBottomWidth: 1,
                  borderColor: "#e8d9b5",
                  backgroundColor: "#fdf6e3",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#8B0000",
                    marginBottom: 4,
                  }}
                >
                  {item.breadcrumb}
                </Text>
                <Text style={{ fontSize: 14, color: "#1a1a1a", lineHeight: 20 }}>
                  {item.snippet}
                </Text>
              </TouchableOpacity>
            )}
          />
        )
      ) : (
        <FlatList
          data={divisions}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handlePress(item)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: "#eee",
              }}
            >
              <Text style={{ fontSize: 16, color: "#8B0000", lineHeight: 24 }}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}