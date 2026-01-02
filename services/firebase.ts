// Mock implementation to resolve build errors in environments where firebase package is missing or incompatible

export const app = {};
export const analytics = {};
export const db = {};

// Mock database functions
export const ref = (db: any, path: string) => ({});
export const set = (ref: any, value: any) => Promise.resolve();
export const push = (ref: any, value: any) => Promise.resolve();
export const onValue = (ref: any, callback: (snapshot: any) => void) => {
    // Return unsubscribe function
    return () => {};
};
export const remove = (ref: any) => Promise.resolve();
