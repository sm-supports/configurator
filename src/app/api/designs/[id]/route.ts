import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { requireAuth, checkRateLimit, sanitizeInput } from '@/lib/authUtils';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `design_get_${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey, 50, 60000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return authResult.error;
    }
    const { user } = authResult;

    const { id } = await context.params;
    const designId = sanitizeInput(id);

    const { data: design, error } = await supabase
      .from('user_designs')
      .select(`
        *,
        template:plate_templates(*)
      `)
      .eq('id', designId)
      .single();

    if (error) {
      console.error('Error fetching design:', error);
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    // Check if user has access to this design
    if (design.user_id !== user.id && !design.is_public) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({ design });
  } catch (error) {
    console.error('Error in GET /api/designs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `design_put_${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey, 10, 60000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return authResult.error;
    }
    const { user } = authResult;

    const { id } = await context.params;
    const designId = sanitizeInput(id);
    const body = await request.json();
    const { design_json, name, is_public } = body;

    // Check if design exists and user owns it
    const { data: existingDesign, error: fetchError } = await supabase
      .from('user_designs')
      .select('user_id')
      .eq('id', designId)
      .single();

    if (fetchError || !existingDesign) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    if (existingDesign.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (design_json !== undefined) {
      // Validate design_json structure
      if (typeof design_json !== 'object' || !design_json.elements || !Array.isArray(design_json.elements)) {
        return NextResponse.json(
          { error: 'Invalid design_json format' },
          { status: 400 }
        );
      }
      updateData.design_json = design_json;
    }

    if (name !== undefined) {
      updateData.name = sanitizeInput(name);
    }

    if (is_public !== undefined) {
      updateData.is_public = Boolean(is_public);
    }

    const { data, error } = await supabase
      .from('user_designs')
      .update(updateData)
      .eq('id', designId)
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
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `design_delete_${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 60000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return authResult.error;
    }
    const { user } = authResult;

    const { id } = await context.params;
    const designId = sanitizeInput(id);

    // Check if design exists and user owns it
    const { data: existingDesign, error: fetchError } = await supabase
      .from('user_designs')
      .select('user_id')
      .eq('id', designId)
      .single();

    if (fetchError || !existingDesign) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    if (existingDesign.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('user_designs')
      .delete()
      .eq('id', designId);

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
