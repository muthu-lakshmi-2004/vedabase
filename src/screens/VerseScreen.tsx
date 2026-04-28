import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { getVersesByDivision } from "../api/verse";
import { useDatabase } from "../context/DatabaseContext";
import { Verse } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Verse">;

export default function VerseScreen({ route }: Props) {
  const db = useDatabase();
  const { divisionId } = route.params;
  const [verses, setVerses] = useState<Verse[]>([]);

  useEffect(() => {
    getVersesByDivision(db, divisionId).then(setVerses);
  }, []);

  return (
    <FlatList
      data={verses}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <View
          style={{ padding: 15, borderBottomWidth: 1, borderColor: "#eee" }}
        >
          {item.title && (
            <Text
              style={{ fontWeight: "bold", color: "#8B0000", marginBottom: 5 }}
            >
              {item.title}
            </Text>
          )}
          <Text style={{ fontSize: 15, lineHeight: 22 }}>{item.content}</Text>
        </View>
      )}
    />
  );
}
