# Concurso piloto Eduar Jiménez de Astronomía General Básica

Sitio web interactivo construido con React, JavaScript, HTML y CSS. Node.js se utiliza para validar el banco de preguntas, ejecutar el servidor local y generar la carpeta `dist`. La versión publicada es estática y compatible con GitHub Pages.

## Corrección de compatibilidad con GitHub Pages

El `index.html` de la raíz ya no apunta a archivos JSX que necesiten ser procesados por Vite. Carga una versión compilada de la aplicación (`src/app.js`) y React 18 en formato UMD, por lo que puede publicarse directamente desde GitHub Pages.

También se incluye un workflow de GitHub Actions que genera y publica `dist/` automáticamente.

## Funciones

Banco de 50 preguntas: 35 fáciles, 10 medias y 5 difíciles.

Cada intento selecciona aleatoriamente 7 fáciles, 2 medias y 1 difícil.

Las preguntas y sus cuatro alternativas cambian de orden en cada intento.

Cronómetro en tiempo real.

Puntaje máximo de 12.000 puntos: 10.000 por precisión y hasta 2.000 adicionales por rapidez.

Registro de fecha y hora de entrega en `America/Guayaquil`.

Ranking local mediante `localStorage`.

Sincronización opcional con Google Sheets mediante Google Apps Script.

Explorador interactivo del Sistema Solar y actividad de secuencia orbital.

Diseño responsivo con azul rey, mostaza, blanco y animaciones espaciales.

## Probar localmente

Con Node.js 20 o superior:

```bash
npm run dev
```

Después abre:

```text
http://localhost:4173
```

También puedes abrir `index.html` directamente en un navegador con conexión a Internet. Para una prueba más fiel a GitHub Pages se recomienda `npm run dev`.

## Validar el banco

```bash
npm run audit
```

Debe devolver:

```text
Banco validado: 35 fáciles, 10 medias, 5 difíciles. Total: 50.
```

## Crear la versión publicable

```bash
npm run build
```

Esto genera `dist/` sin instalar ninguna dependencia npm.

## Google Sheets

Crea una hoja en Google Sheets y abre Extensiones > Apps Script.

Copia el contenido de `google-apps-script/Code.gs`.

Configura la zona horaria como `America/Guayaquil`.

Despliega como Aplicación web, ejecutándola como propietario y dando acceso a los participantes según las opciones disponibles en tu cuenta.

Copia la URL de despliegue que termina normalmente en `/exec`.

Abre `src/config.js` y cambia:

```js
googleAppsScriptUrl: '',
```

por:

```js
googleAppsScriptUrl: 'TU_URL_DE_APPS_SCRIPT',
```

Luego ejecuta `npm run build` o simplemente vuelve a subir los archivos al repositorio para que GitHub Actions genere la publicación.

## GitHub Pages mediante Actions

Sube todos los archivos al repositorio.

Usa `main` como rama principal.

En Settings > Pages selecciona GitHub Actions como fuente de publicación.

El archivo `.github/workflows/deploy-pages.yml` valida las 50 preguntas, crea `dist/` y publica el sitio.

## Publicación directa sin Actions

Como respaldo, el `index.html` raíz también funciona directamente. Si utilizas la opción de publicar una rama/carpeta, debes publicar la raíz del repositorio y mantener las carpetas `src` junto al `index.html`.

## Archivos principales

`index.html`: entrada pública compatible con GitHub Pages.

`src/app.js`: aplicación React ya compilada para el navegador.

`src/questions.js`: banco de 50 preguntas.

`src/config.js`: configuración del concurso y Google Sheets.

`src/styles.css`: diseño y animaciones.

`react-source/`: fuente JSX legible utilizada para desarrollar la aplicación.

`scripts/`: validación, build y servidor local mediante Node.js.

`google-apps-script/Code.gs`: backend de Google Sheets.
