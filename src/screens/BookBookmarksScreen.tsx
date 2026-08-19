import { useState, useCallback } from "react";
import { FlatList, TouchableOpacity, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getBookmarksForBook, removeBookmark, Bookmark } from "../api/bookmark";
import { useDatabase } from "../context/DatabaseContext";

export default function BookBookmarksScreen({ route, navigation }: any) {
  const db = useDatabase();
  const { bookId } = route.params;
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useFocusEffect(
    useCallback(() => {
      getBookmarksForBook(db, bookId).then(setBookmarks);
    }, [db, bookId]),
  );

  const handleDelete = async (divisionId: number) => {
    await removeBookmark(db, divisionId);
    setBookmarks((prev) => prev.filter((b) => b.division_id !== divisionId));
  };

  if (bookmarks.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#8B0000", fontSize: 16 }}>No bookmarks in this book yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={bookmarks}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 16,
            borderBottomWidth: 1,
            borderColor: "#eee",
          }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() =>
              navigation.navigate("Verse", {
                divisionId: item.division_id,
                divisionName: item.division_name,
              })
            }
          >
            <Text style={{ fontSize: 16, color: "#8B0000", fontWeight: "600" }}>
              {item.division_name}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDelete(item.division_id)}
            style={{ padding: 8, marginLeft: 8 }}
          >
            <Text style={{ fontSize: 18, color: "#8B0000", fontWeight: "700" }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}