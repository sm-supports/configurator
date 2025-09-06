import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { design_json, template_id, name, is_public = false } = body;

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

    // Validate the design data
    if (!design_json || !template_id) {
      return NextResponse.json({ error: 'Missing required fields: design_json, template_id' }, { status: 400 });
    }

    // Save the design to the database
    const { data, error } = await supabase
      .from('user_designs')
      .insert({
        user_id: user.id,
        template_id,
        design_json,
        name: name || `Design ${new Date().toLocaleDateString()}`,
        is_public,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error saving design:', error);
      return NextResponse.json({ error: 'Failed to save design' }, { status: 500 });
    }

    return NextResponse.json({ design: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/designs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

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

    // If userId is provided and it's different from current user, only return public designs
    let query = supabase
      .from('user_designs')
      .select(`
        *,
        template:plate_templates(*)
      `);

    if (userId && userId !== user.id) {
      query = query.eq('user_id', userId).eq('is_public', true);
    } else {
      // Return all designs for the current user
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching designs:', error);
      return NextResponse.json({ error: 'Failed to fetch designs' }, { status: 500 });
    }

    return NextResponse.json({ designs: data || [] });
  } catch (error) {
    console.error('Error in GET /api/designs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
