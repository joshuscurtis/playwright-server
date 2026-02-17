import { Container, Title, Text } from "@mantine/core";

export default function TestPage() {
  return (
    <Container size="xl" py="lg">
      <Title order={2}>Mantine Test</Title>
      <Text c="dimmed">If you see this, Mantine works!</Text>
    </Container>
  );
}
