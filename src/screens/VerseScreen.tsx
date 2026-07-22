import { useEffect, useState, useRef, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

import { useDatabase } from "../context/DatabaseContext";
import { Verse, Division } from "../types";
import { getSiblingDivisions } from "../api/division";
import { isBookmarked, addBookmark, removeBookmark } from "../api/bookmark";
import AdvancedSelector, { DisplaySettings } from "../components/AdvancedSelector";

interface SynonymEntry {
  word: string;
  meaning: string;
}

interface ParsedVerse {
  title: string;
  sanskrit: string;
  synonyms: SynonymEntry[];
  translation: string;
  purport: string;
}

function stripDuplicateTrailingHeader(sanskrit: string): string {
  const words = sanskrit.trim().split(/\s+/);
  if (words.length < 4) return sanskrit;

  const normalize = (w: string) => {
    let s = w
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .toLowerCase();
    s = s.replace(/h$/, "");
    return s;
  };

  for (let len = Math.min(3, Math.floor(words.length / 2)); len >= 1; len--) {
    const head = words.slice(0, len).map(normalize).join("");
    const tail = words.slice(words.length - len).map(normalize).join("");
    if (head && head === tail) {
      return words.slice(0, words.length - len).join(" ").trim();
    }
  }
  return sanskrit;
}

function parseContent(raw: string, verseTitle: string): ParsedVerse {
  let text = raw.trim();

  if (verseTitle && text.startsWith(verseTitle)) {
    text = text.slice(verseTitle.length).trim();
  } else {
    const autoTitle = text.match(
      /^[A-Za-z\-ĀīūṛṇśṣṭḍṇḥÀ-ÿ ,]+(?:Chapter \d+)?(?:Verse [\d–-]+)?\s+/,
    );
    if (autoTitle) text = text.slice(autoTitle[0].length).trim();
  }

  const firstDash = text.indexOf(" — ");
  if (firstDash === -1) {
    return {
      title: verseTitle,
      sanskrit: stripDuplicateTrailingHeader(text),
      synonyms: [],
      translation: "",
      purport: "",
    };
  }

  const sanskrit = stripDuplicateTrailingHeader(text.slice(0, firstDash).trim());
  const fromSynonyms = text.slice(firstDash);
  const synonymEndRegex = /\s\.\s([A-ZĀĪŪṚŚṢṬḌṆ])/g;
  let synonymEndIdx = -1;
  let match;
  const firstSemicolon = fromSynonyms.indexOf(" ;");
  if (firstSemicolon !== -1) {
    synonymEndRegex.lastIndex = firstSemicolon;
    match = synonymEndRegex.exec(fromSynonyms);
    if (match) {
      synonymEndIdx = match.index + match[0].length - 1;
    }
  }

  let synonymRaw = "";
  let afterSynonyms = "";

  if (synonymEndIdx !== -1) {
    synonymRaw = fromSynonyms.slice(0, synonymEndIdx).trim();
    afterSynonyms = fromSynonyms.slice(synonymEndIdx).trim();
  } else {
    synonymRaw = fromSynonyms;
    afterSynonyms = "";
  }

  const synonyms = parseSynonyms(synonymRaw);

  let translation = "";
  let purport = "";

  const questionIdx = afterSynonyms.indexOf("?");
  if (questionIdx !== -1) {
    translation = afterSynonyms.slice(0, questionIdx + 1).trim();
    purport = afterSynonyms.slice(questionIdx + 1).trim();
  } else {
    const sentenceMatches = afterSynonyms.match(/[^.!?]+[.!?]+/g);
    if (sentenceMatches && sentenceMatches.length > 1) {
      translation = sentenceMatches.slice(0, 2).join(" ").trim();
      purport = afterSynonyms.slice(translation.length).trim();
    } else {
      translation = afterSynonyms;
    }
  }

  return { title: verseTitle, sanskrit, synonyms, translation, purport };
}

function parseSynonyms(raw: string): SynonymEntry[] {
  if (!raw) return [];
  const pairs = raw.split(/\s*;\s*/);
  const entries: SynonymEntry[] = [];
  for (const pair of pairs) {
    const dashIdx = pair.indexOf(" — ");
    if (dashIdx === -1) continue;
    const word = pair.slice(0, dashIdx).trim();
    const meaning = pair.slice(dashIdx + 3).trim().replace(/\.\s*$/, "");
    if (word && meaning && word.length < 60) {
      entries.push({ word, meaning });
    }
  }
  return entries;
}

function VerseTitle({
  title,
  settings,
  onToggle,
}: {
  title: string;
  settings: DisplaySettings;
  onToggle: (key: keyof DisplaySettings) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: "#f5e6c8",
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#e8d9b5",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: "#8B0000",
          letterSpacing: 1.2,
          textTransform: "uppercase",
          flex: 1,
          marginRight: 8,
        }}
      >
        {title}
      </Text>
      <AdvancedSelector settings={settings} onToggle={onToggle} />
    </View>
  );
}

