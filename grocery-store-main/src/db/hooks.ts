import { useState, useEffect, useCallback } from 'react';
import { dbEvents } from './sqlite';

/**
 * A custom hook to replace Dexie's useLiveQuery.
 * Takes an async function that queries the SQLite DB and returns the result.
 * Automatically re-runs when `triggerDBUpdate()` is called.
 */
export function useSQLiteQuery<T>(
    querier: () => Promise<T>,
    deps: any[] = []
): T | undefined {
    const [data, setData] = useState<T | undefined>(undefined);

    const fetchData = useCallback(async () => {
        try {
            const result = await querier();
            setData(result);
        } catch (err) {
            console.error('useSQLiteQuery Error:', err);
        }
    }, deps);

    useEffect(() => {
        // Initial fetch
        fetchData();

        // Subscribe to DB mutations
        const unsubscribe = dbEvents.subscribe(fetchData);

        return () => {
            unsubscribe();
        };
    }, [fetchData]);

    return data;
}
