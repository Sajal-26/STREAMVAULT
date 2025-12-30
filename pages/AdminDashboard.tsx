import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { Shield, Server, Activity, Users, Film, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>({ totalUsers: 0, activeUsers: 0, cachedMedia: 0, serverLoad: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        try {
            const data = await api.getUsers();
            setUsers(data);
            
            // Calculate real stats from user data
            const active = data.filter((u: User) => u.status === 'Active').length;
            setStats({
                totalUsers: data.length,
                activeUsers: active,
                cachedMedia: 14029, // Placeholder until cache implementation
                serverLoad: Math.floor(Math.random() * 20) + 10
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
      if(window.confirm('Are you sure you want to ban/delete this user?')) {
          try {
              await api.deleteUser(id);
              setUsers(prev => prev.filter(u => u._id !== id));
          } catch (err) {
              alert("Failed to delete user");
          }
      }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary">Loading Admin Data...</div>;

  return (
    <div className="min-h-screen bg-background text-primary pt-24 pb-12 transition-colors duration-300">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4 mb-8">
            <Shield className="w-8 h-8 md:w-10 md:h-10 text-brand-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
             <div className="bg-surface border border-white/5 p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-secondary text-sm uppercase tracking-wider">Total Users</h3>
                    <Users className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </div>
             <div className="bg-surface border border-white/5 p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-secondary text-sm uppercase tracking-wider">Active Users</h3>
                    <Activity className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-3xl font-bold">{stats.activeUsers}</p>
            </div>
             <div className="bg-surface border border-white/5 p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-secondary text-sm uppercase tracking-wider">Cached Media</h3>
                    <Film className="w-6 h-6 text-purple-500" />
                </div>
                <p className="text-3xl font-bold">{stats.cachedMedia}</p>
            </div>
             <div className="bg-surface border border-white/5 p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-secondary text-sm uppercase tracking-wider">Server Load</h3>
                    <Server className="w-6 h-6 text-orange-500" />
                </div>
                <p className="text-3xl font-bold">{stats.serverLoad}%</p>
            </div>
        </div>

        {/* User Management Section */}
        <div className="bg-surface border border-white/5 rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-lg md:text-xl font-bold">User Management</h2>
                <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-brand-primary text-white text-xs rounded hover:opacity-90 transition">Export CSV</button>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-background/50 text-secondary text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Joined</th>
                            <th className="px-6 py-3">Last Login</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map((user) => (
                            <tr key={user._id} className="hover:bg-background/30 transition">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand-primary to-blue-600 flex items-center justify-center text-white text-xs font-bold mr-3 shadow-md">
                                            {user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{user.email}</div>
                                            <div className="text-xs text-secondary">ID: {user._id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.role === 'Admin' || user.role === 'Owner' ? 'bg-purple-500/20 text-purple-500' : 'bg-gray-500/20 text-gray-500'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.status === 'Active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-secondary">
                                    {new Date(user.joinedDate || '').toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-secondary">
                                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    {!user.isAdmin && (
                                        <button 
                                            onClick={() => handleDelete(user._id)}
                                            className="text-red-500 hover:text-red-600 transition"
                                            title="Delete User"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="px-6 py-4 border-t border-white/5 text-xs text-secondary flex justify-between">
                <span>Showing all {users.length} users</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;