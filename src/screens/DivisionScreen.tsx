import { FlatList, TouchableOpacity, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useEffect, useState } from "react";
import { getDivisionsByBook } from "../api/division";
import { useDatabase } from "../context/DatabaseContext"; 
import { Division } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Division">;

export default function DivisionScreen({ route, navigation }: Props) {
  const db = useDatabase(); 
  const { bookId } = route.params; 
  const [divisions, setDivisions] = useState<Division[]>([]);

  useEffect(() => {
    getDivisionsByBook(db, bookId).then(setDivisions);
  }, []);

  return (
    <FlatList
      data={divisions}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("Verse", {
              divisionId: item.id,
              divisionName: item.name,
            })
          }
          style={{ padding: 15, borderBottomWidth: 1, borderColor: "#eee" }}
        >
          <Text style={{ fontSize: 16, color: "#8B0000" }}>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
