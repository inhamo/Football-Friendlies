import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

export default function GroundMap({ coordinate, onChange }) {
  const point = coordinate || { latitude: -17.8249, longitude: 31.053 };
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  const mapUrl =
    `https://www.openstreetmap.org/export/embed.html?bbox=` +
    `${longitude - 0.035}%2C${latitude - 0.025}%2C` +
    `${longitude + 0.035}%2C${latitude + 0.025}` +
    `&layer=mapnik&marker=${latitude}%2C${longitude}`;
  return (
    <View style={styles.frame}>
      {React.createElement("iframe", {
        title: "Ground map",
        src: mapUrl,
        loading: "lazy",
        style: {
          width: "100%",
          height: 210,
          border: 0,
          display: "block",
        },
      })}
      <Text style={styles.copy}>
        Move the map to inspect the area, then refine the ground coordinates.
      </Text>
      <View style={styles.coordinateRow}>
        <TextInput
          value={String(latitude)}
          onChangeText={(value) => {
            const next = Number(value);
            if (Number.isFinite(next)) onChange?.({ latitude: next, longitude });
          }}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="Ground latitude"
          style={styles.coordinateInput}
        />
        <TextInput
          value={String(longitude)}
          onChangeText={(value) => {
            const next = Number(value);
            if (Number.isFinite(next)) onChange?.({ latitude, longitude: next });
          }}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="Ground longitude"
          style={styles.coordinateInput}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DED8E6",
  },
  copy: { color: "#5B5363", fontSize: 13, padding: 12, paddingBottom: 6 },
  coordinateRow: { flexDirection: "row", gap: 8, padding: 12, paddingTop: 4 },
  coordinateInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#DED8E6",
    borderRadius: 4,
    paddingHorizontal: 10,
    color: "#17131D",
    backgroundColor: "#FFFFFF",
  },
});
