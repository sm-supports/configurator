import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // Get the current user from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get the design with template information
    const { data, error } = await supabase
      .from('user_designs')
      .select(`
        *,
        template:plate_templates(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching design:', error);
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    // Check if user has access to this design
    if (data.user_id !== user.id && !data.is_public) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ design: data });
  } catch (error) {
    console.error('Error in GET /api/designs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { design_json, name, is_public } = body;

    // Get the current user from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // First check if the design exists and belongs to the user
    const { data: existingDesign, error: fetchError } = await supabase
      .from('user_designs')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingDesign) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    if (existingDesign.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update the design
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (design_json) updateData.design_json = design_json;
    if (name !== undefined) updateData.name = name;
    if (is_public !== undefined) updateData.is_public = is_public;

    const { data, error } = await supabase
      .from('user_designs')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating design:', error);
      return NextResponse.json({ error: 'Failed to update design' }, { status: 500 });
    }

    return NextResponse.json({ design: data });
  } catch (error) {
    console.error('Error in PUT /api/designs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // Get the current user from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // First check if the design exists and belongs to the user
    const { data: existingDesign, error: fetchError } = await supabase
      .from('user_designs')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingDesign) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    if (existingDesign.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the design
    const { error } = await supabase
      .from('user_designs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting design:', error);
      return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Design deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/designs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
