"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserDesigns, deleteDesign } from '@/lib/designUtils';
import { UserDesign } from '@/types';
import Link from 'next/link';
import { Trash2, Edit } from 'lucide-react';
import LoadingSpinner from '@/components/UI/LoadingSpinner';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [designs, setDesigns] = useState<UserDesign[]>([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      loadUserDesigns();
    } else if (!loading && !user) {
      setLoadingDesigns(false);
    }
  }, [user, loading]);

  const loadUserDesigns = async () => {
    setLoadingDesigns(true);
    setError(null);
    
    const result = await getUserDesigns();
    if (result.error) {
      setError(result.error);
    } else {
      setDesigns(result.designs || []);
    }
    
    setLoadingDesigns(false);
  };

  const handleDeleteDesign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) {
      return;
    }

    setDeletingId(id);
    const result = await deleteDesign(id);
    
    if (result.error) {
      setError(result.error);
    } else {
      setDesigns(prev => prev.filter(design => design.id !== id));
    }
    
    setDeletingId(null);
  };

  if (loading || loadingDesigns) {
    return <LoadingSpinner message="Loading your designs..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to view your designs.</p>
          <Link 
            href="/login"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Designs</h1>
          <p className="text-gray-600 mt-2">
            Manage your saved license plate designs
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={loadUserDesigns}
              className="mt-2 text-red-700 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {designs.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No designs yet</h3>
              <p className="text-gray-500 mb-6">
                Start creating your first license plate design!
              </p>
              <Link 
                href="/templates"
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors inline-block"
              >
                Browse Templates
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {designs.map((design) => (
              <div key={design.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {design.name}
                    </h3>
                    <div className="flex gap-1 ml-2">
                      {design.is_public && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Public
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 mb-4 space-y-1">
                    <p>Template: {design.template?.name || 'Unknown'}</p>
                    <p>Created: {new Date(design.created_at).toLocaleDateString()}</p>
                    <p>Elements: {design.design_json?.elements?.length || 0}</p>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/editor/${design.template_id}?design=${design.id}`}
                      className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-center text-sm flex items-center justify-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    
                    <button
                      onClick={() => handleDeleteDesign(design.id)}
                      disabled={deletingId === design.id}
                      className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      title="Delete design"
                    >
                      {deletingId === design.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link 
            href="/templates"
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors inline-block"
          >
            Create New Design
          </Link>
        </div>
      </div>
    </div>
  );
}
