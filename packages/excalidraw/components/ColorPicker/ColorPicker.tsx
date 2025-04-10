import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { useRef } from "react";
import { ChromePicker } from "react-color";

import {
  COLOR_OUTLINE_CONTRAST_THRESHOLD,
  COLOR_PALETTE,
  isTransparent,
} from "@excalidraw/common";

import type { ColorTuple, ColorPaletteCustom } from "@excalidraw/common";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { useAtom } from "../../editor-jotai";
import { t } from "../../i18n";
import { useExcalidrawContainer } from "../App";
import { ButtonSeparator } from "../ButtonSeparator";
import { activeEyeDropperAtom } from "../EyeDropper";
import { PropertiesPopover } from "../PropertiesPopover";

import { ColorInput } from "./ColorInput";
import { Picker } from "./Picker";
import PickerHeading from "./PickerHeading";
import { TopPicks } from "./TopPicks";
import { activeColorPickerSectionAtom, isColorDark } from "./colorPickerUtils";

import "./ColorPicker.scss";

import type { ColorPickerType } from "./colorPickerUtils";

import type { AppState } from "../../types";

const isValidColor = (color: string) => {
  const style = new Option().style;
  style.color = color;
  return !!style.color;
};

export const getColor = (color: string): string | null => {
  if (isTransparent(color)) {
    return color;
  }

  // testing for `#` first fixes a bug on Electron (more specfically, an
  // Obsidian popout window), where a hex color without `#` is (incorrectly)
  // considered valid
  return isValidColor(`#${color}`)
    ? `#${color}`
    : isValidColor(color)
    ? color
    : null;
};

interface ColorPickerProps {
  type: ColorPickerType;
  color: string;
  onChange: (color: string) => void;
  label: string;
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  palette?: ColorPaletteCustom | null;
  topPicks?: ColorTuple;
  updateData: (formData?: any) => void;
}

const ColorPickerPopupContent = ({
  type,
  color,
  onChange,
  label,
  elements,
  palette = COLOR_PALETTE,
  updateData,
}: Pick<
  ColorPickerProps,
  | "type"
  | "color"
  | "onChange"
  | "label"
  | "elements"
  | "palette"
  | "updateData"
>) => {
  const { container } = useExcalidrawContainer();
  const [, setActiveColorPickerSection] = useAtom(activeColorPickerSectionAtom);

  const [eyeDropperState, setEyeDropperState] = useAtom(activeEyeDropperAtom);

  const colorInputJSX = (
    <div>
      <PickerHeading>{t("colorPicker.hexCode")}</PickerHeading>
      <ColorInput
        color={color}
        label={label}
        onChange={(color) => {
          onChange(color);
        }}
        colorPickerType={type}
      />
    </div>
  );

  const popoverRef = useRef<HTMLDivElement>(null);

  const focusPickerContent = () => {
    popoverRef.current
      ?.querySelector<HTMLDivElement>(".color-picker-content")
      ?.focus();
  };

  return (
    <PropertiesPopover
      container={container}
      style={{ maxWidth: "13rem" }}
      onFocusOutside={(event) => {
        // refocus due to eye dropper
        focusPickerContent();
        event.preventDefault();
      }}
      onPointerDownOutside={(event) => {
        if (eyeDropperState) {
          // prevent from closing if we click outside the popover
          // while eyedropping (e.g. click when clicking the sidebar;
          // the eye-dropper-backdrop is prevented downstream)
          event.preventDefault();
        }
      }}
      onClose={() => {
        updateData({ openPopup: null });
        setActiveColorPickerSection(null);
      }}
    >
      {palette ? (
        <Picker
          palette={palette}
          color={color}
          onChange={(changedColor) => {
            onChange(changedColor);
          }}
          onEyeDropperToggle={(force) => {
            setEyeDropperState((state) => {
              if (force) {
                state = state || {
                  keepOpenOnAlt: true,
                  onSelect: onChange,
                  colorPickerType: type,
                };
                state.keepOpenOnAlt = true;
                return state;
              }

              return force === false || state
                ? null
                : {
                    keepOpenOnAlt: false,
                    onSelect: onChange,
                    colorPickerType: type,
                  };
            });
          }}
          onEscape={(event) => {
            if (eyeDropperState) {
              setEyeDropperState(null);
            } else {
              updateData({ openPopup: null });
            }
          }}
          label={label}
          type={type}
          elements={elements}
          updateData={updateData}
        >
          {colorInputJSX}
        </Picker>
      ) : (
        colorInputJSX
      )}
      <div style={{ marginTop: "1rem", maxWidth: "100%", overflow: "hidden" }}>
        <ChromePicker
          color={color}
          onChange={(colorResult) => {
            onChange(colorResult.hex); // Update the color when the user selects a color
          }}
          styles={{
            default: {
              picker: {
                width: "100%", // Make the picker fit the parent container
                boxSizing: "border-box", // Ensure padding is included in the width
              }
            },
          }}
        />
      </div>
    </PropertiesPopover>
  );
};

const ColorPickerTrigger = ({
  label,
  color,
  type,
}: {
  color: string;
  label: string;
  type: ColorPickerType;
}) => {
  return (
    <Popover.Trigger
      type="button"
      className={clsx("color-picker__button active-color properties-trigger", {
        "is-transparent": color === "transparent" || !color,
        "has-outline": !isColorDark(color, COLOR_OUTLINE_CONTRAST_THRESHOLD),
      })}
      aria-label={label}
      style={color ? { "--swatch-color": color } : undefined}
      title={
        type === "elementStroke"
          ? t("labels.showStroke")
          : t("labels.showBackground")
      }
    >
      <div className="color-picker__button-outline" />
    </Popover.Trigger>
  );
};

export const ColorPicker = ({
  type,
  color,
  onChange,
  label,
  elements,
  palette = COLOR_PALETTE,
  topPicks,
  updateData,
  appState,
}: ColorPickerProps) => {
  return (
    <div>
      <div role="dialog" aria-modal="true" className="color-picker-container">
        <TopPicks
          activeColor={color}
          onChange={onChange}
          type={type}
          topPicks={topPicks}
        />
        <ButtonSeparator />
        <Popover.Root
          open={appState.openPopup === type}
          onOpenChange={(open) => {
            updateData({ openPopup: open ? type : null });
          }}
        >
          {/* serves as an active color indicator as well */}
          <ColorPickerTrigger color={color} label={label} type={type} />
          {/* popup content */}
          {appState.openPopup === type && (
            <ColorPickerPopupContent
              type={type}
              color={color}
              onChange={onChange}
              label={label}
              elements={elements}
              palette={palette}
              updateData={updateData}
            />
          )}
        </Popover.Root>
      </div>
    </div>
  );
};
