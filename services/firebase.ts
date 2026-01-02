// Mock implementation to resolve build errors in environments where firebase package is missing or incompatible

export const app = {};
export const analytics = {};
export const db = {};

// Mock database functions
export const ref = (_db: any, _path: string) => ({});
export const set = (_ref: any, _value: any) => Promise.resolve();
export const push = (_ref: any, _value: any) => Promise.resolve();
export const onValue = (_ref: any, _callback: (snapshot: any) => void) => {
    // Return unsubscribe function
    return () => {};
};
export const remove = (_ref: any) => Promise.resolve();
