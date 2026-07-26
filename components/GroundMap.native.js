import React from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function GroundMap({ coordinate, onChange }) {
  const point = coordinate || { latitude: -17.8249, longitude: 31.053 };
  return (
    <View style={styles.frame}>
      <MapView
        style={styles.map}
        region={{
          ...point,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
        onPress={(event) => onChange?.(event.nativeEvent.coordinate)}
      >
        <Marker
          coordinate={point}
          draggable
          onDragEnd={(event) => onChange?.(event.nativeEvent.coordinate)}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 220,
    overflow: "hidden",
    borderRadius: 12,
  },
  map: { flex: 1 },
});
