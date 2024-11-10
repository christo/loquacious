import React from "react";

/**
 * Convenience alias for React useState setter function.
 */
type StateSetter<T> = (value: (((prevState: T) => T) | T)) => void;

type InputHandler = (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;

export type {StateSetter, InputHandler};