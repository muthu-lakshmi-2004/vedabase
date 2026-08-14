import { useState } from "react";
import { TouchableOpacity, Text, Modal, View, Pressable } from "react-native";
import { useDisplaySettings, DisplaySettings } from "../context/DisplaySettingsContext";

const OPTIONS: { key: keyof DisplaySettings; label: string }[] = [
  { key: "mantra", label: "Mantra" },
  { key: "synonyms", label: "Synonyms" },
  { key: "translation", label: "Translation" },
  { key: "purport", label: "Purport" },
];

export default function AdvancedSelector() {
  const { settings, toggle } = useDisplaySettings();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <Text style={{ color: "#8B0000", fontSize: 13, fontWeight: "700" }}>Advanced ▾</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" }}
          onPress={() => setVisible(false)}
        >
          <Pressable style={{ backgroundColor: "#fff", borderRadius: 10, padding: 20, width: 260 }} onPress={() => {}}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#8B0000", marginBottom: 14 }}>
              Show sections
            </Text>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => toggle(opt.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderColor: "#eee",
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: "#8B0000",
                    marginRight: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: settings[opt.key] ? "#8B0000" : "transparent",
                  }}
                >
                  {settings[opt.key] ? (
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>✓</Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 15, color: "#1a1a1a" }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setVisible(false)} style={{ marginTop: 16, alignSelf: "flex-end" }}>
              <Text style={{ color: "#8B0000", fontWeight: "bold" }}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}