import React from "react";

export default function DateField({
  value,
  onChange,
  maximumDate,
  minimumDate,
  accessibilityLabel = "Choose date",
}) {
  const toValue = (date) => date?.toISOString().slice(0, 10);
  return React.createElement("input", {
    type: "date",
    value: value || "",
    onChange: (event) => onChange(event.target.value),
    max: toValue(maximumDate),
    min: toValue(minimumDate),
    "aria-label": accessibilityLabel,
    style: {
      boxSizing: "border-box",
      width: "100%",
      minHeight: 50,
      padding: "0 13px",
      border: "1px solid #DED8E6",
      borderRadius: 4,
      backgroundColor: "#FFFFFF",
      color: "#17131D",
      fontSize: 15,
      fontFamily: "inherit",
    },
  });
}
