import { useState, useCallback, useMemo } from 'react'
import { Validator, ValidationResult, ValidationRule } from '../utils/validation'

export interface UseFormValidationOptions {
  initialValues?: Record<string, any>
  validateOnChange?: boolean
  validateOnBlur?: boolean
  validateOnSubmit?: boolean
}

export interface UseFormValidationReturn {
  values: Record<string, any>
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValid: boolean
  isSubmitting: boolean
  setValue: (field: string, value: any) => void
  setValues: (values: Record<string, any>) => void
  setError: (field: string, error: string) => void
  setErrors: (errors: Record<string, string>) => void
  setTouched: (field: string, touched: boolean) => void
  setFieldTouched: (field: string) => void
  setAllTouched: () => void
  clearErrors: () => void
  clearFieldError: (field: string) => void
  validate: () => ValidationResult
  validateField: (field: string) => string | null
  handleChange: (field: string) => (value: any) => void
  handleBlur: (field: string) => () => void
  handleSubmit: (onSubmit: (values: Record<string, any>) => void | Promise<void>) => (e?: React.FormEvent) => Promise<void>
  reset: () => void
  resetField: (field: string) => void
  addRule: (field: string, rule: ValidationRule) => void
  removeRule: (field: string, ruleIndex: number) => void
}

export function useFormValidation(
  validator: Validator,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn {
  const {
    initialValues = {},
    validateOnChange = false,
    validateOnBlur = true,
    validateOnSubmit = true
  } = options

  const [values, setValuesState] = useState<Record<string, any>>(initialValues)
  const [errors, setErrorsState] = useState<Record<string, string>>({})
  const [touched, setTouchedState] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Memoized validation result
  const validationResult = useMemo(() => {
    return validator.validate(values)
  }, [validator, values])

  const isValid = validationResult.isValid && Object.keys(touched).length > 0

  // Set single value
  const setValue = useCallback((field: string, value: any) => {
    setValuesState(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrorsState(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }

    // Validate on change if enabled
    if (validateOnChange) {
      const fieldError = validator.validate({ [field]: value }).errors[field]
      if (fieldError) {
        setErrorsState(prev => ({
          ...prev,
          [field]: fieldError
        }))
      }
    }
  }, [errors, validateOnChange, validator])

  // Set multiple values
  const setValues = useCallback((newValues: Record<string, any>) => {
    setValuesState(newValues)
    
    // Clear all errors when values are set programmatically
    setErrorsState({})
  }, [])

  // Set single error
  const setError = useCallback((field: string, error: string) => {
    setErrorsState(prev => ({
      ...prev,
      [field]: error
    }))
  }, [])

  // Set multiple errors
  const setErrors = useCallback((newErrors: Record<string, string>) => {
    setErrorsState(newErrors)
  }, [])

  // Set touched state for single field
  const setTouched = useCallback((field: string, touchedValue: boolean) => {
    setTouchedState(prev => ({
      ...prev,
      [field]: touchedValue
    }))
  }, [])

  // Mark field as touched
  const setFieldTouched = useCallback((field: string) => {
    setTouched(field, true)
  }, [setTouched])

  // Mark all fields as touched
  const setAllTouched = useCallback(() => {
    const allFields = Object.keys(values)
    const touchedFields = allFields.reduce((acc, field) => {
      acc[field] = true
      return acc
    }, {} as Record<string, boolean>)
    setTouchedState(touchedFields)
  }, [values])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrorsState({})
  }, [])

  // Clear single field error
  const clearFieldError = useCallback((field: string) => {
    setErrorsState(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  // Validate all fields
  const validate = useCallback((): ValidationResult => {
    const result = validator.validate(values)
    setErrorsState(result.errors)
    return result
  }, [validator, values])

  // Validate single field
  const validateField = useCallback((field: string): string | null => {
    const result = validator.validate({ [field]: values[field] })
    const error = result.errors[field]
    
    if (error) {
      setError(field, error)
    } else {
      clearFieldError(field)
    }
    
    return error || null
  }, [validator, values, setError, clearFieldError])

  // Handle field change
  const handleChange = useCallback((field: string) => (value: any) => {
    setValue(field, value)
  }, [setValue])

  // Handle field blur
  const handleBlur = useCallback((field: string) => () => {
    setFieldTouched(field)
    
    if (validateOnBlur) {
      validateField(field)
    }
  }, [setFieldTouched, validateOnBlur, validateField])

  // Handle form submit
  const handleSubmit = useCallback((onSubmit: (values: Record<string, any>) => void | Promise<void>) => {
    return async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault()
      }

      setIsSubmitting(true)
      setAllTouched()

      try {
        if (validateOnSubmit) {
          const result = validate()
          if (!result.isValid) {
            return
          }
        }

        await onSubmit(values)
      } catch (error) {
        console.error('Form submission error:', error)
        // Handle submission error
        if (error instanceof Error) {
          setError('submit', error.message)
        } else {
          setError('submit', 'An unexpected error occurred')
        }
      } finally {
        setIsSubmitting(false)
      }
    }
  }, [validateOnSubmit, validate, setAllTouched, setError, values])

  // Reset form
  const reset = useCallback(() => {
    setValuesState(initialValues)
    setErrorsState({})
    setTouchedState({})
    setIsSubmitting(false)
  }, [initialValues])

  // Reset single field
  const resetField = useCallback((field: string) => {
    setValuesState(prev => ({
      ...prev,
      [field]: initialValues[field] || ''
    }))
    clearFieldError(field)
    setTouched(field, false)
  }, [initialValues, clearFieldError, setTouched])

  // Add validation rule
  const addRule = useCallback((field: string, rule: ValidationRule) => {
    validator.addRule(field, rule)
  }, [validator])

  // Remove validation rule
  const removeRule = useCallback((field: string, ruleIndex: number) => {
    // This would require modifying the Validator class to support rule removal
    // For now, we'll just log a warning
    console.warn('Rule removal not implemented yet')
  }, [])

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    setValue,
    setValues,
    setError,
    setErrors,
    setTouched,
    setFieldTouched,
    setAllTouched,
    clearErrors,
    clearFieldError,
    validate,
    validateField,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    resetField,
    addRule,
    removeRule
  }
}

// Hook for simple field validation
export function useFieldValidation(
  value: any,
  rules: ValidationRule[],
  validateOnChange: boolean = false
) {
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const validator = useMemo(() => {
    const v = new Validator()
    rules.forEach(rule => v.addRule('field', rule))
    return v
  }, [rules])

  const validate = useCallback(() => {
    const result = validator.validate({ field: value })
    const fieldError = result.errors.field
    setError(fieldError || null)
    return fieldError || null
  }, [validator, value])

  const handleChange = useCallback((newValue: any) => {
    if (validateOnChange) {
      const result = validator.validate({ field: newValue })
      const fieldError = result.errors.field
      setError(fieldError || null)
    }
  }, [validateOnChange, validator])

  const handleBlur = useCallback(() => {
    setTouched(true)
    validate()
  }, [validate])

  return {
    error,
    touched,
    validate,
    handleChange,
    handleBlur,
    setTouched
  }
}
