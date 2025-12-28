import React from "react";

interface WidgetControlsProps {
  isHovered: boolean;
  onExpand: () => void;
  // Intentionally omitting God Mode for now as it wasn't rendered in the original return JSX
  // despite the logic being present. We will re-add it if needed, but for now we match the
  // visual output of the original component.
}

const WidgetControls: React.FC<WidgetControlsProps> = ({
  isHovered,
  onExpand,
}) => {
  if (!isHovered) return null;

  return null;
};

export default WidgetControls;
