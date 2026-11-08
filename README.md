# doc_mkdocs_assets

Assets compartidos (JS y CSS) para sitios de documentación MkDocs + Material. Se consumen
como **submódulo git** montado en `docs/assets/` de cada documentación, de modo que una mejora
aquí llega a todas al actualizar el submódulo.

## Contenido

| Archivo | Qué hace |
|---|---|
| `zoom.js` | Zoom a demanda para diagramas Mermaid (clic para ampliar, rueda para zoom, arrastre para mover, `Esc` para cerrar) |
| `zoom.css` | Estilos del botón "Ampliar" y del overlay |

## Uso en una documentación

```bash
git submodule add git@github.com:MauOcon/doc_mkdocs_assets.git docs/assets
```

`mkdocs.yml` ya debe tener:

```yaml
extra_css:
  - assets/zoom.css

extra_javascript:
  - assets/zoom.js
```

Para clonar una documentación que ya usa el submódulo:

```bash
git clone --recurse-submodules <url>
# si ya clonaste sin la opción:
git submodule update --init
```

## Actualizar a la última versión

```bash
git submodule update --remote docs/assets
git add docs/assets
git commit -m "Actualiza assets compartidos"
```

El submódulo queda fijado a un commit concreto: la documentación solo cambia cuando haces ese
commit, así que una actualización aquí no rompe proyectos que no la han tomado.

## Modificar los assets

Los cambios se hacen en este repositorio, ya sea en su clon propio o desde `docs/assets/` de
una documentación (que es un clon completo de este repo). Si lo haces desde una documentación,
recuerda que el submódulo queda en *detached HEAD*: ejecuta `git switch main` antes de editar, y
haz `push` aquí **antes** de hacer commit del proyecto que lo contiene.

Los pasos completos están en la sección "Modificar los assets desde una documentación" del
`README-docs.md` de la plantilla (`doc_mkdocs_template`).

## Notas

- El fondo oscuro del overlay (`#1e1e2e`) va acoplado a `theme: dark` de Mermaid en
  `mkdocs.yml`. Si cambias uno, cambia el otro.
- Si un cambio en JS o CSS no se ve, es caché del navegador: F12 → Network → **Disable cache**
  y recarga.
