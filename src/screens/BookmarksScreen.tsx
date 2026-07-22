import { useState, useCallback } from "react";
import { FlatList, TouchableOpacity, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getAllBookmarks, Bookmark } from "../api/bookmark";
import { useDatabase } from "../context/DatabaseContext";


export default function BookmarksScreen({ navigation }: any) {
  const db = useDatabase();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllBookmarks(db).then(setBookmarks);
    }, [db]),
  );

  if (bookmarks.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#8B0000", fontSize: 16 }}>No bookmarks yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={bookmarks}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("Verse", {
              divisionId: item.division_id,
              divisionName: item.division_name,
            })
          }
          style={{ padding: 16, borderBottomWidth: 1, borderColor: "#eee" }}
        >
          <Text style={{ fontSize: 16, color: "#8B0000", fontWeight: "600" }}>
            {item.division_name}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}