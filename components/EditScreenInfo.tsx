import { Text, View } from 'react-native';

interface EditScreenInfoProps {
  path: string;
}

export const EditScreenInfo: React.FC<EditScreenInfoProps> = ({ path }) => {
  return (
    <View className="items-center mx-12">
      <Text className="text-lg leading-6 text-center">
        Open up the code for this screen:
      </Text>
      <View className="rounded-md px-1 my-2">
        <Text>{path}</Text>
      </View>
      <Text className="text-lg leading-6 text-center">
        Change any of the text, save the file, and your app will automatically update.
      </Text>
    </View>
  );
};
