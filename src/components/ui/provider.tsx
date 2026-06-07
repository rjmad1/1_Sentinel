"use client"

import { ChakraProvider, createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        success: { value: "#16C784" },
        warning: { value: "#F5A524" },
        danger: { value: "#EF4444" },
        info: { value: "#3B82F6" },
        cyan: { value: "#06B6D4" },
        blue: { value: "#3B82F6" },
        pink: { value: "#EF4444" },
        orange: { value: "#F5A524" },
        cyber: {
          50: { value: "#EFF6FF" },
          100: { value: "#DBEAFE" },
          200: { value: "#BFDBFE" },
          300: { value: "#93C5FD" },
          400: { value: "#60A5FA" },
          500: { value: "#06B6D4" }, // cyber cyan
          600: { value: "#3B82F6" }, // cyber blue
          700: { value: "#1D4ED8" },
          800: { value: "#1E40AF" },
          900: { value: "#1E3A8A" },
        },
        neutralScale: {
          50: { value: "#FAFAFA" },
          100: { value: "#F5F5F5" },
          200: { value: "#E5E7EB" },
          300: { value: "#D1D5DB" },
          400: { value: "#9CA3AF" },
          500: { value: "#6B7280" },
          600: { value: "#4B5563" },
          700: { value: "#374151" },
          800: { value: "#1F2937" },
          900: { value: "#111827" },
          950: { value: "#030712" },
        }
      }
    },
    semanticTokens: {
      colors: {
        success: { value: "{colors.success}" },
        warning: { value: "{colors.warning}" },
        danger: { value: "{colors.danger}" },
        info: { value: "{colors.info}" },
        bg: {
          primary: { value: "{colors.neutralScale.950}" },
          secondary: { value: "{colors.neutralScale.900}" },
          card: { value: "{colors.neutralScale.900}" },
        },
        text: {
          primary: { value: "{colors.neutralScale.50}" },
          secondary: { value: "{colors.neutralScale.400}" },
          muted: { value: "{colors.neutralScale.500}" },
        }
      }
    }
  }
})

const system = createSystem(defaultConfig, customConfig)

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  )
}
