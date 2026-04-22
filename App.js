import { useEffect, useState } from 'react';
import { View, Text, Image, FlatList } from 'react-native';
import { openDatabase } from './src/database/db';
import { getAllBooks } from './src/api/book';

// Image map - filename → require
const imageMap = {
  'image_1.png': require('./assets/images/image_1.png'),
  'image_2.png': require('./assets/images/image_2.png'),
  'image_3.png': require('./assets/images/image_3.png'),
  'image_4.png': require('./assets/images/image_4.png'),
  'image_5.png': require('./assets/images/image_5.png'),
  'image_6.png': require('./assets/images/image_6.png'),
  'image_7.png': require('./assets/images/image_7.png'),
  'image_8.png': require('./assets/images/image_8.png'),
  'image_9.png': require('./assets/images/image_9.png'),
  'image_10.png': require('./assets/images/image_10.png'),
  'image_11.png': require('./assets/images/image_11.png'),
  'image_12.png': require('./assets/images/image_12.png'),
  'image_13.png': require('./assets/images/image_13.png'),
};

export default function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const database = await openDatabase();
        const result = await getAllBooks(database);
        setBooks(result);
      } catch (e) {
        console.error('Error:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) return <Text>Loading...</Text>;

  return (
    <FlatList
      data={books}
      keyExtractor={item => item.id.toString()}
      renderItem={({ item }) => (
        <View style={{ flexDirection: 'row', padding: 10, alignItems: 'center' }}>
          <Image
            source={imageMap[item.image]}
            style={{ width: 50, height: 50, marginRight: 10 }}
          />
          <Text>{item.name}</Text>
        </View>
      )}
    />
  );
}