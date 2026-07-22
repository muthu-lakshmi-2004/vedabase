import { useEffect, useState, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useDatabase } from "../context/DatabaseContext";
import { getNote, saveNote } from "../api/notes";

export default function NotesScreen({ route, navigation }: any) {
  const db = useDatabase();
  const { divisionId, divisionName } = route.params;
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNote(db, divisionId)
      .then(setText)
      .finally(() => setLoading(false));
  }, [divisionId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await saveNote(db, divisionId, text);
    setSaving(false);
    navigation.goBack();
  }, [text, divisionId, navigation]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fdf6e3" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          borderBottomWidth: 1,
          borderColor: "#e8d9b5",
        }}
      >
        <Text
          style={{ fontSize: 13, color: "#8B0000", fontWeight: "700", flex: 1, marginRight: 12 }}
        >
          {divisionName}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: "#8B0000",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={{
          flex: 1,
          padding: 16,
          fontSize: 16,
          color: "#1a1a1a",
          textAlignVertical: "top",
        }}
        multiline
        autoFocus
        placeholder="Type your notes here..."
        placeholderTextColor="#999"
        value={text}
        onChangeText={setText}
      />
    </KeyboardAvoidingView>
  );
}