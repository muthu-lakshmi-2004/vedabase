import { useState, useCallback } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { searchVerses, SearchResult } from "../api/search";
import { useDatabase } from "../context/DatabaseContext";

export default function SearchScreen({ navigation }: any) {
  const db = useDatabase();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      if (text.trim().length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      const r = await searchVerses(db, text);
      setResults(r);
      setLoading(false);
      setSearched(true);
    },
    [db],
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fdf6e3" }}>
      <View
        style={{
          padding: 12,
          backgroundColor: "#f5e6c8",
          borderBottomWidth: 1,
          borderBottomColor: "#e8d9b5",
        }}
      >
        <TextInput
          value={query}
          onChangeText={runSearch}
          placeholder="Search verses, purports..."
          placeholderTextColor="#a8886a"
          autoFocus
          style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 16,
            color: "#1a1a1a",
          }}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#8B0000" />
        </View>
      ) : searched && results.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#8B0000", fontSize: 16 }}>No results found</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item.division_id}-${i}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Verse", {
                  divisionId: item.division_id,
                  divisionName: item.division_name,
                })
              }
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderColor: "#e8d9b5",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#8B0000",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {item.book_name} — {item.division_name}
              </Text>
              <Text style={{ fontSize: 14, color: "#1a1a1a", lineHeight: 20 }}>
                {item.snippet}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}