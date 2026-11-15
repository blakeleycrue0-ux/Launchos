// Ajusta el index.html exportado por Expo para móvil (Safari de iPhone): safe areas, color de fondo y sin zoom accidental.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const file = 'dist/index.html';
let html = readFileSync(file, 'utf8');
html = html
  .replace('<html lang="en">', '<html lang="es">')
  .replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />')
  .replace('<title>Mio</title>', `<title>MIO</title>
    <meta name="description" content="MIO — tu dinero, más claro." />
    <meta name="theme-color" content="#090909" />
    <meta name="color-scheme" content="dark light" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="MIO" />
    <meta name="format-detection" content="telephone=no" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <style>
      html, body { background: #090909; overscroll-behavior: none; -webkit-text-size-adjust: 100%; }
      body { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
      input, textarea { -webkit-appearance: none; appearance: none; }
      input[type="date"]::-webkit-date-and-time-value { text-align: inherit; }
    </style>`);
writeFileSync(file, html);
copyFileSync('assets/icon.png', 'dist/apple-touch-icon.png');
writeFileSync('dist/manifest.webmanifest', JSON.stringify({
  name: 'MIO', short_name: 'MIO', start_url: '/', display: 'standalone', background_color: '#090909', theme_color: '#090909',
  icons: [{ src: '/apple-touch-icon.png', sizes: '1024x1024', type: 'image/png' }],
}));
// SPA: cualquier ruta (p. ej. /unirse?token=…) debe servir la app.
writeFileSync('dist/_redirects', '/*  /index.html  200\n');
console.log('postexport: index.html, manifest, icono y redirecciones listos');
