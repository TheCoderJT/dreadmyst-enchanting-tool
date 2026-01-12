'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ColorDropdown.module.css';

interface ColorDropdownOption {
  value: number;
  label: string;
  color: string;
}

interface ColorDropdownProps {
  options: ColorDropdownOption[];
  value: number;
  onChange: (value: number) => void;
  label: string;
}

export default function ColorDropdown({
  options,
  value,
  onChange,
  label,
}: ColorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <label className={styles.label}>{label}</label>
      <div className={styles.triggerWrapper}>
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span style={{ color: selectedOption?.color }}>
            {selectedOption?.label}
          </span>
          <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}>
            ▼
          </span>
        </button>

        {isOpen && (
          <ul className={styles.dropdown}>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={`${styles.option} ${option.value === value ? styles.optionSelected : ''}`}
                onClick={() => handleSelect(option.value)}
                style={{ color: option.color }}
              >
                {option.label}
              </button>
            </li>
          ))}
          </ul>
        )}
      </div>
    </div>
  );
}
