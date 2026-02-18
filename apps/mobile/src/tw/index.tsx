import React from "react";
import { cssInterop, useUnstableNativeVariable as useNativeVariable } from "nativewind";
import { Link as RouterLink } from "expo-router";
import Animated from "react-native-reanimated";
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TouchableHighlight as RNTouchableHighlight,
  TouchableOpacity as RNTouchableOpacity,
  TextInput as RNTextInput,
  FlatList as RNFlatList,
  StyleSheet,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const StyledRouterLink = cssInterop(RouterLink, { className: "style" });
export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string },
) => {
  return <StyledRouterLink {...props} />;
};

Link.Trigger = RouterLink.Trigger;
Link.Menu = RouterLink.Menu;
Link.MenuAction = RouterLink.MenuAction;
Link.Preview = RouterLink.Preview;

export const useCSSVariable =
  process.env.EXPO_OS !== "web"
    ? useNativeVariable
    : (variable: string) => `var(${variable})`;

const MIN_TEXT_LINE_HEIGHT_RATIO = 1.25;
const SINGLE_LINE_MIN_SCALE = 0.82;

type FontStyleShape = {
  fontSize?: number;
  lineHeight?: number;
  flexShrink?: number;
  includeFontPadding?: boolean;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const minLineHeight = (fontSize: number) =>
  Math.ceil(fontSize * MIN_TEXT_LINE_HEIGHT_RATIO);

const normalizeTextStyle = (
  style: React.ComponentProps<typeof RNText>["style"],
) => {
  const flattened = StyleSheet.flatten(style) as FontStyleShape | undefined;
  if (!flattened) return style;

  const nextStyle: FontStyleShape = {};

  if (isFiniteNumber(flattened.fontSize)) {
    const targetLineHeight = minLineHeight(flattened.fontSize);
    if (
      !isFiniteNumber(flattened.lineHeight) ||
      flattened.lineHeight < targetLineHeight
    ) {
      nextStyle.lineHeight = targetLineHeight;
    }
  }

  if (flattened.flexShrink == null) {
    nextStyle.flexShrink = 1;
  }

  return Object.keys(nextStyle).length ? [style, nextStyle] : style;
};

const normalizeTextInputStyle = (
  style: React.ComponentProps<typeof RNTextInput>["style"],
) => {
  const flattened = StyleSheet.flatten(style) as FontStyleShape | undefined;
  if (!flattened) return style;

  const nextStyle: FontStyleShape = {};

  if (isFiniteNumber(flattened.fontSize)) {
    const targetLineHeight = minLineHeight(flattened.fontSize);
    if (
      !isFiniteNumber(flattened.lineHeight) ||
      flattened.lineHeight < targetLineHeight
    ) {
      nextStyle.lineHeight = targetLineHeight;
    }
  }

  if (flattened.includeFontPadding === false) {
    nextStyle.includeFontPadding = true;
  }

  return Object.keys(nextStyle).length ? [style, nextStyle] : style;
};

const BaseText = React.forwardRef<
  React.ElementRef<typeof RNText>,
  React.ComponentProps<typeof RNText> & { className?: string }
>(function BaseText(
  {
    style,
    numberOfLines,
    adjustsFontSizeToFit,
    minimumFontScale,
    ...rest
  },
  ref,
) {
  const isSingleLine = numberOfLines === 1;
  return (
    <RNText
      ref={ref}
      {...rest}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit ?? isSingleLine}
      minimumFontScale={
        minimumFontScale ?? (isSingleLine ? SINGLE_LINE_MIN_SCALE : undefined)
      }
      style={normalizeTextStyle(style)}
    />
  );
});

const BaseTextInput = React.forwardRef<
  React.ElementRef<typeof RNTextInput>,
  React.ComponentProps<typeof RNTextInput> & { className?: string }
>(function BaseTextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={normalizeTextInputStyle(style)} />;
});

export const View = RNView;
export const Text = cssInterop(BaseText, { className: "style" });
export const ScrollView = RNScrollView;
export const Pressable = RNPressable;
export const TouchableOpacity = RNTouchableOpacity;
export const TextInput = BaseTextInput;
export const FlatList = RNFlatList;

export const AnimatedView = cssInterop(Animated.View, { className: "style" });
export const AnimatedScrollView = cssInterop(Animated.ScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});
export const AnimatedText = cssInterop(Animated.Text, { className: "style" });

function XXTouchableHighlight(
  props: React.ComponentProps<typeof RNTouchableHighlight>,
) {
  const flattened = StyleSheet.flatten(props.style) as
    | (Record<string, unknown> & { underlayColor?: string })
    | undefined;
  const { underlayColor, ...style } = flattened || {};
  return (
    <RNTouchableHighlight
      underlayColor={underlayColor}
      {...props}
      style={style}
    />
  );
}

export const TouchableHighlight = cssInterop(XXTouchableHighlight, {
  className: "style",
});

// SafeAreaView
export const SafeAreaView = cssInterop(RNSafeAreaView, { className: "style" });

export { Image, ImageProps } from "./image";
