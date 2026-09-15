import { useCallback, useContext, useEffect, useState, type DependencyList } from 'react';
import { InitialDataContext } from '../components/InitialDataContext';

type AsyncState<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
};

export function useAsync<T>(factory: () => Promise<T>, dependencies: DependencyList, key?: string): AsyncState<T> {
  const initial = useContext(InitialDataContext);
  const seeded = key !== undefined && Object.hasOwn(initial, key);
  const [data, setData] = useState<T | null>(() => seeded ? initial[key!] as T : null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!seeded);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    // Revalidate pre-rendered data without replacing the first paint with a spinner.
    setLoading(!seeded || version > 0);
    setError(null);
    factory()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason : new Error('데이터를 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, key, version]);

  return { data, error, loading, reload };
}
