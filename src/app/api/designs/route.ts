import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { requireAuth, checkRateLimit, sanitizeInput } from '@/lib/authUtils';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 10 requests per minute per user
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `designs_post_${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey, 10, 60000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          }
        }
      );
    }

    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return authResult.error;
    }
    const { user } = authResult;

    const body = await request.json();
    const { design_json, template_id, name, is_public = false } = body;

    // Validate required fields
    if (!design_json || !template_id) {
      return NextResponse.json(
        { error: 'Missing required fields: design_json, template_id' },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedName = sanitizeInput(name || `Design ${new Date().toLocaleDateString()}`);

    // Validate design_json structure
    if (typeof design_json !== 'object' || !design_json.elements || !Array.isArray(design_json.elements)) {
      return NextResponse.json(
        { error: 'Invalid design_json format' },
        { status: 400 }
      );
    }

    // Save the design to the database
    const { data, error } = await supabase
      .from('user_designs')
      .insert({
        user_id: user.id,
        template_id: sanitizeInput(template_id),
        design_json,
        name: sanitizedName,
        is_public: Boolean(is_public),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error saving design:', error);
      return NextResponse.json(
        { error: 'Failed to save design' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { design: data },
      { 
        status: 201,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
        }
      }
    );
  } catch (error) {
    console.error('Error in POST /api/designs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 30 requests per minute per user
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `designs_get_${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey, 30, 60000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          }
        }
      );
    }

    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return authResult.error;
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Cap at 100
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Build query
    let query = supabase
      .from('user_designs')
      .select(`
        *,
        template:plate_templates(*)
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (userId && sanitizeInput(userId) !== user.id) {
      // Return only public designs for other users
      query = query.eq('user_id', sanitizeInput(userId)).eq('is_public', true);
    } else {
      // Return all designs for the current user
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching designs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch designs' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { designs: data || [] },
      {
        headers: {
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
        }
      }
    );
  } catch (error) {
    console.error('Error in GET /api/designs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
