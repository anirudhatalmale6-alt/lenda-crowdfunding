import { z } from 'zod';

/**
 * Validation utility functions
 */

/**
 * Validates data against a Zod schema
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {Object} data - The data to validate
 * @returns {{ success: boolean, data?: Object, errors?: Object }}
 */
export const validate = (schema, data) => {
    try {
        const validatedData = schema.parse(data);
        return {
            success: true,
            data: validatedData,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = {};
            error.errors.forEach((err) => {
                const path = err.path.join('.');
                errors[path] = err.message;
            });
            return {
                success: false,
                errors,
            };
        }
        return {
            success: false,
            errors: { _form: 'An unexpected validation error occurred' },
        };
    }
};

/**
 * Validates data and returns field-level errors
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {Object} data - The data to validate
 * @returns {Object} - Object with field names as keys and error messages as values
 */
export const validateForm = (schema, data) => {
    const result = validate(schema, data);
    return result.success ? {} : result.errors;
};

/**
 * Creates a form validation hook helper
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @returns {Object} - { validate, getFieldProps, clearErrors }
 */
export const createFormValidator = (schema) => ({
    validate: (data) => validate(schema, data),
    validateField: (fieldName, value) => {
        try {
            // Create a partial schema for single field validation
            const fieldSchema = schema.shape[fieldName];
            if (!fieldSchema) {
                return { success: true };
            }
            fieldSchema.parse(value);
            return { success: true };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    success: false,
                    error: error.errors[0]?.message || 'Invalid value',
                };
            }
            return { success: false, error: 'Validation error' };
        }
    },
    validateForm: (data) => validateForm(schema, data),
});

/**
 * Common validation patterns
 */
export const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    ethereumAddress: /^0x[a-fA-F0-9]{40}$/,
    phone: /^\+?[1-9]\d{1,14}$/,
    url: /^https?:\/\/.+/,
};

/**
 * Error message helpers
 */
export const getErrorMessage = (errors, field) => {
    if (!errors) return null;
    return errors[field] || errors[field.replace(/(\w+)\.(\w+)/, '$2')] || null;
};

/**
 * Has any validation errors
 */
export const hasErrors = (errors) => {
    if (!errors || typeof errors !== 'object') return false;
    return Object.keys(errors).length > 0;
};

// Re-export all schemas
export * from './authValidation';
export * from './loanEscrowValidation';
