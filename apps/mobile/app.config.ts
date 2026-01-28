import fs from "node:fs";
import path from "node:path";
import type { ExpoConfig, ConfigContext } from "expo/config";
import appJson from "./app.json";

const readReversedClientId = () => {
  try {
    const plistPath =
      process.env.EXPO_GOOGLE_OAUTH_PLIST_PATH ??
      path.join(__dirname, "config", "GoogleOAuth.plist");
    const contents = fs.readFileSync(plistPath, "utf8");
    const match = contents.match(
      /<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

const getGoogleSchemeFromClientId = (clientId?: string | null) => {
  if (!clientId) return null;
  const prefix = clientId.replace(".apps.googleusercontent.com", "");
  return `com.googleusercontent.apps.${prefix}`;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig = {
    ...appJson.expo,
    ...config,
  } as ExpoConfig;

  const reversedClientId = readReversedClientId();
  const androidGoogleScheme = getGoogleSchemeFromClientId(
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
  );
  const existingAndroidIntentFilters = baseConfig.android?.intentFilters;
  const normalizedAndroidIntentFilters = existingAndroidIntentFilters
    ? Array.isArray(existingAndroidIntentFilters)
      ? existingAndroidIntentFilters
      : [existingAndroidIntentFilters]
    : [];
  const hasAndroidGoogleScheme = normalizedAndroidIntentFilters.some((filter) => {
    const data = filter.data;
    const normalizedData = data
      ? Array.isArray(data)
        ? data
        : [data]
      : [];
    return normalizedData.some((entry) => entry.scheme === androidGoogleScheme);
  });
  const androidIntentFilters =
    androidGoogleScheme &&
    !hasAndroidGoogleScheme
      ? [
          ...normalizedAndroidIntentFilters,
          {
            action: "VIEW",
            data: [
              {
                scheme: androidGoogleScheme,
                pathPrefix: "/oauthredirect",
              },
            ],
            category: ["BROWSABLE", "DEFAULT"],
          },
        ]
      : existingAndroidIntentFilters;

  return {
    ...baseConfig,
    ios: {
      ...baseConfig.ios,
      infoPlist: {
        ...(baseConfig.ios?.infoPlist ?? {}),
        ...(reversedClientId
          ? {
              CFBundleURLTypes: [
                {
                  CFBundleURLSchemes: [reversedClientId],
                },
              ],
            }
          : {}),
      },
    },
    android: {
      ...baseConfig.android,
      intentFilters: androidIntentFilters,
    },
    extra: {
      ...(baseConfig.extra ?? {}),
      googleReversedClientId: reversedClientId,
    },
  };
};
