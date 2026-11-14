import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VNC ERP - Instalación Requerida</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 800px;
            width: 100%;
            padding: 40px;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .success {
            background: #d4edda;
            border: 1px solid #28a745;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #155724;
        }
        .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #721c24;
        }
        .sql-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.5;
        }
        .sql-box code {
            color: #0066cc;
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        .btn-secondary:hover {
            background: #5a6268;
        }
        .step {
            margin: 20px 0;
            padding: 15px;
            border-left: 4px solid #667eea;
            background: #f8f9ff;
        }
        .step-number {
            display: inline-block;
            background: #667eea;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            text-align: center;
            line-height: 30px;
            font-weight: bold;
            margin-right: 10px;
        }
        .credentials {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
        }
        .credentials-item {
            margin: 10px 0;
        }
        .credentials-label {
            font-weight: bold;
            color: #333;
        }
        .credentials-value {
            color: #0066cc;
            user-select: all;
        }
        .copy-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-left: 5px;
        }
        .copy-btn:hover {
            background: #5568d3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 VNC ERP - Instalación en Progreso</h1>
        
        <div class="error">
            <strong>❌ Acción Requerida:</strong> Para que el sistema funcione, necesitas ejecutar algunos comandos SQL en Supabase.
        </div>

        <h2>Paso 1: Abre el SQL Editor de Supabase</h2>
        <div class="step">
            <p>Haz click en el botón de abajo para abrir el SQL Editor:</p>
            <div class="button-group">
                <a href="https://supabase.com/dashboard/project/jgsqzyffphikexmjnnak/sql/new" class="btn btn-primary" target="_blank">
                    🚀 Abrir SQL Editor
                </a>
            </div>
        </div>

        <h2>Paso 2: Copia y pega los comandos SQL</h2>
        <div class="step">
            <p>Copia TODO el código de abajo:</p>
            <div class="sql-box">
<code>-- Grant permissions to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_modules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_register TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO service_role;</code>
            </div>
            <button class="copy-btn" onclick="copySql()">📋 Copiar SQL</button>
        </div>

        <h2>Paso 3: Ejecuta en Supabase</h2>
        <div class="step">
            <ol>
                <li>Pega el código en el SQL Editor (Ctrl+V)</li>
                <li>Haz click en el botón verde <strong>"Run"</strong> en la esquina superior derecha</li>
                <li>O presiona <strong>Ctrl + Intro</strong></li>
                <li>Espera a que veas "Success" con un checkmark verde ✅</li>
            </ol>
        </div>

        <h2>Paso 4: Vuelve a esta aplicación</h2>
        <div class="step">
            <p>Una vez ejecutado el SQL, regresa aquí y:</p>
            <div class="button-group">
                <button class="btn btn-primary" onclick="location.reload()">🔄 Refrescar página</button>
                <a href="/login" class="btn btn-secondary">🔑 Ir al Login</a>
            </div>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 2px solid #ddd;">

        <h2>📝 Credenciales de Acceso</h2>
        <div class="credentials">
            <div class="credentials-item">
                <span class="credentials-label">Usuario:</span>
                <span class="credentials-value">admin</span>
                <button class="copy-btn" onclick="copyText('admin')">Copiar</button>
            </div>
            <div class="credentials-item">
                <span class="credentials-label">Contraseña:</span>
                <span class="credentials-value">Admin@12345678</span>
                <button class="copy-btn" onclick="copyText('Admin@12345678')">Copiar</button>
            </div>
        </div>

        <div class="success">
            <strong>✅ Después de ejecutar el SQL:</strong> El sistema estará listo para usar con las credenciales de arriba.
        </div>
    </div>

    <script>
        function copySql() {
            const sql = \`-- Grant permissions to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_modules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_register TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO service_role;\`;
            navigator.clipboard.writeText(sql).then(() => {
                alert('✅ SQL copiado al portapapeles');
            });
        }
        
        function copyText(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('✅ Copiado: ' + text);
            });
        }
    </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
