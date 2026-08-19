import { useEffect, useState } from "react";
import {
  FlatList,
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
} from "react-native";

import { getDivisionsByBook, getVerseListByDivision } from "../api/division";
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

  useEffect(() => {
    getDivisionsByBook(db, bookId)
      .then(setDivisions)
      .finally(() => setLoading(false));
  }, [bookId]);

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
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
  );
}