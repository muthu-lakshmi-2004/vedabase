import { useEffect, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useDatabase } from "../context/DatabaseContext";
import { Verse } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Verse">;

export default function VerseScreen({ route }: Props) {
  const db = useDatabase();
  const { divisionId, divisionName } = route.params;
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getFirstAsync<Verse>(
      `SELECT * FROM verse WHERE division_id = ? LIMIT 1`,
      [divisionId],
    )
      .then(setVerse)
      .finally(() => setLoading(false));
  }, [divisionId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  if (!verse) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#8B0000" }}>Content not found</Text>
      </View>
    );
  }

  const parts = verse.content.split(/(?=TEXT \d+:)/);

  return (
    <ScrollView style={{ backgroundColor: "#fdf6e3" }}>
      {/* Chapter Title */}
      <View
        style={{
          backgroundColor: "#f5e6c8",
          paddingHorizontal: 20,
          paddingVertical: 30,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: "#1a1a1a",
            textAlign: "center",
            lineHeight: 32,
          }}
        >
          {divisionName}
        </Text>
      </View>

      {/* Content */}
      <View style={{ padding: 20 }}>
        {parts.length > 1 ? (
          parts.map((part, index) => {
            const match = part.match(/^(TEXT \d+:)\s*([\s\S]*)/);
            if (!match) return null;
            return (
              <View key={index} style={{ marginBottom: 20 }}>
                <Text
                  style={{ color: "#8B0000", fontWeight: "bold", fontSize: 15 }}
                >
                  {match[1]}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    lineHeight: 26,
                    color: "#1a1a1a",
                    marginTop: 4,
                  }}
                >
                  {match[2].trim()}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={{ fontSize: 16, lineHeight: 26, color: "#1a1a1a" }}>
            {verse.content}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
