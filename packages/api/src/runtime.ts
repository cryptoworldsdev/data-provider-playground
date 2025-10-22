import { createPluginRuntime, type PluginBinding } from "every-plugin";

import type TemplatePlugin from "@every-plugin/template";

type AppBindings = {
  "@every-plugin/template": PluginBinding<typeof TemplatePlugin>;
};

const runtime = createPluginRuntime<AppBindings>({
  registry: {
    "@every-plugin/template": {
      remoteUrl: "http://localhost:3014/remoteEntry.js",
    },
  },
  secrets: {
    TEMPLATE_API_KEY: process.env.TEMPLATE_API_KEY!,
  },
});

export const { router: templateRouter } = await runtime.usePlugin("@every-plugin/template", {
  variables: {
    baseUrl: process.env.TEMPLATE_BASE_URL || "https://api.example.com",
    timeout: Number(process.env.TEMPLATE_TIMEOUT) || 10000,
    backgroundEnabled: process.env.TEMPLATE_BACKGROUND_ENABLED === "true",
    backgroundIntervalMs: Number(process.env.TEMPLATE_BACKGROUND_INTERVAL_MS) || 30000,
  },
  secrets: { apiKey: "{{TEMPLATE_API_KEY}}" },
});
