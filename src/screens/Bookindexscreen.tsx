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

export default function BookIndexScreen({ route, navigation }: any) {
  const db = useDatabase();
  const { bookId } = route.params;
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDivisionsByBook(db, bookId)
      .then(setDivisions)
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  const handlePress = async (item: Division) => {
    const children = await getVerseListByDivision(db, item.id);
    if (children.length > 0) {
      navigation.navigate("VerseList", {
        divisionId: item.id,
        divisionName: item.name,
      });
    } else {
      navigation.navigate("Verse", {
        divisionId: item.id,
        divisionName: item.name,
      });
    }
  };

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