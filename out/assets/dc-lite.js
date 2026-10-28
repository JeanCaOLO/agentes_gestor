/*
 * dc-lite.js — runtime mínimo para publicar las pantallas del Mapa de Agentes IA
 * fuera del editor de diseño. Interpreta el mismo formato de plantilla:
 *   {{ruta.punteada}}  ·  <template data-sc="for" list as>  ·  <template data-sc="if" value>
 * y ejecuta la clase `Component extends DCLogic` de cada pantalla.
 * Depende de Preact (assets/vendor/preact.min.js, licencia MIT).
 */
(function () {
  'use strict';
  var P = window.preact;
  var h = P.h, render = P.render, Fragment = P.Fragment;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var NO_WS = { table: 1, thead: 1, tbody: 1, tfoot: 1, tr: 1, colgroup: 1, select: 1, svg: 1, g: 1, defs: 1, marker: 1 };

  // ---------- Resolución de valores ----------
  function literal(expr) {
    if (expr === 'true') return { ok: true, v: true };
    if (expr === 'false') return { ok: true, v: false };
    if (expr === 'null') return { ok: true, v: null };
    if (/^-?\d+(\.\d+)?$/.test(expr)) return { ok: true, v: Number(expr) };
    var m = /^(['"])(.*)\1$/.exec(expr);
    if (m) return { ok: true, v: m[2] };
    return { ok: false };
  }
  function lookup(scope, expr) {
    var lit = literal(expr);
    if (lit.ok) return lit.v;
    var parts = expr.split('.');
    var cur = scope;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }
  function str(v) { return v == null || v === false ? '' : String(v); }

  // Compila "texto {{a}} más {{b.c}}" en partes.
  function parseParts(s) {
    var out = [], last = 0, m;
    HOLE.lastIndex = 0;
    while ((m = HOLE.exec(s))) {
      if (m.index > last) out.push({ t: s.slice(last, m.index) });
      out.push({ e: m[1] });
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push({ t: s.slice(last) });
    return out;
  }
  function evalParts(parts, scope, raw) {
    if (raw && parts.length === 1 && parts[0].e) return lookup(scope, parts[0].e);
    var s = '';
    for (var i = 0; i < parts.length; i++) s += parts[i].t != null ? parts[i].t : str(lookup(scope, parts[i].e));
    return s;
  }

  // ---------- Compilación de la plantilla (una vez) ----------
  function kids(node) {
    return node.content ? node.content.childNodes : node.childNodes;
  }
  function compileList(nodes, parentTag) {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var c = compile(nodes[i], parentTag);
      if (c) out.push(c);
    }
    return out;
  }
  function compile(node, parentTag) {
    if (node.nodeType === 3) {
      var txt = node.nodeValue;
      if (!/\S/.test(txt)) {
        if (NO_WS[parentTag]) return null;
        return { k: 'text', parts: [{ t: ' ' }] };
      }
      return { k: 'text', parts: parseParts(txt) };
    }
    if (node.nodeType !== 1) return null;
    var tag = node.localName;
    var sc = node.getAttribute('data-sc');
    if (tag === 'template' && sc === 'for') {
      return { k: 'for', list: node.getAttribute('list'), as: node.getAttribute('as') || 'item', kids: compileList(kids(node), parentTag) };
    }
    if (tag === 'template' && sc === 'if') {
      return { k: 'if', value: node.getAttribute('value'), kids: compileList(kids(node), parentTag) };
    }
    var attrs = [];
    for (var j = 0; j < node.attributes.length; j++) {
      var a = node.attributes[j];
      if (a.name.indexOf('hint-') === 0) continue;
      attrs.push({ name: a.name, parts: parseParts(a.value), ev: /^on[a-z]+$/i.test(a.name) });
    }
    return { k: 'el', tag: tag, attrs: attrs, kids: compileList(kids(node), tag) };
  }

  // ---------- Render ----------
  function build(list, scope, out) {
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      if (n.k === 'text') { out.push(evalParts(n.parts, scope, false)); continue; }
      if (n.k === 'if') {
        if (lookup(scope, n.value.replace(/^\{\{\s*|\s*\}\}$/g, ''))) build(n.kids, scope, out);
        continue;
      }
      if (n.k === 'for') {
        var arr = lookup(scope, n.list.replace(/^\{\{\s*|\s*\}\}$/g, '')) || [];
        for (var x = 0; x < arr.length; x++) {
          var s = Object.create(scope);
          s[n.as] = arr[x];
          s.$index = x;
          build(n.kids, s, out);
        }
        continue;
      }
      var props = {};
      for (var j = 0; j < n.attrs.length; j++) {
        var at = n.attrs[j];
        var v = evalParts(at.parts, scope, true);
        if (at.ev) { if (typeof v === 'function') props[at.name.toLowerCase()] = v; continue; }
        if (v === undefined || v === null || v === false) continue;
        props[at.name] = typeof v === 'object' ? str(v) : v;
      }
      var ch = [];
      build(n.kids, scope, ch);
      out.push(h.apply(null, [n.tag, props].concat(ch)));
    }
    return out;
  }

  // ---------- Componente ----------
  function DCLogic() { this.props = {}; this.state = {}; }
  DCLogic.prototype.setState = function (p) {
    if (typeof p === 'function') p = p(this.state, this.props);
    this.state = Object.assign({}, this.state, p || {});
    schedule();
  };
  DCLogic.prototype.forceUpdate = function () { schedule(); };
  window.DCLogic = DCLogic;

  var inst = null, tree = null, root = null, queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    Promise.resolve().then(function () { queued = false; draw(); });
  }
  function draw() {
    var vals = inst.renderVals() || {};
    render(h.apply(null, [Fragment, null].concat(build(tree, vals, []))), root);
  }

  window.DCLite = {
    boot: function () {
      var tpl = document.getElementById('dc-template');
      var logic = document.getElementById('dc-logic');
      root = document.getElementById('app');
      tree = compileList(kids(tpl), 'div');
      var Component = new Function('DCLogic', logic.textContent + '\nreturn Component;')(DCLogic);
      inst = new Component();
      var defs = {};
      try { defs = JSON.parse(logic.getAttribute('data-props') || '{}'); } catch (e) { defs = {}; }
      var props = {};
      Object.keys(defs).forEach(function (k) {
        if (k.charAt(0) !== '$' && defs[k] && 'default' in defs[k]) props[k] = defs[k]['default'];
      });
      inst.props = props;
      if (!inst.state) inst.state = {};
      draw();
      if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
      window.addEventListener('pagehide', function () {
        if (typeof inst.componentWillUnmount === 'function') inst.componentWillUnmount();
      });
    }
  };
})();
