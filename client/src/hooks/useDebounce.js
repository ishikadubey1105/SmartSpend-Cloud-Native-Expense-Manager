import { useState, useEffect } from 'react';

/**
 * Debounce hook — delays updating a value until after a pause in input.
 * Useful for search inputs, filter queries, etc.
 */
export default function useDebounce(value, delayMs = 350) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}
