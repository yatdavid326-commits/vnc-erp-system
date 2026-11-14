import { NextResponse } from 'next/server';

async function createAdmin() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase credentials');
    }

    console.log('🔄 Step 1: Disabling RLS on tables...');
    
    // First, disable RLS on the tables to allow operations
    const disableRlsStatements = [
      'ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.modules DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.user_modules DISABLE ROW LEVEL SECURITY;',
    ];

    for (const statement of disableRlsStatements) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
          body: JSON.stringify({ sql: statement }),
        });

        if (!response.ok) {
          console.log(`⚠️ Could not disable RLS via RPC, continuing...`);
        } else {
          console.log(`✅ Disabled RLS: ${statement}`);
        }
      } catch (err) {
        console.log(`⚠️ RPC not available, continuing with RLS enabled...`);
      }
    }

    console.log('🔄 Step 2: Setting up auth...');
    
    // Create auth user via Supabase Auth API
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        email: 'admin@vncsystems.com',
        password: 'Admin@12345678',
        email_confirm: true,
        user_metadata: {
          username: 'admin',
        },
      }),
    });

    let adminUserId: string;

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      const errorMessage = JSON.stringify(errorData);
      if (errorData.error_code === 'email_exists' || errorData.msg?.includes('already') || errorMessage.includes('already')) {
        console.log('✅ Admin user already exists in Auth, fetching ID...');
        // Try to get the existing user
        const listResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        });
        const listData = await listResponse.json();
        const user = listData.users?.find((u: any) => u.email === 'admin@vncsystems.com');
        if (!user) {
          console.log('Users found:', listData.users?.map((u: any) => u.email));
          throw new Error(`Could not find admin user. ${errorMessage}`);
        }
        adminUserId = user.id;
        console.log(`✅ Found admin user with ID: ${adminUserId}`);
      } else {
        throw new Error(`Auth error: ${errorMessage}`);
      }
    } else {
      const authData = await authResponse.json();
      adminUserId = authData.user.id;
      console.log('✅ Created Supabase Auth user');
    }

    console.log('🔄 Step 3: Creating user profile...');
    
    // Create user profile via REST API
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        auth_id: adminUserId,
        email: 'admin@vncsystems.com',
        username: 'admin',
        full_name: 'Administrador',
        role: 'admin',
        is_active: true,
      }),
    });

    let profileId: string;

    if (!profileResponse.ok) {
      const errorData = await profileResponse.json();
      console.log('⚠️ Could not create profile, trying to fetch existing...');
      
      // Try to get the existing profile
      const getResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?auth_id=eq.${adminUserId}&select=id`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        }
      );
      const getProfiles = await getResponse.json();
      if (!Array.isArray(getProfiles) || getProfiles.length === 0) {
        throw new Error(`Profile creation failed: ${JSON.stringify(errorData)}`);
      }
      profileId = getProfiles[0].id;
      console.log('✅ Found existing user profile');
    } else {
      const profileData = await profileResponse.json();
      profileId = profileData[0]?.id;
      console.log('✅ Created user profile');
    }

    console.log('🔄 Step 4: Getting modules...');
    
    // Get all modules
    const modulesResponse = await fetch(`${supabaseUrl}/rest/v1/modules?select=id`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
    });

    const modules = await modulesResponse.json();

    if (!Array.isArray(modules) || modules.length === 0) {
      console.log('⚠️ No modules found');
      return NextResponse.json({
        success: true,
        message: 'Admin user created but no modules found',
      });
    }

    console.log('🔄 Step 5: Assigning modules...');
    
    // Assign all modules to admin user
    const assignments = modules.map((m: any) => ({
      user_id: profileId,
      module_id: m.id,
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
    }));

    const assignResponse = await fetch(`${supabaseUrl}/rest/v1/user_modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify(assignments),
    });

    if (!assignResponse.ok) {
      const errorData = await assignResponse.json();
      console.log('⚠️ Module assignment may have had issues:', errorData);
    }

    console.log(`✅ Assigned ${modules.length} modules to admin user`);

    return NextResponse.json({
      success: true,
      message: 'Admin user setup complete',
      adminUser: {
        id: adminUserId,
        email: 'admin@vncsystems.com',
        username: 'admin',
        password: 'Admin@12345678',
      },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return createAdmin();
}

export async function POST() {
  return createAdmin();
}