function SanskritBlock({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += 5) {
    lines.push(words.slice(i, i + 5).join(" "));
  }

  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: "#8B0000",
        paddingLeft: 16,
        paddingVertical: 10,
        marginBottom: 8,
      }}
    >
      {lines.map((line, i) => (
        <Text
          key={i}
          style={{
            fontStyle: "italic",
            fontWeight: "bold",
            fontSize: 16,
            color: "#1a1a1a",
            textAlign: "center",
            lineHeight: 30,
          }}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <View
      style={{
        marginTop: 28,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#e8d9b5",
        paddingBottom: 6,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: "#8B0000",
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SynonymsBlock({ entries }: { entries: SynonymEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <View>
      <SectionLabel label="Synonyms" />
      <Text style={{ fontSize: 15, lineHeight: 30, color: "#1a1a1a" }}>
        {entries.map((entry, i) => (
          <Text key={i}>
            <Text style={{ color: "#8B0000", fontStyle: "italic", fontWeight: "600" }}>
              {entry.word}
            </Text>
            <Text style={{ color: "#666" }}>{" — "}</Text>
            <Text style={{ color: "#1a1a1a" }}>{entry.meaning}</Text>
            {i < entries.length - 1 ? (
              <Text style={{ color: "#888" }}>{" ; "}</Text>
            ) : (
              <Text style={{ color: "#1a1a1a" }}>{"."}</Text>
            )}
          </Text>
        ))}
      </Text>
    </View>
  );
}

function TranslationBlock({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View>
      <SectionLabel label="Translation" />
      <Text
        style={{
          fontSize: 16,
          lineHeight: 28,
          color: "#1a1a1a",
          fontStyle: "italic",
          fontWeight: "bold",
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function PurportBlock({ text }: { text: string }) {
  if (!text) return null;
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  const paragraphs: string[] = [];
  const perPara = 4;
  for (let i = 0; i < sentences.length; i += perPara) {
    paragraphs.push(sentences.slice(i, i + perPara).join("").trim());
  }
  return (
    <View>
      <SectionLabel label="Purport" />
      {paragraphs.map((para, i) => (
        <Text
          key={i}
          style={{
            fontSize: 15,
            lineHeight: 27,
            color: "#1a1a1a",
            marginBottom: 16,
            textAlign: "justify",
          }}
        >
          {para}
        </Text>
      ))}
    </View>
  );
}

export default function VerseScreen({ route, navigation }: any) {
  const db = useDatabase();
  const { divisionId, divisionName } = route.params;
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [siblings, setSiblings] = useState<Division[]>([]);
  const [settings, setSettings] = useState<DisplaySettings>({
    mantra: true,
    synonyms: true,
    translation: true,
    purport: true,
  });
  const touchStart = useRef({ x: 0, y: 0 });

  const toggleSetting = (key: keyof DisplaySettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    setLoading(true);
    db.getFirstAsync<Verse>(
      `SELECT * FROM verse WHERE division_id = ? LIMIT 1`,
      [divisionId],
    )
      .then(setVerse)
      .finally(() => setLoading(false));

    isBookmarked(db, divisionId).then(setBookmarked);
    getSiblingDivisions(db, divisionId).then(setSiblings);
  }, [divisionId]);

  const toggleBookmark = useCallback(async () => {
    if (bookmarked) {
      await removeBookmark(db, divisionId);
      setBookmarked(false);
    } else {
      await addBookmark(db, divisionId, divisionName);
      setBookmarked(true);
    }
  }, [bookmarked, divisionId, divisionName]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Notes", { divisionId, divisionName })}
            style={{ marginRight: 12 }}
          >
            <Text style={{ color: "#fff", fontSize: 20 }}>📝</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleBookmark} style={{ marginRight: 12 }}>
            <Text style={{ color: "#fff", fontSize: 22 }}>{bookmarked ? "★" : "☆"}</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [bookmarked, toggleBookmark, divisionId, divisionName]);

  const currentIndex = siblings.findIndex((s) => s.id === divisionId);
  const prevDivision = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextDivision =
    currentIndex !== -1 && currentIndex < siblings.length - 1
      ? siblings[currentIndex + 1]
      : null;

  const handleTouchStart = (e: any) => {
    touchStart.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
    };
  };

  const handleTouchEnd = (e: any) => {
    const dx = e.nativeEvent.pageX - touchStart.current.x;
    const dy = e.nativeEvent.pageY - touchStart.current.y;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx < 0 && nextDivision) {
        navigation.replace("Verse", {
          divisionId: nextDivision.id,
          divisionName: nextDivision.name,
        });
      } else if (dx > 0 && prevDivision) {
        navigation.replace("Verse", {
          divisionId: prevDivision.id,
          divisionName: prevDivision.name,
        });
      }
    }
  };

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

  const parsed = parseContent(verse.content, verse.title ?? divisionName);

  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <ScrollView
        style={{ backgroundColor: "#fdf6e3" }}
        contentContainerStyle={{ paddingBottom: 52 }}
      >
        <VerseTitle title={parsed.title} settings={settings} onToggle={toggleSetting} />
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          {settings.mantra && parsed.sanskrit ? <SanskritBlock text={parsed.sanskrit} /> : null}
          {settings.synonyms ? <SynonymsBlock entries={parsed.synonyms} /> : null}
          {settings.translation ? <TranslationBlock text={parsed.translation} /> : null}
          {settings.purport ? <PurportBlock text={parsed.purport} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}