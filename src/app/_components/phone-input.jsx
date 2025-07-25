"use client";

import { useState, useEffect } from "react";
import {
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { FaChevronDown, FaSearch } from "react-icons/fa";
import * as Flags from "country-flag-icons/react/3x2";

const ARAB_COUNTRIES = [
  {
    code: "KW",
    name: "Kuwait",
    dialCode: "+965",
    format: "XXXX XXXX",
    example: "5555 1234",
    length: 8,
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    dialCode: "+966",
    format: "XX XXX XXXX",
    example: "50 123 4567",
    length: 9,
  },
  {
    code: "AE",
    name: "UAE",
    dialCode: "+971",
    format: "XX XXX XXXX",
    example: "50 123 4567",
    length: 9,
  },
  {
    code: "BH",
    name: "Bahrain",
    dialCode: "+973",
    format: "XXXX XXXX",
    example: "3300 0000",
    length: 8,
  },
  {
    code: "QA",
    name: "Qatar",
    dialCode: "+974",
    format: "XXXX XXXX",
    example: "3300 0000",
    length: 8,
  },
  {
    code: "OM",
    name: "Oman",
    dialCode: "+968",
    format: "XXXX XXXX",
    example: "9300 0000",
    length: 8,
  },
  {
    code: "EG",
    name: "Egypt",
    dialCode: "+20",
    format: "XXX XXX XXXX",
    example: "100 123 4567",
    length: 10,
  },
  {
    code: "JO",
    name: "Jordan",
    dialCode: "+962",
    format: "X XXXX XXXX",
    example: "7 9012 3456",
    length: 9,
  },
  {
    code: "LB",
    name: "Lebanon",
    dialCode: "+961",
    format: "XX XXX XXX",
    example: "71 123 456",
    length: 8,
  },
  {
    code: "IQ",
    name: "Iraq",
    dialCode: "+964",
    format: "XXX XXX XXXX",
    example: "790 123 4567",
    length: 10,
  },
  {
    code: "YE",
    name: "Yemen",
    dialCode: "+967",
    format: "XXX XXX XXX",
    example: "700 123 456",
    length: 9,
  },
];

export default function PhoneInput({
  value = "",
  onChange,
  label,
  isRequired,
  errorMessage,
  isInvalid,
}) {
  const [selectedCountry, setSelectedCountry] = useState(ARAB_COUNTRIES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [localNumber, setLocalNumber] = useState("");

  useEffect(() => {
    // When external value changes, try to parse it
    if (value && value !== localNumber) {
      const country = ARAB_COUNTRIES.find((c) => value.startsWith(c.dialCode));

      if (country) {
        setSelectedCountry(country);
        setLocalNumber(value.slice(country.dialCode.length));
      } else {
        setLocalNumber(value);
      }
    }
  }, [value]);

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    const newNumber = country.dialCode + localNumber;

    onChange?.(newNumber);
  };

  const formatPhoneNumber = (number, format) => {
    if (!number) return "";
    let formatted = format;
    let numberIndex = 0;

    for (let i = 0; i < format.length && numberIndex < number.length; i++) {
      if (format[i] === "X") {
        formatted =
          formatted.substring(0, i) +
          number[numberIndex] +
          formatted.substring(i + 1);
        numberIndex++;
      }
    }

    // Remove any remaining X placeholders
    return formatted.replace(/X/g, " ").trim();
  };

  const handleNumberChange = (e) => {
    const rawInput = e.target.value.replace(/\D/g, "");

    // Limit input length based on country format
    const truncatedInput = rawInput.slice(0, selectedCountry.length);

    setLocalNumber(truncatedInput);
    const newNumber = selectedCountry.dialCode + truncatedInput;

    onChange?.(newNumber);
  };

  const filteredCountries = ARAB_COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery)
  );

  const renderFlag = (countryCode) => {
    const Flag = Flags[countryCode];

    return Flag ? <Flag className="w-6 h-4 rounded-sm" /> : null;
  };

  return (
    <div className="relative">
      <Input
        classNames={{
          label: "text-default-600",
          input: "text-default-600",
          inputWrapper: "focus-within:border-[#C96346]",
        }}
        description={`Example: ${selectedCountry.example}`}
        errorMessage={errorMessage}
        isInvalid={isInvalid}
        isRequired={isRequired}
        label={label}
        placeholder={selectedCountry.format}
        startContent={
          <Dropdown>
            <DropdownTrigger>
              <div className="flex items-center gap-1 cursor-pointer select-none">
                {renderFlag(selectedCountry.code)}
                <span className="text-sm text-default-600">
                  {selectedCountry.dialCode}
                </span>
                <FaChevronDown className="text-xs text-default-400" />
              </div>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Country selection"
              className="min-w-[240px]"
              onAction={(key) => {
                const country = ARAB_COUNTRIES.find((c) => c.code === key);

                if (country) handleCountrySelect(country);
              }}
            >
              <DropdownItem key="search" className="h-auto p-0">
                <Input
                  classNames={{
                    input: "text-small",
                  }}
                  placeholder="Search country..."
                  startContent={<FaSearch className="text-default-400" />}
                  value={searchQuery}
                  variant="bordered"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </DropdownItem>
              {filteredCountries.map((country) => (
                <DropdownItem
                  key={country.code}
                  description={country.dialCode}
                  startContent={renderFlag(country.code)}
                >
                  {country.name}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        }
        type="tel"
        value={formatPhoneNumber(localNumber, selectedCountry.format)}
        variant="bordered"
        onChange={handleNumberChange}
      />
    </div>
  );
}
