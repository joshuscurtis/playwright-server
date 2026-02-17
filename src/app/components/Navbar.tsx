"use client";

import { Text, Group, Container, Anchor } from "@mantine/core";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  // Hide navbar on trace viewer pages (full-screen)
  if (pathname.startsWith("/traces/")) return null;

  const links = [{ href: "/", label: "Dashboard" }];

  return (
    <header
      style={{
        height: 56,
        borderBottom: "1px solid #e9ecef",
        backgroundColor: "white",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Container
        size="xl"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Group gap="lg">
          <Anchor
            href="/"
            underline="never"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "linear-gradient(135deg, #12b886 0%, #099268 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              P
            </div>
            <Text fw={700} size="md" c="dark">
              Playwright Reports
            </Text>
          </Anchor>

          <Group gap={4}>
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Anchor
                  key={link.href}
                  href={link.href}
                  underline="never"
                  size="sm"
                  fw={500}
                  c={active ? "teal" : "dimmed"}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    backgroundColor: active ? "#e6fcf5" : "transparent",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  {link.label}
                </Anchor>
              );
            })}
          </Group>
        </Group>
      </Container>
    </header>
  );
}
