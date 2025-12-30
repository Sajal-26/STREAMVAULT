import { WatchlistItem, LikedItem, User } from '../types';
import { mockBackend } from './mockBackend';
import { USE_MOCK_BACKEND } from '../constants';

const WATCHLIST_KEY = 'sv_guest_watchlist';
const LIKES_KEY = 'sv_guest_likes';

export const api = {
    // Watchlist Management
    getWatchlist: (): WatchlistItem[] => {
        const data = localStorage.getItem(WATCHLIST_KEY);
        return data ? JSON.parse(data) : [];
    },

    addToWatchlist: (item: WatchlistItem): WatchlistItem[] => {
        const list = api.getWatchlist();
        if (!list.some(i => i.mediaId === item.mediaId)) {
            const updated = [item, ...list];
            localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
            return updated;
        }
        return list;
    },

    removeFromWatchlist: (mediaId: number): WatchlistItem[] => {
        const list = api.getWatchlist();
        const updated = list.filter(i => i.mediaId !== mediaId);
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
        return updated;
    },

    // Likes Management
    getLikes: (): LikedItem[] => {
        const data = localStorage.getItem(LIKES_KEY);
        return data ? JSON.parse(data) : [];
    },

    addToLikes: (item: LikedItem): LikedItem[] => {
        const list = api.getLikes();
        if (!list.some(i => i.mediaId === item.mediaId)) {
            const updated = [item, ...list];
            localStorage.setItem(LIKES_KEY, JSON.stringify(updated));
            return updated;
        }
        return list;
    },

    removeFromLikes: (mediaId: number): LikedItem[] => {
        const list = api.getLikes();
        const updated = list.filter(i => i.mediaId !== mediaId);
        localStorage.setItem(LIKES_KEY, JSON.stringify(updated));
        return updated;
    },

    // Clear Data (Settings)
    clearAllData: () => {
        localStorage.removeItem(WATCHLIST_KEY);
        localStorage.removeItem(LIKES_KEY);
    },

    // User Management (Admin)
    getUsers: async (): Promise<User[]> => {
        if (USE_MOCK_BACKEND) {
             return mockBackend.getUsers();
        }
        return [];
    },

    deleteUser: async (id: string): Promise<any> => {
        if (USE_MOCK_BACKEND) {
            return mockBackend.deleteUser(id);
        }
        return { success: false };
    }
};