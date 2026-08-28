# Entrenamiento de combate

Aplicación web estática para consultar el plan de gimnasio y registrar sesiones, pesos y recuperación en Google Sheets.

## Estructura

- `index.html`: pantalla principal.
- `css/styles.css`: estilos responsive para celular y escritorio.
- `js/config.js`: configuración pública de la URL del backend.
- `js/api.js`: comunicación con Google Apps Script.
- `js/app.js`: estado, renderizado y formularios.
- `apps-script/Code.gs`: backend que lee y escribe las pestañas de Google Sheets.

## Puesta en marcha

1. Abrir Google Apps Script y crear un proyecto nuevo.
2. Copiar el contenido de `apps-script/Code.gs` en el editor y guardar.
3. Implementar como aplicación web: ejecutar como la propia cuenta y permitir acceso a cualquier usuario que tenga el enlace.
4. Copiar la URL `/exec` resultante en `js/config.js`, reemplazando `PEGAR_AQUI_URL_DE_APPS_SCRIPT`.
5. Probar la página localmente y luego subir esta carpeta a GitHub.
6. Activar GitHub Pages desde la rama principal y la carpeta raíz.

Si ya existía una implementación, después de actualizar `Code.gs` hay que ir a `Implementar > Administrar implementaciones`, editar la implementación y crear una nueva versión para que `/exec` use el código actualizado.

## Pestañas esperadas

El backend utiliza las pestañas creadas en la planilla:

- `Plan 12 semanas`
- `Registro sesiones`
- `Peso y medidas`
- `Recuperación`

La pestaña `Registro sesiones` usa estas columnas de carga: barra, disco por lado, peso total, series, repeticiones, RPE, técnica, dolor y observaciones.

No se guardan credenciales de Google en GitHub. La hoja sigue siendo el origen de datos y Apps Script controla las operaciones de lectura y carga.
