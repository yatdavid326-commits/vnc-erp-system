# Guía de usuario

## Inicio de sesión

1. Abre `/login`.
2. Introduce tu usuario y contraseña.
3. Si tu cuenta usa MFA, introduce el código de seis dígitos del autenticador.
4. Después del ingreso, usa el menú lateral para abrir los módulos autorizados.

Si olvidaste la contraseña, selecciona “¿Olvidaste tu contraseña?” y usa el enlace
enviado a tu correo.

## Permisos

Cada usuario puede tener permisos distintos por módulo:

- Ver.
- Crear.
- Editar.
- Eliminar.

Si una acción no aparece o devuelve acceso denegado, solicita al administrador que
revise los permisos en **Administración → Permisos**.

## Clientes

- Busca por nombre, correo o datos configurados.
- Crea o edita desde el botón correspondiente.
- Usa el detalle de crédito para consultar saldo y movimientos.
- La eliminación está protegida por confirmación y puede rechazarse si existen ventas
  o registros relacionados.

## Inventario

- Consulta productos y filtros de bajo stock.
- Crea, edita o desactiva productos.
- Registra movimientos de entrada o salida desde **Stock**.
- Los movimientos negativos no deben dejar existencias menores que cero.

## Proveedores

- Mantén nombre, correo, teléfono y datos de contacto actualizados.
- Un proveedor asociado a órdenes de compra no puede eliminarse hasta retirar o
  corregir las relaciones.

## Compras y recepciones

1. Crea una orden indicando proveedor, fecha y productos.
2. Revisa el total antes de confirmar.
3. Recibe cantidades completas o parciales.
4. No registres una recepción dos veces: usa el identificador de intento disponible.
5. Anula únicamente órdenes pendientes sin recepciones.

## Punto de venta y caja

- Abre una caja antes de registrar movimientos.
- Selecciona método de pago y cliente cuando corresponda.
- La venta puede fallar si el inventario cambió; revisa disponibilidad y reintenta.
- Cierra caja al finalizar el turno y conserva el balance registrado.

## Asistencia

1. Selecciona el empleado.
2. Obtén la ubicación GPS con precisión aceptable.
3. Escanea el código QR con cámara o selecciona una imagen.
4. Confirma el registro.

La ubicación debe ser reciente y estar dentro del rango geográfico válido. Si el
dispositivo rechaza permisos, habilita cámara y ubicación en la configuración del navegador.

## Reportes

- Filtra el período requerido.
- Exporta CSV o genera PDF según disponibilidad del módulo.
- No compartas archivos exportados con personas sin autorización.

## Notificaciones

El centro de notificaciones muestra actividad reciente. Puedes marcar mensajes como
leídos o marcar todos como leídos. Las preferencias externas requieren un teléfono
en formato internacional y consentimiento SMS/WhatsApp.

## Problemas comunes

### Sesión vencida

Vuelve a iniciar sesión. Si MFA está activo, completa el segundo factor.

### Acceso denegado

El usuario no tiene permiso para esa operación. Contacta al administrador.

### Código QR no reconocido

Usa buena iluminación, evita reflejos y prueba una imagen clara o la entrada manual.

### Ubicación GPS incorrecta

Activa ubicación de alta precisión, espera señal estable y vuelve a obtener las coordenadas.

### Error al guardar

No cierres ni cambies el formulario del intento hasta revisar el mensaje mostrado.
Si el servidor indica conflicto, actualiza la lista y reintenta solo después de verificar
que el cambio no creó un duplicado.
