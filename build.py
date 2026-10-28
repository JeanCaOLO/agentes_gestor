#!/usr/bin/env python3
"""Convierte las pantallas .dc.html del canvas en páginas estáticas para Render.

Uso: python3 build.py <carpeta_con_project> <carpeta_public>
"""
import html
import re
import sys
from pathlib import Path

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])

PAGES = [
    # (archivo origen, archivo destino, título de pestaña)
    ("Main-v4.dc.html", "index.html", "Mapa de Agentes IA · Capa X"),
    ("Registro.dc.html", "registro.html", "Registro de agentes IA · Capa X"),
    ("Ficha.dc.html", "ficha.html", "Ficha de agente · Capa X"),
]
LINKS = {
    "Main-v4.dc.html": "index.html",
    "Main.dc.html": "index.html",
    "Registro.dc.html": "registro.html",
    "Ficha.dc.html": "ficha.html",
}


def convert(src_text: str, title: str) -> str:
    helmet = re.search(r"<helmet>(.*?)</helmet>", src_text, re.S).group(1).strip()
    body = re.search(r"<x-dc>(.*?)</x-dc>", src_text, re.S).group(1)
    body = re.sub(r"<helmet>.*?</helmet>", "", body, flags=re.S).strip()
    # Bloques de control → <template> (válidos dentro de tablas y SVG)
    body = re.sub(r"<sc-for\b", '<template data-sc="for"', body)
    body = body.replace("</sc-for>", "</template>")
    body = re.sub(r"<sc-if\b", '<template data-sc="if"', body)
    body = body.replace("</sc-if>", "</template>")
    for k, v in LINKS.items():
        body = body.replace(f'href="{k}"', f'href="{v}"')
    m = re.search(r"<script type=\"text/x-dc\" data-dc-script data-props='(.*?)'>(.*?)</script>", src_text, re.S)
    props, logic = m.group(1), m.group(2)
    if "</script" in logic.lower():
        raise SystemExit("La lógica contiene </script>, no se puede incrustar")
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="Mapa de agentes IA de la organización: Capa X, gobierno, métricas y centinela de seguridad. Datos de ejemplo.">
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
{helmet}
</head>
<body>
<div id="app"></div>
<noscript><p style="color:#E6EAF0;font-family:sans-serif;padding:24px">Esta aplicación necesita JavaScript.</p></noscript>
<template id="dc-template">
{body}
</template>
<script id="dc-logic" type="text/plain" data-props='{props}'>{logic}</script>
<script src="assets/vendor/preact.min.js"></script>
<script src="assets/dc-lite.js"></script>
<script>DCLite.boot();</script>
</body>
</html>
"""


OUT.mkdir(parents=True, exist_ok=True)
for src, dst, title in PAGES:
    text = (SRC / src).read_text(encoding="utf-8")
    (OUT / dst).write_text(convert(text, title), encoding="utf-8")
    print("ok", src, "→", dst)
