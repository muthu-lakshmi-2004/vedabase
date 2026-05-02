import { useEffect, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useDatabase } from "../context/DatabaseContext";
import { Verse } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Verse">;

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


function parseContent(raw: string, verseTitle: string): ParsedVerse {
  let text = raw.trim();


  if (verseTitle && text.startsWith(verseTitle)) {
    text = text.slice(verseTitle.length).trim();
  } else {
    const autoTitle = text.match(
      /^[A-Za-z\-āīūṛṝḷśṣṭḍṇṁḥÀ-ÿ ,]+(?:Chapter \d+)?(?:Verse [\d–-]+)?\s+/,
    );
    if (autoTitle) text = text.slice(autoTitle[0].length).trim();
  }


  const firstDash = text.indexOf(" — ");
  if (firstDash === -1) {
    return {
      title: verseTitle,
      sanskrit: text,
      synonyms: [],
      translation: "",
      purport: "",
    };
  }

  const sanskrit = text.slice(0, firstDash).trim();
  const fromSynonyms = text.slice(firstDash); // starts with " — ..."
  const synonymEndRegex = /\s\.\s([A-ZĀĪŪṚŚṢṬḌṆ])/g;
  let synonymEndIdx = -1;
  let match;
  const firstSemicolon = fromSynonyms.indexOf(" ;");
  if (firstSemicolon !== -1) {
    synonymEndRegex.lastIndex = firstSemicolon;
    match = synonymEndRegex.exec(fromSynonyms);
    if (match) {
      synonymEndIdx = match.index + match[0].length - 1; // after ". "
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
    const meaning = pair
      .slice(dashIdx + 3)
      .trim()
      .replace(/\.\s*$/, ""); 

    if (word && meaning && word.length < 60) {
      entries.push({ word, meaning });
    }
  }

  return entries;
}


function VerseTitle({ title }: { title: string }) {
  return (
    <View
      style={{
        backgroundColor: "#f5e6c8",
        paddingHorizontal: 20,
        paddingVertical: 18,
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#e8d9b5",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: "#8B0000",
          textAlign: "center",
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function SanskritBlock({ text }: { text: string }) {
  // Group words into lines of ~5 words each for readability
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
            <Text
              style={{
                color: "#8B0000",
                fontStyle: "italic",
                fontWeight: "600",
              }}
            >
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
    paragraphs.push(
      sentences
        .slice(i, i + perPara)
        .join("")
        .trim(),
    );
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

  const parsed = parseContent(verse.content, verse.title ?? divisionName);

  return (
    <ScrollView
      style={{ backgroundColor: "#fdf6e3" }}
      contentContainerStyle={{ paddingBottom: 52 }}
    >
      <VerseTitle title={parsed.title} />

      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        {parsed.sanskrit ? <SanskritBlock text={parsed.sanskrit} /> : null}
        <SynonymsBlock entries={parsed.synonyms} />
        <TranslationBlock text={parsed.translation} />
        <PurportBlock text={parsed.purport} />
      </View>
    </ScrollView>
  );
}
