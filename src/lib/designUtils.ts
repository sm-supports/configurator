import { supabase } from './supabaseClient';
import { UserDesign, DesignData } from '@/types';

export interface SaveDesignParams {
  designData: DesignData;
  templateId: string;
  name?: string;
  isPublic?: boolean;
}

export interface UpdateDesignParams {
  id: string;
  designData?: DesignData;
  name?: string;
  isPublic?: boolean;
}

/**
 * Save a new design for the current user
 */
export async function saveDesign(params: SaveDesignParams): Promise<{ design?: UserDesign; error?: string }> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { error: 'You must be logged in to save designs' };
    }

    const response = await fetch('/api/designs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        design_json: params.designData,
        template_id: params.templateId,
        name: params.name,
        is_public: params.isPublic || false,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to save design' };
    }

    return { design: result.design };
  } catch (error) {
    console.error('Error saving design:', error);
    return { error: 'Failed to save design' };
  }
}

/**
 * Update an existing design
 */
export async function updateDesign(params: UpdateDesignParams): Promise<{ design?: UserDesign; error?: string }> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { error: 'You must be logged in to update designs' };
    }

    const updateData: Record<string, unknown> = {};
    if (params.designData) updateData.design_json = params.designData;
    if (params.name !== undefined) updateData.name = params.name;
    if (params.isPublic !== undefined) updateData.is_public = params.isPublic;

    const response = await fetch(`/api/designs/${params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(updateData),
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to update design' };
    }

    return { design: result.design };
  } catch (error) {
    console.error('Error updating design:', error);
    return { error: 'Failed to update design' };
  }
}

/**
 * Delete a design
 */
export async function deleteDesign(id: string): Promise<{ error?: string }> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { error: 'You must be logged in to delete designs' };
    }

    const response = await fetch(`/api/designs/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const result = await response.json();
      return { error: result.error || 'Failed to delete design' };
    }

    return {};
  } catch (error) {
    console.error('Error deleting design:', error);
    return { error: 'Failed to delete design' };
  }
}

/**
 * Get all designs for the current user
 */
export async function getUserDesigns(): Promise<{ designs?: UserDesign[]; error?: string }> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { error: 'You must be logged in to view designs' };
    }

    const response = await fetch('/api/designs', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to fetch designs' };
    }

    return { designs: result.designs };
  } catch (error) {
    console.error('Error fetching designs:', error);
    return { error: 'Failed to fetch designs' };
  }
}

/**
 * Get a specific design by ID
 */
export async function getDesign(id: string): Promise<{ design?: UserDesign; error?: string }> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { error: 'You must be logged in to view designs' };
    }

    const response = await fetch(`/api/designs/${id}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to fetch design' };
    }

    return { design: result.design };
  } catch (error) {
    console.error('Error fetching design:', error);
    return { error: 'Failed to fetch design' };
  }
}

/**
 * Get public designs for a specific user
 */
export async function getPublicDesigns(userId: string): Promise<{ designs?: UserDesign[]; error?: string }> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { error: 'You must be logged in to view designs' };
    }

    const response = await fetch(`/api/designs?user_id=${userId}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to fetch designs' };
    }

    return { designs: result.designs };
  } catch (error) {
    console.error('Error fetching public designs:', error);
    return { error: 'Failed to fetch public designs' };
  }
}
