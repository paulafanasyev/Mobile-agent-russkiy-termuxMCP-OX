import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { SvetlanaAvatar } from "@/components/svetlana/svetlana-avatar";
import { Container } from "@/components/shared/container";

export default function SvetlanaScreen() {
  const router = useRouter();

  return (
    <Container contentClassName="flex-1 px-5">
      <View className="flex-1 items-center justify-center gap-6">
        <View className="items-center gap-2">
          <Text className="font-sans text-3xl font-semibold text-foreground dark:text-foreground-dark">
            Светлана
          </Text>
          <Text className="text-center font-sans text-base text-muted-foreground dark:text-muted-foreground-dark">
            Голосовой ассистент и управление устройством
          </Text>
        </View>

        <SvetlanaAvatar state="idle" />

        <Text
          accessibilityLiveRegion="polite"
          className="max-w-sm text-center font-sans text-base text-muted-foreground dark:text-muted-foreground-dark"
        >
          Здравствуйте! Я Светлана. Чем могу помочь?
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Вернуться в чат"
          onPress={() => router.replace("/chat")}
          className="rounded-xl border border-border px-5 py-3 dark:border-border-dark"
        >
          <Text className="font-sans text-base text-foreground dark:text-foreground-dark">
            Вернуться в чат
          </Text>
        </Pressable>
      </View>
    </Container>
  );
}
