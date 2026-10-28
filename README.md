# Mapa de Agentes IA · Capa X — v4 para Render

Sitio estático listo para publicar en Render. Incluye la versión 4 del mapa (centinela integrado en la red, recorrido de 7 pasos, registro de skills) y las pantallas de Registro y Ficha.

## Contenido

```
render.yaml              Blueprint de Render (sitio estático)
out/                     Lo que se publica (carpeta de despliegue)
  index.html             Mapa de agentes v4 (página principal)
  registro.html          Registro de agentes
  ficha.html             Ficha del agente A-01
  assets/dc-lite.js      Runtime que ejecuta las pantallas fuera del editor
  assets/vendor/         Preact 10.24.3 (licencia MIT, incluida)
  assets/icon.svg        Ícono de la pestaña
source/                  Pantallas originales del canvas (.dc.html)
build.py                 Regenera out/ a partir de source/
```

No requiere Node, npm ni compilación. Lo único externo es Google Fonts (IBM Plex); si no carga, el sitio usa la fuente del sistema.

## Si ya tenés un sitio estático en Render con `out` como Publish Directory

1. En el repositorio de ese sitio, reemplazá el contenido de la carpeta `out/` por el de `out/` de este paquete (podés agregar también `source/` y `build.py` para regenerar después).
2. Revisá en Render → tu sitio → **Settings → Build Command**: si hoy ejecuta algo que genera o borra `out/` (por ejemplo `npm run build`), cambialo por `echo "sin build"`; si no, este contenido se sobrescribe en cada despliegue.
3. Hacé `git push`. Render publica el sitio nuevo en la misma URL de siempre.

No hace falta usar `render.yaml` en este caso: el servicio ya existe.

## Opción A · Blueprint (sitio nuevo)

1. Subí esta carpeta a un repositorio de GitHub, GitLab o Bitbucket (con `render.yaml` en la raíz).
2. En el panel de Render: **New → Blueprint** y elegí el repositorio.
3. Render detecta `render.yaml` y crea el sitio estático `mapa-agentes-capa-x`. Confirmá con **Apply**.
4. En uno o dos minutos queda publicado en `https://mapa-agentes-capa-x.onrender.com` (o un nombre parecido si ese ya existe).

Cada `git push` a la rama principal vuelve a publicar automáticamente.

## Opción B · Manual desde el panel

1. **New → Static Site** y conectá el repositorio.
2. **Build Command:** `echo "sin build"` (o dejalo vacío si Render lo permite).
3. **Publish Directory:** `out`
4. **Create Static Site.**

## Probar localmente

```bash
python3 -m http.server 8080 -d out
# abrir http://localhost:8080
```

## Actualizar desde el canvas

Si cambiás las pantallas en el canvas, descargá los `.dc.html` nuevos a `source/` (el mapa principal como `Main-v4.dc.html`) y regenerá:

```bash
python3 build.py source out
```

## Notas

- Todos los datos (agentes, skills, costos, ROI) son **datos de ejemplo**.
- Un sitio estático de Render es **público** para cualquiera que tenga la URL. Si el mapa no debe quedar abierto, revisá con Seguridad antes de publicarlo o limitá el acceso por otra vía.
- Los ajustes del panel Tweaks del canvas (colores por compañía, animación) quedan con sus valores por defecto.
