import { User, WatchlistItem, Device, Profile, LikedItem } from '../types';
import { AVATARS } from '../constants';

const DB_USERS_KEY = 'sv_mock_users';
const DB_OTPS_KEY = 'sv_mock_otps';

// Internal type for storage including secrets
interface StoredUser extends User {
    passwordHash: string; // Stored as base64 for mock
}

const getStoredUsers = (): StoredUser[] => {
    const data = localStorage.getItem(DB_USERS_KEY);
    return data ? JSON.parse(data) : [];
};

const saveUsers = (users: StoredUser[]) => {
    localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
};

const initDB = () => {
    const users = getStoredUsers();
    if (users.length === 0) {
        // Seed Admin
        users.push({
            _id: 'u_admin',
            id: 'u_admin',
            email: 'sajal.chitlangia2602@gmail.com',
            passwordHash: btoa('Shamballa@26'),
            isAdmin: true,
            role: 'Owner',
            status: 'Active',
            joinedDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            watchlist: [],
            likes: [],
            devices: [],
            profiles: [{
                id: 'p_admin',
                name: 'Sajal',
                avatar: AVATARS[0],
                accentColor: '#E50914',
                language: 'en'
            }]
        });
        saveUsers(users);
    }
};

export const mockBackend = {
    initialize: () => initDB(),

    sendOtp: async (email: string) => {
        await new Promise(r => setTimeout(r, 500)); // Simulate delay
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        const otps = JSON.parse(localStorage.getItem(DB_OTPS_KEY) || '{}');
        otps[email] = code;
        localStorage.setItem(DB_OTPS_KEY, JSON.stringify(otps));
        
        console.log(`%c [MOCK SERVER] OTP for ${email}: ${code} `, 'background: #222; color: #bada55; font-size: 14px; padding: 4px;');
        alert(`[MOCK SERVER] Your OTP code is: ${code}`);
        
        return { message: 'OTP sent (Mock)' };
    },

    signup: async (email: string, password: string, otp: string) => {
        await new Promise(r => setTimeout(r, 800));
        
        const otps = JSON.parse(localStorage.getItem(DB_OTPS_KEY) || '{}');
        if (otps[email] !== otp) {
            throw new Error('Invalid or expired OTP');
        }

        const users = getStoredUsers();
        if (users.find(u => u.email === email)) {
            throw new Error('User already exists');
        }

        const newUser: StoredUser = {
            _id: 'u_' + Date.now(),
            id: 'u_' + Date.now(),
            email,
            passwordHash: btoa(password),
            isAdmin: false,
            role: 'User',
            status: 'Active',
            joinedDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            watchlist: [],
            likes: [],
            devices: [],
            profiles: [{
                id: 'p_' + Date.now(),
                name: 'Main',
                avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
                accentColor: '#007AFF',
                language: 'en'
            }]
        };

        users.push(newUser);
        saveUsers(users);
        
        // Clear OTP
        delete otps[email];
        localStorage.setItem(DB_OTPS_KEY, JSON.stringify(otps));

        return { message: 'Account created', user: { email: newUser.email, id: newUser.id } };
    },

    login: async (email: string, password: string, device: Partial<Device>) => {
        await new Promise(r => setTimeout(r, 600));
        initDB(); // Ensure admin exists
        
        const users = getStoredUsers();
        const user = users.find(u => u.email === email);
        
        if (!user || user.passwordHash !== btoa(password)) {
            throw new Error('Invalid credentials');
        }

        // Handle Device
        if (device && device.deviceId) {
            const existingIdx = user.devices.findIndex(d => d.deviceId === device.deviceId);
            const fullDevice: Device = {
                deviceId: device.deviceId,
                name: device.name || 'Unknown',
                type: (device.type as any) || 'desktop',
                ip: '127.0.0.1 (Mock)',
                lastActive: new Date().toISOString(),
                isCurrent: true
            };

            if (existingIdx > -1) {
                user.devices[existingIdx] = { ...user.devices[existingIdx], ...fullDevice };
            } else {
                user.devices.push(fullDevice);
            }
        }

        user.lastLogin = new Date().toISOString();
        saveUsers(users);

        return {
            user: {
                _id: user._id,
                id: user.id,
                email: user.email,
                isAdmin: user.isAdmin,
                role: user.role,
                status: user.status,
                joinedDate: user.joinedDate,
                lastLogin: user.lastLogin,
                watchlist: user.watchlist,
                likes: user.likes || [],
                devices: user.devices,
                profiles: user.profiles
            },
            profiles: user.profiles
        };
    },

    logout: async (userId: string, deviceId: string) => {
        const users = getStoredUsers();
        const user = users.find(u => u.id === userId || u._id === userId);
        if (user) {
            user.devices = user.devices.filter(d => d.deviceId !== deviceId);
            saveUsers(users);
        }
        return { success: true };
    },

    getUsers: async (): Promise<User[]> => {
        initDB();
        return getStoredUsers().map(({ passwordHash, ...u }) => u);
    },

    deleteUser: async (id: string) => {
        let users = getStoredUsers();
        users = users.filter(u => u.id !== id && u._id !== id);
        saveUsers(users);
        return { success: true };
    },

    // Watchlist
    getWatchlist: async (userId: string) => {
        const users = getStoredUsers();
        const user = users.find(u => u.id === userId || u._id === userId);
        return user ? user.watchlist : [];
    },

    addToWatchlist: async (userId: string, item: WatchlistItem) => {
        const users = getStoredUsers();
        const user = users.find(u => u.id === userId || u._id === userId);
        if (user) {
            if (!user.watchlist.some(w => w.mediaId === item.mediaId)) {
                user.watchlist.push(item);
                saveUsers(users);
            }
            return user.watchlist;
        }
        return [];
    },

    removeFromWatchlist: async (userId: string, mediaId: number) => {
        const users = getStoredUsers();
        const user = users.find(u => u.id === userId || u._id === userId);
        if (user) {
            user.watchlist = user.watchlist.filter(w => w.mediaId !== mediaId);
            saveUsers(users);
            return user.watchlist;
        }
        return [];
    },

    // Likes
    getLikes: async (userId: string) => {
        const users = getStoredUsers();
        const user = users.find(u => u.id === userId || u._id === userId);
        return user && user.likes ? user.likes : [];
    },

    addToLikes: async (userId: string, item: LikedItem) => {
        const users = getStoredUsers();
        const user = users.find(u => u.id === userId || u._id === userId);
        if (user) {
            if (!user.likes) user.likes = [];
            if (!user.likes.some(w => w.mediaId === item.mediaId)) {
                user.likes.push(item);
                saveUsers(users);
            }
            return user.likes;
        }
        return [];
    },

    removeFromLikes: async (userId: string, mediaId: number) => {
        const users = getStoredUsers();
        const user = users.find(u => u.id === userId || u._id === userId);
        if (user) {
            if (!user.likes) user.likes = [];
            user.likes = user.likes.filter(w => w.mediaId !== mediaId);
            saveUsers(users);
            return user.likes;
        }
        return [];
    },

    // Devices
    getDevices: async (userId: string) => {
        const users = getStoredUsers();
        const user = users.find(u => u.id === userId || u._id === userId);
        return user ? user.devices : [];
    },

    removeDevice: async (userId: string, deviceId: string) => {
        const users = getStoredUsers();
        const user = users.find(u => u.id === userId || u._id === userId);
        if (user) {
            user.devices = user.devices.filter(d => d.deviceId !== deviceId);
            saveUsers(users);
            return user.devices;
        }
        return [];
    }
};