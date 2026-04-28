import { useEffect, useState } from "react";
import { FlatList, TouchableOpacity, Image, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { getAllBooks } from "../api/book";
import { useDatabase } from "../context/DatabaseContext";
import { Book } from "../types";

const imageMap: Record<string, any> = {
  "image_1.png": require("../../assets/images/image_1.png"),
  "image_2.png": require("../../assets/images/image_2.png"),
  "image_3.png": require("../../assets/images/image_3.png"),
  "image_4.png": require("../../assets/images/image_4.png"),
  "image_5.png": require("../../assets/images/image_5.png"),
  "image_6.png": require("../../assets/images/image_6.png"),
  "image_7.png": require("../../assets/images/image_7.png"),
  "image_8.png": require("../../assets/images/image_8.png"),
  "image_9.png": require("../../assets/images/image_9.png"),
  "image_10.png": require("../../assets/images/image_10.png"),
  "image_11.png": require("../../assets/images/image_11.png"),
  "image_12.png": require("../../assets/images/image_12.png"),
  "image_13.png": require("../../assets/images/image_13.png"),
};

type Props = NativeStackScreenProps<RootStackParamList, "BookList">;

export default function BookListScreen({ navigation }: Props) {
  const db = useDatabase();
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    getAllBooks(db).then(setBooks);
  }, []);

  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("Division", {
              bookId: item.id,
              bookName: item.name,
            })
          }
          style={{
            flexDirection: "row",
            padding: 15,
            alignItems: "center",
            borderBottomWidth: 1,
            borderColor: "#eee",
          }}
        >
          <Image
            source={imageMap[item.image]}
            style={{ width: 50, height: 50, marginRight: 15 }}
            resizeMode="contain"
          />
          <Text style={{ fontSize: 16, color: "#8B0000", fontWeight: "bold" }}>
            {item.name}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}
