import { useState, useRef, useEffect, useId } from "react";
import { create } from "zustand";

export type CryptoSelectOption = {
  value: number | string;
  label: string;
  icon?: string;
};

interface CryptoSelectProps {
  options: CryptoSelectOption[];
  defaultValue?: CryptoSelectOption;
  selectedValue?: string | number | null;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (option: CryptoSelectOption) => void;
  classNames?: {
    root?: string;
    input?: string;
    dropdown?: string;
    option?: string;
  };
  name?: string;
}

type CryptoSelectStore = {
  openSelectId: string | null;
  setOpenSelectId: (id: string | null) => void;
};

export const useCryptoSelectStore = create<CryptoSelectStore>((set) => ({
  openSelectId: null,
  setOpenSelectId: (id) => set({ openSelectId: id }),
}));

export default function CryptoSelect({
  options,
  defaultValue,
  selectedValue,
  placeholder,
  disabled = false,
  onChange,
  classNames = {},
  name,
}: CryptoSelectProps) {
  const generatedId = useId();
  const selectId = `crypto-select-${generatedId}`;

  const [selectedOption, setSelectedOption] =
    useState<CryptoSelectOption | null>(
      defaultValue || (options.length > 0 && !placeholder ? options[0] : null)
    );

  const selectRef = useRef<HTMLDivElement>(null);

  const { openSelectId, setOpenSelectId } = useCryptoSelectStore();
  const isOpen = openSelectId === selectId;
  const hasOptions = options.length > 0;

  useEffect(() => {
    if (selectedValue === null || selectedValue === undefined) {
      setSelectedOption(null);
      return;
    }
    const found = options.find((opt) => opt.value === selectedValue);
    if (found) {
      setSelectedOption(found);
    }
  }, [selectedValue, options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(e.target as Node) &&
        openSelectId === selectId
      ) {
        setOpenSelectId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openSelectId, selectId, setOpenSelectId]);

  const toggleDropdown = () => {
    if (!disabled && hasOptions) {
      setOpenSelectId(isOpen ? null : selectId);
    }
  };

  const handleSelect = (option: CryptoSelectOption) => {
    setSelectedOption(option);
    setOpenSelectId(null);
    if (onChange) {
      onChange(option);
    }
  };

  return (
    <div
      ref={selectRef}
      className={`custom-select ${disabled ? "disabled" : ""} ${
        !hasOptions ? "no-options" : ""
      } ${classNames.root || ""}`}
      style={{ position: "relative" }}
    >
      <div
        className={`select-input ${classNames.input || ""}`}
        onClick={disabled ? undefined : toggleDropdown}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            toggleDropdown();
          }
        }}
        role="button"
        tabIndex={disabled || !hasOptions ? -1 : 0}
        aria-expanded={isOpen}
        aria-disabled={disabled}
        aria-haspopup={hasOptions ? "listbox" : undefined}
        style={{
          padding: "16px",
          backgroundColor: "#1E1A24",
          border: "1px solid #6F5B8F",
          borderRadius: "8px",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          className="select-value"
          style={{ display: "flex", alignItems: "center", gap: "12px" }}
        >
          {selectedOption?.icon && (
            <img
              src={`/${selectedOption.icon}.png`}
              alt={selectedOption.label}
              className="option-icon"
              style={{ width: "32px", height: "32px" }}
            />
          )}
          <span
            className="option-text"
            style={{
              color: "white",
              fontSize: "18px",
              fontWeight: "600",
              fontFamily: "monospace",
            }}
          >
            {selectedOption
              ? selectedOption.label
              : placeholder || "선택하세요"}
          </span>
        </div>

        {hasOptions && (
          <div className={`select-arrow ${isOpen ? "open" : ""}`}>
            <svg
              className="select-arrow-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              style={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="white"
                fill="none"
                strokeWidth="2"
              />
            </svg>
          </div>
        )}
      </div>

      {isOpen && hasOptions && (
        <div
          className={`select-options ${classNames.dropdown || ""}`}
          role="listbox"
          style={{
            zIndex: 1000,
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "#131015",
            border: "1px solid #6F5B8F",
            borderRadius: "8px",
            maxHeight: "200px",
            overflowY: "auto",
            marginTop: "4px",
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              className={`select-option ${
                selectedOption?.value === option.value ? "selected" : ""
              } ${classNames.option || ""}`}
              onClick={() => handleSelect(option)}
              role="option"
              tabIndex={0}
              aria-selected={selectedOption?.value === option.value}
              style={{
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                backgroundColor:
                  selectedOption?.value === option.value
                    ? "#6F5B8F"
                    : "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#6F5B8F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  selectedOption?.value === option.value
                    ? "#6F5B8F"
                    : "transparent";
              }}
            >
              {option.icon && (
                <img
                  src={`/${option.icon}.png`}
                  alt={option.label}
                  className="option-icon"
                  style={{ width: "18px", height: "18px" }}
                />
              )}
              <span
                className="option-text"
                style={{
                  color: "white",
                  fontWeight: "bold",
                  fontFamily: "monospace",
                }}
              >
                {option.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {name && (
        <input type="hidden" name={name} value={selectedOption?.value || ""} />
      )}
    </div>
  );
}
