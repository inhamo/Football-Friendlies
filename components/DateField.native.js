import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";

const toDate = (value) => {
  if (!value) return new Date();
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toStoredDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const displayDate = (value) =>
  value
    ? toDate(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Choose date";

export default function DateField({
  value,
  onChange,
  maximumDate,
  minimumDate,
  accessibilityLabel = "Choose date",
}) {
  const [open, setOpen] = useState(false);
  const picker = (
    <DateTimePicker
      value={toDate(value)}
      mode="date"
      display={Platform.OS === "ios" ? "inline" : "default"}
      maximumDate={maximumDate}
      minimumDate={minimumDate}
      onChange={(event, selectedDate) => {
        if (Platform.OS === "android") setOpen(false);
        if (event.type === "set" && selectedDate) {
          onChange(toStoredDate(selectedDate));
        }
      }}
      accentColor="#6C2BEA"
    />
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={styles.field}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {displayDate(value)}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#6C2BEA" />
      </Pressable>
      {Platform.OS === "android" && open ? picker : null}
      {Platform.OS === "ios" ? (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              {picker}
              <Pressable style={styles.done} onPress={() => setOpen(false)}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 50,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#DED8E6",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: { color: "#17131D", fontSize: 15 },
  placeholder: { color: "#6D6575" },
  backdrop: {
    flex: 1,
    padding: 18,
    backgroundColor: "#17131D99",
    justifyContent: "flex-end",
  },
  sheet: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  done: {
    minHeight: 48,
    marginTop: 8,
    borderRadius: 4,
    backgroundColor: "#6C2BEA",
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
