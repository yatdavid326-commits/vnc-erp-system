#!/usr/bin/env python3
"""
Script para deshabilitar RLS en todas las tablas de VNC Systems ERP
Usa psycopg2 para conectarse directamente a PostgreSQL en Supabase
"""

import sys

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("ERROR: psycopg2 no está instalado")
    print("Instala con: pip install psycopg2-binary")
    sys.exit(1)

# Credenciales de Supabase
SUPABASE_URL = "jgsqzyffphikexmjnnak.supabase.co"
SUPABASE_DB = "postgres"
SUPABASE_USER = "postgres"
SUPABASE_PASSWORD = None  # Debes configurar esto
SUPABASE_PORT = 5432

# Tablas a procesar
TABLES = [
    'user_profiles',
    'modules',
    'user_modules',
    'attendance',
    'audit_logs',
    'cash_movements',
    'cash_register',
    'categories',
    'customers',
    'employees',
    'inventory',
    'inventory_movements',
    'pos_items',
    'pos_transactions',
    'purchase_items',
    'purchases',
    'suppliers',
]

def disable_rls():
    """Deshabilita RLS en todas las tablas"""
    
    # Nota: No podemos usar esto sin la contraseña de la base de datos
    # Supabase no expone la contraseña por seguridad
    print("ERROR: No se puede ejecutar SQL DDL desde Python sin la contraseña de PostgreSQL")
    print("\nSOLUCIÓN: Debes ejecutar los comandos SQL manualmente en Supabase SQL Editor")
    print("\nComandos SQL a ejecutar:")
    print("=" * 80)
    
    for table in TABLES:
        print(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY;")
    
    print("=" * 80)
    print("\nInstrucciones:")
    print("1. Ve a https://supabase.com/dashboard")
    print("2. Selecciona el proyecto 'vnc-systems-erp'")
    print("3. Ve a SQL Editor")
    print("4. Crea una nueva query (New Query)")
    print("5. Copia y pega los comandos SQL anteriores")
    print("6. Haz clic en 'Run' o presiona Ctrl+Enter")

if __name__ == '__main__':
    disable_rls()
