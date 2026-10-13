# Puerta corrediza doble (hero y sección 4)

- puerta.glb: modelo listo para la web (unos 900 KB, comprimido con Draco). Eje Y hacia arriba, en metros: 2,3 m de alto y 3,47 m de ancho con el marco.
- puerta-organizada.blend: la misma puerta en Blender, por si hay que editarla.
- vista-previa.png: abierta, a mitad de camino y cerrada.

## Partes (nodos del glb)
- marco: portal fijo, vidrios de arriba y rieles. No se mueve.
- hoja-izq y hoja-der: las dos hojas corredizas, cada una con sus manijas. Se mueven solo en el eje X.

## Cómo se mueve
- El modelo está exportado ABIERTO, con las hojas escondidas a los costados.
- El origen de cada hoja está en su borde interior (el que da al centro).
- Para CERRAR: hoja-izq se desplaza +0.824 en X y hoja-der -0.824 en X, hasta encontrarse en el centro (x = 0).
- Para ABRIR: vuelven a su posición original.
- El centro del paso está en x = 0.

Las texturas originales no venían completas, así que todas las piezas quedaron con color liso.
