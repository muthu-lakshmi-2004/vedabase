import { useEffect, useState } from "react";
import {
  FlatList,
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
} from "react-native";

import { getVerseListByDivision } from "../api/division";
import { useDatabase } from "../context/DatabaseContext";
import { Division } from "../types";

function stripRepeatedHeaders(content: string): string {
  let text = content;
  const headerPattern = /^[A-ZĀ-Ż]{1,10}\s?(?:[A-Za-zĀ-ṣ]+\s)?[\d][\dA-Za-zĀ-ṣ.\-–]*\s*:\s*[^:]{0,150}?:\s*/;  let guard = 0;
  while (headerPattern.test(text) && guard < 10) {
    const before = text;
    text = text.replace(headerPattern, "");
    if (text === before) break;
    guard++;
  }
  return text.trim();
}

function stripTitlePrefix(content: string): string {
  const match = content.match(/^.{0,140}?(?:Verses?|Text)\s+[\dA-Za-zĀ-ṣ\-–]+\s+/);
  let stripped = match ? content.slice(match[0].length) : content;
  stripped = stripRepeatedHeaders(stripped);
  return stripped;
}

function getFirstSentence(content: string): string {
  const cleaned = stripTitlePrefix(content).replace(/^[\s.:]+/, "").trim();
  const lines = cleaned.split(/\n/);
  for (const line of lines) {
    const trimmed = line.replace(/^[\s.:]+/, "").trim();
    if (trimmed.length > 15 && /[A-Za-z]/.test(trimmed[0])) {
      return trimmed.length > 100 ? trimmed.substring(0, 100) + "..." : trimmed;
    }
  }
  return cleaned.substring(0, 100) + "...";
}

function getShortLabel(name: string): string {
  const match = name.match(/(\d+(?:-\d+)?)\s*$/);
  if (match) return `Verse ${match[1]}`;
  if (/summary/i.test(name)) return "Summary";
  return name;
}

function getVerseNumber(name: string): string {
  const match = name.match(/(\d+(?:-\d+)?)\s*$/);
  return match ? match[1] : name;
}

export default function VerseListScreen({ route, navigation }: any) {
  const db = useDatabase();
  const { divisionId, bookName, chapterNumber } = route.params;
  const [verses, setVerses] = useState<Division[]>([]);
  const [verseContents, setVerseContents] = useState<Record<number, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVerseListByDivision(db, divisionId)
      .then(async (divs) => {
        setVerses(divs);
        const contents: Record<number, string> = {};
        for (const d of divs) {
          const v = await db.getFirstAsync<{ content: string }>(
            `SELECT content FROM verse WHERE division_id = ? LIMIT 1`,
            [d.id],
          );
          if (v) contents[d.id] = getFirstSentence(v.content);
        }
        setVerseContents(contents);
      })
      .finally(() => setLoading(false));
  }, [divisionId]);

  const handlePress = async (item: Division) => {
    const children = await getVerseListByDivision(db, item.id);
    if (children.length > 0) {
      navigation.push("VerseList", {
        divisionId: item.id,
        divisionName: item.name,
        bookName,
        chapterNumber,
      });
    } else {
      navigation.navigate("Verse", {
        divisionId: item.id,
        divisionName: getShortLabel(item.name),
        bookName,
        chapterNumber,
        verseNumber: getVerseNumber(item.name),
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
      data={verses}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ paddingVertical: 8, backgroundColor: "#fdf6e3" }}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => handlePress(item)}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderColor: "#e8d9b5",
            backgroundColor: "#fdf6e3",
          }}
        >
          <Text
            style={{
              color: "#8B0000",
              fontWeight: "bold",
              fontSize: 15,
              marginBottom: 4,
            }}
          >
            {getShortLabel(item.name)}
          </Text>
          <Text style={{ fontSize: 15, color: "#1a1a1a", lineHeight: 22 }}>
            {verseContents[item.id] || "Loading..."}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}