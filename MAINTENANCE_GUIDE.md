# 📚 Guía de Mantenimiento VNC Systems ERP

## Para desarrolladores y administradores

---

## 🔄 Flujo de Actualización

### Desarrollo Local
```bash
# 1. Hacer cambios en el código
# 2. Testear localmente
npm run dev

# 3. Commit de cambios
git add .
git commit -m "Descripción del cambio"

# 4. Push a GitHub (auto-deploy a Vercel)
git push
```

**Resultado:** Vercel auto-deploya en 2-5 minutos

---

## 🛠️ Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/yatdavid326-commits/vnc-erp-system.git
cd vnc-erp-system

# Instalar dependencias
npm install

# Crear archivo .env.local
# (Contacta al administrador por credenciales)

# Iniciar servidor de desarrollo
npm run dev

# Acceder a http://localhost:3000
```

---

## 📊 Variables de Entorno

### Archivo: `.env.local` (Desarrollo)
```
NEXT_PUBLIC_SUPABASE_URL=[Tu URL de Supabase]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Tu llave anon de Supabase]
SUPABASE_SERVICE_ROLE_KEY=[Tu llave de service role]
```

### En Vercel (Producción)
Se configuran automáticamente en el dashboard de Vercel.

**NO** commitear `.env.local` al repositorio.

---

## 🚀 Build y Deploy

### Build Local
```bash
npm run build
npm run start
```

### Deploy Manual (si es necesario)
```bash
# Desde la raíz del proyecto
vercel --prod
```

---

## 🔐 Usuarios y Permisos

### Crear nuevo usuario (Admin)
1. Acceder a Dashboard como admin
2. Ir a módulo de Empleados
3. Crear nuevo empleado
4. Asignar módulos
5. Crear usuario asociado

### Cambiar credenciales de admin
```bash
# En Supabase SQL Editor
UPDATE auth.users 
SET encrypted_password = crypt('NewPassword123!', gen_salt('bf'))
WHERE email = 'admin@vncsystems.com';
```

---

## 🗄️ Mantenimiento de Base de Datos

### Backup
Supabase realiza backups administrados por plataforma y el repositorio ejecuta además
un respaldo cifrado cada día a las 03:15 UTC.

Configurar estos GitHub Actions secrets:
1. `SUPABASE_DB_CONNECTION_STRING`: cadena PostgreSQL directa del proyecto.
2. `BACKUP_ENCRYPTION_PASSWORD`: clave fuerte para cifrado AES-256.

El workflow:
1. Ejecuta `pg_dump` sin propietario ni ACL.
2. Cifra el archivo con `openssl enc -aes-256-cbc -pbkdf2`.
3. Genera un checksum SHA-256.
4. Elimina el dump sin cifrar.
5. Conserva los artefactos cifrados durante 30 días.

### Restauración
Descargar el artefacto cifrado y su checksum.
Verificar el checksum localmente y descifrarlo antes de restaurar:
```
openssl enc -d -aes-256-cbc -pbkdf2 -in vnc-erp.dump.enc -out vnc-erp.dump
pg_restore --clean --if-exists --no-owner --no-acl --dbname="<CONNECTION_STRING>" vnc-erp.dump
```
Ejecutar restauraciones primero en un entorno de pruebas y validar datos críticos antes
de apuntar el ERP a la base restaurada. Mantener la conexión y la clave fuera del repositorio.

El procedimiento completo, objetivos RPO/RTO, controles de aprobación y lista de
validación están en [`docs/DISASTER_RECOVERY.md`](./docs/DISASTER_RECOVERY.md).

### Ver logs
```bash
# En Supabase Dashboard
Database → Logs → Query Performance
```

---

## 🐛 Troubleshooting

### Problema: "permission denied for table X"
**Solución:** RLS está habilitado. Verificar permisos:
```bash
# Ejecutar en Supabase SQL Editor
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name='nombre_tabla';
```

### Problema: Vercel build falla
**Solución:**
1. Verificar logs en Vercel Dashboard
2. Corregir errores de build
3. Hacer commit y push nuevamente

### Problema: Usuario no puede acceder a módulo
**Solución:**
1. Verificar tabla `user_modules`
2. Confirmar que el módulo existe en tabla `modules`
3. Asignar permiso manualmente en SQL

---

## 📈 Performance

### Monitoreo
- **Vercel Analytics:** https://vercel.com/yatdavid326-commits-projects/vnc-erp-system/analytics
- **Supabase Stats:** Dashboard → Database → Statistics

### Optimización
- Índices en PostgreSQL para queries frecuentes
- Caché en Vercel (CDN automático)
- Lazy loading de componentes

---

## 🔄 CI/CD Pipeline

El proyecto usa GitHub → Vercel auto-deploy:

```
Master Branch → GitHub Push
    ↓
Vercel Webhook (automático)
    ↓
Vercel Build & Test
    ↓
Deploy si build es exitoso
    ↓
Notificación a Slack/Email
```

---

## 📱 Comandos Útiles

```bash
# Lint código
npm run lint

# Type check
npx tsc --noEmit

# Build para producción
npm run build

# Preview build local
npm run start

# Clean cache
rm -rf .next node_modules package-lock.json
npm install

# Ver estado de repositorio
git status
git log --oneline

# Ver ramas
git branch -a

# Cambiar rama
git checkout nombre-rama
```

---

## 🚨 Emergencias

### Rollback rápido
```bash
# Ver commits recientes
git log --oneline -10

# Revertir último commit
git revert HEAD
git push

# O revertir a commit específico
git reset --hard <commit-hash>
git push --force
```

### Deshabilitar auto-deploy
1. Ir a Vercel Dashboard
2. Settings → Git
3. Desactivar "Automatic Updates"

---

## 📞 Contactos Importantes

| Servicio | Contacto | URL |
|----------|----------|-----|
| GitHub Issues | - | https://github.com/yatdavid326-commits/vnc-erp-system/issues |
| Vercel Support | - | https://vercel.com/support |
| Supabase Support | - | https://supabase.com/support |
| Autor | yatvini7@gmail.com | - |

---

## 📚 Documentación Adicional

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

---

## ✅ Checklist de Deployment

Antes de ir a producción:
- [ ] Todos los tests pasan
- [ ] No hay console.error en producción
- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada
- [ ] Backup realizado
- [ ] README actualizado
- [ ] Versión actualizada en package.json

---

**Última actualización:** 13 de Noviembre de 2026
**Versión:** 1.0.0
**Estado:** Production Ready
