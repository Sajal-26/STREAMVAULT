import { WatchlistItem, LikedItem, ContinueWatchingItem, WatchHistoryItem } from '../types';

const WATCHLIST_KEY = 'sv_guest_watchlist';
const LIKES_KEY = 'sv_guest_likes';
const CONTINUE_WATCHING_KEY = 'sv_guest_continue_watching';
const WATCH_HISTORY_KEY = 'sv_guest_watch_history';

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

    // Continue Watching Management
    getContinueWatching: (): ContinueWatchingItem[] => {
        const data = localStorage.getItem(CONTINUE_WATCHING_KEY);
        return data ? JSON.parse(data) : [];
    },

    addToContinueWatching: (item: ContinueWatchingItem): ContinueWatchingItem[] => {
        let list = api.getContinueWatching();
        // Remove existing entry for this media to bring it to top with new data
        list = list.filter(i => i.mediaId !== item.mediaId);
        const updated = [item, ...list];
        localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(updated));
        return updated;
    },

    removeFromContinueWatching: (mediaId: number): ContinueWatchingItem[] => {
        let list = api.getContinueWatching();
        const updated = list.filter(i => i.mediaId !== mediaId);
        localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(updated));
        return updated;
    },

    // Watch History Management (Completed Items)
    getWatchHistory: (): WatchHistoryItem[] => {
        const data = localStorage.getItem(WATCH_HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    },

    addToWatchHistory: (item: WatchHistoryItem): WatchHistoryItem[] => {
        let list = api.getWatchHistory();
        // Remove existing entry to bump to top
        list = list.filter(i => i.mediaId !== item.mediaId);
        const updated = [item, ...list];
        localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(updated));
        return updated;
    },

    removeFromWatchHistory: (mediaId: number): WatchHistoryItem[] => {
        let list = api.getWatchHistory();
        const updated = list.filter(i => i.mediaId !== mediaId);
        localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(updated));
        return updated;
    },

    // Clear Data (Settings)
    clearAllData: () => {
        localStorage.removeItem(WATCHLIST_KEY);
        localStorage.removeItem(LIKES_KEY);
        localStorage.removeItem(CONTINUE_WATCHING_KEY);
        localStorage.removeItem(WATCH_HISTORY_KEY);
    }
};