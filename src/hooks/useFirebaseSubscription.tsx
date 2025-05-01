import { useEffect, useState } from "react";
import type { Unsubscribe } from "firebase/firestore";

/**
 * A custom hook to manage Firebase subscriptions with proper cleanup
 *
 * @param subscriptionFn Function that returns an unsubscribe function
 * @param deps Dependencies array that determines when to re-establish the subscription
 * @returns The unsubscribe function
 */
export const useFirebaseSubscription = (
  subscriptionFn: () => Unsubscribe,
  deps: React.DependencyList = [],
): void => {
  useEffect(() => {
    const unsubscribe = subscriptionFn();

    // Cleanup function to prevent memory leaks
    return () => {
      unsubscribe();
    };
  }, deps);
};

/**
 * A custom hook to manage Firebase data with loading and error states
 *
 * @param fetchFn Function that fetches data and returns an unsubscribe function
 * @param initialState Initial state for the data
 * @param deps Dependencies array that determines when to re-fetch
 * @returns An object containing the data, loading state, and error state
 */
export function useFirebaseQuery<T>(
  fetchFn: (
    setData: React.Dispatch<React.SetStateAction<T>>,
    setError: React.Dispatch<React.SetStateAction<Error | null>>,
  ) => Unsubscribe,
  initialState: T,
  deps: React.DependencyList = [],
) {
  const [data, setData] = useState<T>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // 데이터 설정 래퍼 함수 - 컴포넌트가 마운트된 상태에서만 상태 업데이트
    const safeSetData: React.Dispatch<React.SetStateAction<T>> = (value) => {
      if (isMounted) {
        setData(value);
        setLoading(false); // 첫 데이터 로드 시 로딩 상태 해제
      }
    };

    // 에러 설정 래퍼 함수
    const safeSetError: React.Dispatch<React.SetStateAction<Error | null>> = (
      value,
    ) => {
      if (isMounted) {
        setError(value);
        setLoading(false); // 에러 발생 시에도 로딩 상태 해제
      }
    };

    const unsubscribe = fetchFn(safeSetData, safeSetError);

    // 10초 후에도 응답이 없으면 로딩 상태 해제 (무한 로딩 방지)
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, deps);

  return { data, loading, error };
}
