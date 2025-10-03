"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getUserDesigns, deleteDesign as deleteDesignUtil } from '@/lib/designUtils';
import { UserDesign } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, Download, Share2 } from 'lucide-react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import LoadingSpinner from '@/components/UI/LoadingSpinner';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [designs, setDesigns] = useState<UserDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserDesigns();
    }
  }, [user]);

  const fetchUserDesigns = async () => {
    setLoading(true);
    const result = await getUserDesigns();
    if (!result.error) {
      setDesigns(result.designs || []);
    }
    setLoading(false);
  };

  const filteredDesigns = designs.filter(design => {
    if (filter === 'all') return true;
    if (filter === 'public') return design.is_public ?? false;
    if (filter === 'private') return !(design.is_public ?? false);
    return true;
  });

  const handleDeleteDesign = async (designId: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    setDeletingId(designId);
    const result = await deleteDesignUtil(designId);
    
    if (!result.error) {
      setDesigns(prev => prev.filter(d => d.id !== designId));
    }
    
    setDeletingId(null);
  };

  const togglePublic = async (designId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_designs')
        .update({ is_public: !currentStatus })
        .eq('id', designId);

      if (!error) {
        setDesigns(prev =>
          prev.map(d =>
            d.id === designId ? { ...d, is_public: !currentStatus } : d
          )
        );
      }
    } catch (error) {
      console.error('Error updating design visibility:', error);
    }
  };

  const exportDesign = (design: UserDesign) => {
    const dataStr = JSON.stringify(design.design_json, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `${design.name || 'design'}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return <LoadingSpinner message="Loading your designs..." />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Actions */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-4">
              <Link
                href="/templates"
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Design</span>
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Admin Panel</span>
              </Link>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Designs</h1>
            <p className="text-gray-600">
              View and manage your saved license plate designs
            </p>
          </div>

          {/* Stats and Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{designs.length}</div>
                  <div className="text-sm text-gray-600">Total Designs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {designs.filter(d => d.is_public ?? false).length}
                  </div>
                  <div className="text-sm text-gray-600">Public</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/templates"
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New Design
                </Link>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All Designs' },
                  { key: 'public', label: 'Public' },
                  { key: 'private', label: 'Private' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as 'public' | 'private')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filter === key
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Designs Grid */}
          {filteredDesigns.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Plus className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No designs found</h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all'
                  ? "You haven't created any designs yet."
                  : `You don't have any ${filter} designs.`
                }
              </p>
              <Link
                href="/templates"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Your First Design
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDesigns.map((design) => (
                <div
                  key={design.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Design Preview */}
                  <div className="aspect-video bg-gray-100 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <div className="w-16 h-16 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Edit className="w-8 h-8" />
                        </div>
                        <p className="text-sm">Design Preview</p>
                      </div>
                    </div>
                    {design.is_public && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Public
                      </div>
                    )}
                  </div>

                  {/* Design Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {design.name || 'Untitled Design'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {design.template?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Updated {new Date(design.updated_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/editor/${design.template_id}?design=${design.id}`)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit design"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => exportDesign(design)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Export design"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => togglePublic(design.id, design.is_public ?? false)}
                          className={`p-2 rounded-lg transition-colors ${
                            design.is_public
                              ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
                          }`}
                          title={(design.is_public ?? false) ? 'Make private' : 'Make public'}
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteDesign(design.id)}
                        disabled={deletingId === design.id}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete design"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
