import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { modulePermissionSchema } from '@/lib/validation/requestSchemas';
import { writeAuditEvent } from '@/lib/services/audit/auditService';
import { getAuthenticatedProfileIdentity } from '@/lib/auth/getAuthenticatedProfileId';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const [usersResult, modulesResult] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, email, role, is_active')
        .eq('is_active', true)
        .order('full_name', { ascending: true }),
      supabaseAdmin
        .from('modules')
        .select('id, name, display_name, is_active, order_index')
        .eq('is_active', true)
        .order('order_index', { ascending: true }),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (modulesResult.error) throw modulesResult.error;

    let permissions: {
      user_id: string;
      module_id: string;
      can_view: boolean;
      can_create: boolean;
      can_edit: boolean;
      can_delete: boolean;
    }[] = [];

    if (usersResult.data.length > 0 && modulesResult.data.length > 0) {
      const permissionsResult = await supabaseAdmin
        .from('user_modules')
        .select('user_id, module_id, can_view, can_create, can_edit, can_delete')
        .in(
          'user_id',
          usersResult.data.map((user) => user.id)
        )
        .in(
          'module_id',
          modulesResult.data.map((module) => module.id)
        );

      if (permissionsResult.error) throw permissionsResult.error;
      permissions = permissionsResult.data ?? [];
    }

    return NextResponse.json({
      users: usersResult.data,
      modules: modulesResult.data,
      permissions,
    });
  } catch (error) {
    console.error('Error loading admin permissions:', error);
    return NextResponse.json(
      { error: 'No se pudieron cargar los usuarios y permisos.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const parsedBody = await validateRequestBody(request, modulePermissionSchema);
  if (!parsedBody.success) return parsedBody.response;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const {
    user_id: userId,
    module_id: moduleId,
    can_view: canView,
    can_create: canCreate,
    can_edit: canEdit,
    can_delete: canDelete,
  } = parsedBody.data;

  try {
    const actor = await getAuthenticatedProfileIdentity(request);
    const [userResult, moduleResult] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select('id, role, is_active')
        .eq('id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('modules')
        .select('id')
        .eq('id', moduleId)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    if (userResult.error) throw userResult.error;
    if (moduleResult.error) throw moduleResult.error;
    if (!userResult.data) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }
    if (!userResult.data.is_active) {
      return NextResponse.json(
        { error: 'No se pueden cambiar permisos de un usuario inactivo.' },
        { status: 409 }
      );
    }
    if (userResult.data.role === 'admin') {
      return NextResponse.json(
        { error: 'Los administradores tienen acceso total por rol.' },
        { status: 409 }
      );
    }
    if (!moduleResult.data) {
      return NextResponse.json(
        { error: 'Módulo no encontrado o inactivo.' },
        { status: 404 }
      );
    }

    if (!canView && !canCreate && !canEdit && !canDelete) {
      const { error } = await supabaseAdmin
        .from('user_modules')
        .delete()
        .eq('user_id', userId)
        .eq('module_id', moduleId);

      if (error) throw error;
      await writeAuditEvent(actor.id, {
        action: 'DELETE_USER_MODULE_PERMISSION',
        tableName: 'user_modules',
        recordId: null,
        oldValues: {
          user_id: userId,
          module_id: moduleId,
        },
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      });
      return NextResponse.json({ permission: null });
    }

    const { data, error } = await supabaseAdmin
      .from('user_modules')
      .upsert(
        {
          user_id: userId,
          module_id: moduleId,
          can_view: canView,
          can_create: canCreate,
          can_edit: canEdit,
          can_delete: canDelete,
        },
        { onConflict: 'user_id,module_id' }
      )
      .select('user_id, module_id, can_view, can_create, can_edit, can_delete')
      .single();

    if (error) throw error;
    await writeAuditEvent(actor.id, {
      action: 'UPSERT_USER_MODULE_PERMISSION',
      tableName: 'user_modules',
      recordId: null,
      oldValues: {
        user_id: userId,
        module_id: moduleId,
      },
      newValues: data,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    });
    return NextResponse.json({ permission: data });
  } catch (error) {
    console.error('Error updating module permissions:', error);
    return NextResponse.json(
      { error: 'No se pudieron guardar los permisos.' },
      { status: 500 }
    );
  }
}
