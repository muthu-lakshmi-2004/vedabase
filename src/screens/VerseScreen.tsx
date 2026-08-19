import { useEffect, useState, useRef, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

import { useDatabase } from "../context/DatabaseContext";
import { useDisplaySettings } from "../context/DisplaySettingsContext";
import { Verse, Division } from "../types";
import { getSiblingDivisions } from "../api/division";
import { isBookmarked, addBookmark, removeBookmark } from "../api/bookmark";
import AdvancedSelector from "../components/AdvancedSelector";

interface SynonymEntry {
  word: string;
  meaning: string;
}

interface UniversalBlock {
  type: "sanskrit" | "prose";
  text: string;
  isVerseTranslation: boolean;
}

interface ParsedVerse {
  title: string;
  sanskrit: string;
  synonyms: SynonymEntry[];
  translation: string;
  purport: string;
  universalBlocks?: UniversalBlock[];
}

type RegisterRef = (text: string, ref: View | null) => void;

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

const SANSKRIT_DIACRITIC = /[āīūṛṝḷḹṃḥñṅṭḍṇśṣĀĪŪṚṜḶḸṂḤÑṄṬḌṆŚṢ]/;

const ENGLISH_STOPWORDS = new Set([
  "a", "an", "the", "of", "to", "in", "on", "at", "by", "for", "with", "and",
  "or", "but", "is", "was", "were", "are", "be", "been", "being", "he", "she",
  "it", "his", "her", "its", "who", "whom", "which", "that", "this", "these",
  "those", "from", "as", "when", "while", "after", "before", "if", "because",
  "so", "then", "than", "not", "no", "nor", "do", "did", "does", "has",
  "have", "had", "will", "would", "can", "could", "should", "may", "might",
  "must", "i", "we", "you", "they", "them", "their", "our", "your", "my",
  "me", "him", "us", "one", "two", "three", "some", "any", "each", "every",
  "other", "such", "very", "also", "just", "only", "more", "most", "much",
  "many", "there", "here", "how", "what", "why", "said", "says", "say",
  "went", "came", "saw", "took", "gave", "made", "began", "became",
]);

function tokenClass(token: string): "sanskrit" | "english" | "ambiguous" {
  const clean = token.replace(/^[^a-zA-Z\u0080-\uFFFF']+|[.,!?;:"]+$/g, "");
  if (!clean) return "ambiguous";
  const lower = clean.toLowerCase();
  if (ENGLISH_STOPWORDS.has(lower)) return "english";
  const hasDiacritic = SANSKRIT_DIACRITIC.test(clean);
  const isHyphenLower = clean.includes("-") && clean === clean.toLowerCase();
  if (hasDiacritic || isHyphenLower) return "sanskrit";
  return "ambiguous";
}

function parseUniversal(raw: string): UniversalBlock[] {
  const tokens = raw.trim().split(/\s+/);
  const classes = tokens.map(tokenClass);
  const rawBlocks: { type: "sanskrit" | "prose"; text: string }[] = [];

  let mode: "prose" | "sanskrit" = "prose";
  let buf: string[] = [];

  const flush = (type: "sanskrit" | "prose") => {
    if (buf.length > 0) rawBlocks.push({ type, text: buf.join(" ") });
    buf = [];
  };

  let i = 0;
  while (i < tokens.length) {
    if (mode === "prose") {
      const window = classes.slice(i, i + 5);
      const sanskritCount = window.filter((c) => c === "sanskrit").length;
      const englishCount = window.filter((c) => c === "english").length;
      if (sanskritCount >= 4 && englishCount === 0) {
        flush("prose");
        mode = "sanskrit";
        continue;
      }
      buf.push(tokens[i]);
      i++;
    } else {
      if (classes[i] === "english" && classes[i + 1] === "english") {
        flush("sanskrit");
        mode = "prose";
        continue;
      }
      buf.push(tokens[i]);
      i++;
    }
  }
  flush(mode);

  return rawBlocks.map((b, idx) => ({
    type: b.type,
    text: b.text,
    isVerseTranslation: b.type === "prose" && idx > 0 && rawBlocks[idx - 1].type === "sanskrit",
  }));
}

function splitTranslationPurport(text: string): { translation: string; purport: string } {
  const questionIdx = text.indexOf("?");
  if (questionIdx !== -1) {
    return {
      translation: text.slice(0, questionIdx + 1).trim(),
      purport: text.slice(questionIdx + 1).trim(),
    };
  }
  const sentenceMatches = text.match(/[^.!?]+[.!?]+/g);
  if (sentenceMatches && sentenceMatches.length > 1) {
    const translation = sentenceMatches.slice(0, 2).join(" ").trim();
    return { translation, purport: text.slice(translation.length).trim() };
  }
  return { translation: text, purport: "" };
}

function parseContent(raw: string, verseTitle: string): ParsedVerse {
  let text = raw.trim();

  if (verseTitle && text.startsWith(verseTitle)) {
    text = text.slice(verseTitle.length).trim();
  } else {
    const autoTitle = text.match(
      /^[A-Za-z\-Ā ī ū ṛ ṇ ś ṣ ṭ ḍ ṇ ḥ À-ÿ ,]+(?:Chapter \d+)?(?:Verse [\d–-]+)?\s+/,
    );
    if (autoTitle) text = text.slice(autoTitle[0].length).trim();
  }

  const firstDash = text.indexOf(" — ");

  if (firstDash !== -1) {
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

    if (synonyms.length > 0) {
      const { translation, purport } = splitTranslationPurport(afterSynonyms);
      return { title: verseTitle, sanskrit, synonyms, translation, purport };
    }
  }

  return {
    title: verseTitle,
    sanskrit: "",
    synonyms: [],
    translation: "",
    purport: "",
    universalBlocks: parseUniversal(text),
  };
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

function getAllVerseText(parsed: ParsedVerse): string {
  if (parsed.universalBlocks) {
    return parsed.universalBlocks.map((b) => b.text).join(" ");
  }
  const synText = parsed.synonyms.map((s) => `${s.word} — ${s.meaning}`).join(" ; ");
  return [parsed.sanskrit, synText, parsed.translation, parsed.purport]
    .filter(Boolean)
    .join(" ");
}

function getSuggestions(fullText: string, query: string): string[] {
  const q = query.trim();
  if (q.length < 3) return [];
  const lower = q.normalize("NFC").toLowerCase();
  const sentences = fullText.match(/[^.!?]+[.!?]?/g) || [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    const sLower = s.normalize("NFC").toLowerCase();
    if (!sLower.includes(lower)) continue;
    const preview = s.length > 90 ? s.slice(0, 90) + "..." : s;
    if (!seen.has(preview)) {
      seen.add(preview);
      result.push(preview);
    }
    if (result.length >= 6) break;
  }
  return result;
}

function HighlightedText({
  text,
  query,
  style,
}: {
  text: string;
  query: string;
  style?: any;
}) {
  if (!query || query.trim().length < 2) {
    return <Text style={style}>{text}</Text>;
  }
  const normText = text.normalize("NFC");
  const lower = normText.toLowerCase();
  const q = query.trim().normalize("NFC").toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let i = 0;
  while (i < normText.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parts.push({ text: normText.slice(i), match: false });
      break;
    }
    if (idx > i) parts.push({ text: normText.slice(i, idx), match: false });
    parts.push({ text: normText.slice(idx, idx + q.length), match: true });
    i = idx + q.length;
  }
  return (
    <Text style={style}>
      {parts.map((p, idx) =>
        p.match ? (
          <Text key={idx} style={{ backgroundColor: "#ffe066" }}>
            {p.text}
          </Text>
        ) : (
          <Text key={idx}>{p.text}</Text>
        ),
      )}
    </Text>
  );
}

function VerseTitle({
  title,
  searchOpen,
  onToggleSearch,
  searchQuery,
  onChangeSearch,
  suggestions,
  onSelectSuggestion,
}: {
  title: string;
  searchOpen: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  onChangeSearch: (t: string) => void;
  suggestions: string[];
  onSelectSuggestion: (s: string) => void;
}) {
  return (
    <View>
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
        {searchOpen ? (
          <TextInput
            value={searchQuery}
            onChangeText={onChangeSearch}
            placeholder="Search in this verse..."
            placeholderTextColor="#a8886a"
            autoFocus
            style={{ flex: 1, fontSize: 14, color: "#1a1a1a", paddingVertical: 2, marginRight: 8 }}
          />
        ) : (
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
        )}

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={onToggleSearch} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 18 }}>🔍</Text>
          </TouchableOpacity>
          <AdvancedSelector />
        </View>
      </View>

      {searchOpen && suggestions.length > 0 ? (
        <View style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#e8d9b5" }}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => onSelectSuggestion(s)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderBottomWidth: i < suggestions.length - 1 ? 1 : 0,
                borderColor: "#f0f0f0",
              }}
            >
              <Text style={{ fontSize: 13, color: "#1a1a1a" }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SanskritBlock({ text, query = "" }: { text: string; query?: string }) {
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
        <HighlightedText
          key={i}
          text={line}
          query={query}
          style={{
            fontStyle: "italic",
            fontWeight: "bold",
            fontSize: 16,
            color: "#1a1a1a",
            textAlign: "center",
            lineHeight: 30,
          }}
        />
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

function SynonymsBlock({ entries, query = "" }: { entries: SynonymEntry[]; query?: string }) {
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
            <HighlightedText text={entry.meaning} query={query} style={{ color: "#1a1a1a" }} />
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

function TranslationBlock({
  text,
  query = "",
  registerRef,
}: {
  text: string;
  query?: string;
  registerRef?: RegisterRef;
}) {
  if (!text) return null;
  return (
    <View
      ref={(r) => {
        if (r) registerRef?.(text, r);
      }}
    >
      <SectionLabel label="Translation" />
      <HighlightedText
        text={text}
        query={query}
        style={{
          fontSize: 16,
          lineHeight: 28,
          color: "#1a1a1a",
          fontStyle: "italic",
          fontWeight: "bold",
        }}
      />
    </View>
  );
}

function PurportBlock({
  text,
  query = "",
  registerRef,
}: {
  text: string;
  query?: string;
  registerRef?: RegisterRef;
}) {
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
        <View
          key={i}
          ref={(r) => {
            if (r) registerRef?.(para, r);
          }}
        >
          <HighlightedText
            text={para}
            query={query}
            style={{
              fontSize: 15,
              lineHeight: 27,
              color: "#1a1a1a",
              marginBottom: 16,
              textAlign: "justify",
            }}
          />
        </View>
      ))}
    </View>
  );
}

function PlainParagraphs({
  text,
  query = "",
  registerRef,
}: {
  text: string;
  query?: string;
  registerRef?: RegisterRef;
}) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  const paragraphs: string[] = [];
  const perPara = 4;
  for (let i = 0; i < sentences.length; i += perPara) {
    paragraphs.push(sentences.slice(i, i + perPara).join("").trim());
  }
  return (
    <>
      {paragraphs.map((para, i) => (
        <View
          key={i}
          ref={(r) => {
            if (r) registerRef?.(para, r);
          }}
        >
          <HighlightedText
            text={para}
            query={query}
            style={{
              fontSize: 16,
              lineHeight: 28,
              color: "#1a1a1a",
              marginBottom: 16,
              textAlign: "justify",
            }}
          />
        </View>
      ))}
    </>
  );
}

function UniversalView({
  blocks,
  query = "",
  registerRef,
}: {
  blocks: UniversalBlock[];
  query?: string;
  registerRef?: RegisterRef;
}) {
  return (
    <View>
      {blocks.map((block, i) => {
        if (block.type === "sanskrit") {
          return <SanskritBlock key={i} text={block.text} query={query} />;
        }
        if (block.isVerseTranslation) {
          const { translation, purport } = splitTranslationPurport(block.text);
          return (
            <View key={i}>
              <TranslationBlock text={translation} query={query} registerRef={registerRef} />
              <PurportBlock text={purport} query={query} registerRef={registerRef} />
            </View>
          );
        }
        return <PlainParagraphs key={i} text={block.text} query={query} registerRef={registerRef} />;
      })}
    </View>
  );
}

export default function VerseScreen({ route, navigation }: any) {
  const db = useDatabase();
  const { settings } = useDisplaySettings();
  const { divisionId, divisionName, highlightQuery } = route.params;
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [siblings, setSiblings] = useState<Division[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const touchStart = useRef({ x: 0, y: 0 });
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const paragraphRefs = useRef<{ text: string; ref: View }[]>([]);

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
    setSearchOpen(!!highlightQuery);
    setSearchQuery(highlightQuery || "");
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
    touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
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

  const registerParagraphRef: RegisterRef = (text, ref) => {
    if (!ref) return;
    const existing = paragraphRefs.current.find((p) => p.text === text);
    if (!existing) {
      paragraphRefs.current.push({ text, ref });
    } else {
      existing.ref = ref;
    }
  };

  const scrollToMatch = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const target = paragraphRefs.current.find((p) => p.text.toLowerCase().includes(q));
    if (target && target.ref && scrollRef.current) {
      target.ref.measure((x, y, width, height, pageX, pageY) => {
        const targetScrollY = scrollYRef.current + pageY - 140;
        scrollRef.current?.scrollTo({ y: Math.max(0, targetScrollY), animated: true });
      });
    }
  };

  const handleSelectSuggestion = (s: string) => {
    const clean = s.replace(/\.\.\.$/, "");
    setSearchQuery(clean);
    setTimeout(() => scrollToMatch(clean), 150);
  };

  useEffect(() => {
    if (highlightQuery && verse) {
      setTimeout(() => scrollToMatch(highlightQuery), 300);
    }
  }, [verse, highlightQuery]);

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
  const allVerseText = getAllVerseText(parsed);
  const suggestions = getSuggestions(allVerseText, searchQuery);

  paragraphRefs.current = [];

  return (
    <View style={{ flex: 1 }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: "#fdf6e3" }}
        contentContainerStyle={{ paddingBottom: 52 }}
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <VerseTitle
          title={parsed.title}
          searchOpen={searchOpen}
          onToggleSearch={() => {
            setSearchOpen((o) => !o);
            setSearchQuery("");
          }}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          suggestions={suggestions}
          onSelectSuggestion={handleSelectSuggestion}
        />
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          {parsed.universalBlocks ? (
            <UniversalView
              blocks={parsed.universalBlocks}
              query={searchQuery}
              registerRef={registerParagraphRef}
            />
          ) : (
            <>
              {settings.mantra && parsed.sanskrit ? (
                <SanskritBlock text={parsed.sanskrit} query={searchQuery} />
              ) : null}
              {settings.synonyms ? (
                <SynonymsBlock entries={parsed.synonyms} query={searchQuery} />
              ) : null}
              {settings.translation ? (
                <TranslationBlock
                  text={parsed.translation}
                  query={searchQuery}
                  registerRef={registerParagraphRef}
                />
              ) : null}
              {settings.purport ? (
                <PurportBlock
                  text={parsed.purport}
                  query={searchQuery}
                  registerRef={registerParagraphRef}
                />
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}