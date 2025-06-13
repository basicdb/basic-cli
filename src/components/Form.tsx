import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface FormField {
  name: string;
  label: string;
  type: 'text';
  required?: boolean;
  placeholder?: string;
}

export interface FormProps {
  title: string;
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => void | Promise<void>;
  onCancel: () => void;
}

export function Form({ title, fields, onSubmit, onCancel }: FormProps) {
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentField = fields[currentFieldIndex];
  const currentValue = formData[currentField.name] || '';

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      // Validate current field
      if (currentField.required && !currentValue.trim()) {
        setErrors(prev => ({
          ...prev,
          [currentField.name]: `${currentField.label} is required`
        }));
        return;
      }

      // Clear error for this field
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[currentField.name];
        return newErrors;
      });

      // Move to next field or submit
      if (currentFieldIndex < fields.length - 1) {
        setCurrentFieldIndex(prev => prev + 1);
      } else {
        // All fields completed, submit form
        const result = onSubmit(formData);
        // Handle both sync and async onSubmit
        if (result instanceof Promise) {
          result.catch(console.error);
        }
      }
      return;
    }

    if (key.backspace || key.delete) {
      setFormData(prev => ({
        ...prev,
        [currentField.name]: currentValue.slice(0, -1)
      }));
      return;
    }

    // Add character to current field
    if (input && input.length === 1) {
      setFormData(prev => ({
        ...prev,
        [currentField.name]: currentValue + input
      }));
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={2}>
        <Text bold color="blue">{title}</Text>
      </Box>

      {fields.map((field, index) => {
        const isActive = index === currentFieldIndex;
        const value = formData[field.name] || '';
        const error = errors[field.name];
        const isCompleted = index < currentFieldIndex || (index === currentFieldIndex && value.trim());

        return (
          <Box key={field.name} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color={isCompleted ? 'green' : isActive ? 'blue' : 'gray'}>
                {isCompleted ? '✓' : isActive ? '>' : ' '} {field.label}:
              </Text>
            </Box>
            <Box marginLeft={2}>
              <Text>
                {isActive ? (
                  <>
                    {value}
                    <Text backgroundColor="white" color="black">█</Text>
                  </>
                ) : (
                  value || (field.placeholder && index > currentFieldIndex ? `(${field.placeholder})` : '')
                )}
              </Text>
            </Box>
            {error && (
              <Box marginLeft={2} marginTop={0}>
                <Text color="red">Error: {error}</Text>
              </Box>
            )}
          </Box>
        );
      })}

      <Box marginTop={2}>
        <Text color="gray">
          {currentFieldIndex < fields.length - 1 
            ? 'Enter to continue • esc to cancel'
            : 'Enter to submit • esc to cancel'
          }
        </Text>
      </Box>
    </Box>
  );
} 