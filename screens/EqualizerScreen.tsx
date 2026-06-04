import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { X, Power } from "phosphor-react-native";
import { useTheme } from "../context/ThemeContext";
import { useEqualizerStore } from "../stores/equalizerStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BAND_WIDTH = Math.min(34, (SCREEN_WIDTH - 40) / 10);
const SLIDER_HEIGHT = 180;
const TRACK_HEIGHT = SLIDER_HEIGHT - 40;
const MIN_DB = -12;
const MAX_DB = 12;

function gainToPercent(gain: number) {
  return (gain - MIN_DB) / (MAX_DB - MIN_DB);
}

function percentToGain(percent: number) {
  return Math.round((percent * (MAX_DB - MIN_DB) + MIN_DB) * 10) / 10;
}

const TRACK_TOP = (SLIDER_HEIGHT - TRACK_HEIGHT) / 2;

function locationToGain(locationY: number): number {
  const relativeY = Math.max(0, Math.min(TRACK_HEIGHT, locationY - TRACK_TOP));
  const percent = 1 - relativeY / TRACK_HEIGHT;
  return percentToGain(percent);
}

function VerticalSlider({
  value,
  onValueChange,
  label,
  primaryColor,
  trackColor,
  mutedColor,
}: {
  value: number;
  onValueChange: (v: number) => void;
  label: string;
  primaryColor: string;
  trackColor: string;
  mutedColor: string;
  textColor: string;
}) {
  const percent = gainToPercent(value);

  return (
    <View style={{ width: BAND_WIDTH, alignItems: "center" }}>
      <Text
        style={{
          fontSize: 9,
          color: value > 3 ? primaryColor : value < -3 ? "#ef4444" : mutedColor,
          fontWeight: "600",
          marginBottom: 4,
          height: 14,
        }}
      >
        {value > 0 ? `+${value}` : `${value}`}
      </Text>
      <View
        style={{
          height: SLIDER_HEIGHT,
          width: BAND_WIDTH,
          alignItems: "center",
          justifyContent: "center",
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          onValueChange(locationToGain(e.nativeEvent.locationY));
        }}
        onResponderMove={(e) => {
          onValueChange(locationToGain(e.nativeEvent.locationY));
        }}
      >
        <View
          style={{
            width: 4,
            height: TRACK_HEIGHT,
            borderRadius: 2,
            backgroundColor: trackColor,
            justifyContent: "flex-end",
            overflow: "visible",
          }}
        >
          <View
            style={{
              width: 4,
              height: Math.max(
                2,
                Math.min(TRACK_HEIGHT, percent * TRACK_HEIGHT),
              ),
              borderRadius: 2,
              backgroundColor:
                value > 0 ? primaryColor : value < 0 ? "#ef4444" : trackColor,
            }}
          />
        </View>
        <View
          style={{
            position: "absolute",
            top: TRACK_TOP + TRACK_HEIGHT * (1 - percent) - 10,
            left: BAND_WIDTH / 2 - 10,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor:
              value > 0 ? primaryColor : value < 0 ? "#ef4444" : mutedColor,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 4,
            elevation: 3,
          }}
        />
      </View>
      <Text
        style={{
          fontSize: 9,
          color: mutedColor,
          marginTop: 6,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function EqualizerScreen({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { primaryColor, textColor, mutedColor, isDarkMode } = useTheme();
  const {
    gains,
    preset,
    enabled,
    presets,
    setBandGain,
    resetToFlat,
    applyPreset,
    toggleEnabled,
  } = useEqualizerStore();

  const trackColor = isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? "#18181b" : "#f4f4f5",
          paddingTop: 60,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingBottom: 16,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Close equalizer"
            accessibilityRole="button"
          >
            <X size={22} color={textColor} weight="bold" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "800", color: textColor }}>
            Equalizer
          </Text>
          <TouchableOpacity
            onPress={toggleEnabled}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 22,
              backgroundColor: enabled ? `${primaryColor}20` : "transparent",
            }}
            accessibilityLabel={
              enabled ? "Disable equalizer" : "Enable equalizer"
            }
            accessibilityRole="button"
            accessibilityState={{ checked: enabled }}
          >
            <Power
              size={20}
              color={enabled ? primaryColor : mutedColor}
              weight={enabled ? "fill" : "regular"}
            />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Bar visualization */}
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              height: 60,
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 1,
            }}
          >
            {gains.map((gain, i) => {
              const barHeight = (Math.abs(gain) / MAX_DB) * 50;
              const isBoost = gain >= 0;
              return (
                <View
                  key={i}
                  style={{
                    width: BAND_WIDTH - 4,
                    height: Math.max(2, barHeight),
                    backgroundColor: isBoost ? primaryColor : "#ef4444",
                    opacity: enabled ? 0.8 : 0.2,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                    marginBottom: isBoost ? 30 : 0,
                    marginTop: isBoost ? 0 : 30,
                  }}
                />
              );
            })}
          </View>

          {/* Center line */}
          <View
            style={{
              marginHorizontal: 20,
              height: 1,
              backgroundColor: trackColor,
              marginBottom: 4,
            }}
          />

          {/* Sliders */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              alignItems: "center",
            }}
          >
            {gains.map((gain, i) => (
              <VerticalSlider
                key={i}
                value={gain}
                onValueChange={(v) => setBandGain(i, v)}
                label={useEqualizerStore.getState().bands[i]?.label || `${i}`}
                primaryColor={primaryColor}
                trackColor={trackColor}
                mutedColor={mutedColor}
                textColor={textColor}
              />
            ))}
          </ScrollView>

          {/* Controls */}
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            {/* Preset selector */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: mutedColor,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                Preset
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {presets.map((p) => (
                  <TouchableOpacity
                    key={p.name}
                    onPress={() => applyPreset(p.name)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor:
                        preset === p.name
                          ? `${primaryColor}20`
                          : isDarkMode
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.06)",
                      borderWidth: 1,
                      borderColor:
                        preset === p.name ? primaryColor : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: preset === p.name ? "700" : "500",
                        color: preset === p.name ? primaryColor : textColor,
                      }}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Flat + Close buttons */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={resetToFlat}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: isDarkMode
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: textColor }}
                >
                  Reset to Flat
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: primaryColor,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: isDarkMode ? "#18181b" : "#ffffff",
                  }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
