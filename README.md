# Elemental Strikers: Roguelike

Roguelike de fútbol por turnos, hecho con HTML, CSS y JavaScript puros (sin frameworks, sin build, sin backend). Forma tu equipo, sube un mapa de partidos generado al azar cada partida y usa las ventajas elementales (Fuego, Viento, Tierra, Trueno y Aire) para ganar cada duelo.

**Juega aquí:** https://adrianezd.github.io/elemental-strikers-roguelike/

> Nota: si acabas de desplegar el sitio por primera vez, GitHub Pages puede tardar uno o dos minutos en publicarse.

## Cómo jugar

1. **Elige tu capitán** entre 3 jugadores ofrecidos al azar, cada uno con un elemento y estadísticas propias (Tiro, Pase, Defensa, Especial).
2. **Recorre el mapa**, un camino ramificado con nodos de:
   - ⚽ **Partido** — combate por turnos contra un rival.
   - 🏋️ **Entrenamiento** — elige una mejora de estadística para un jugador.
   - 🧢 **Fichaje** — ficha un nuevo jugador para tu plantilla (hasta 4).
   - 💤 **Descanso** — quita la fatiga de tu plantilla.
   - 👑 **Jefe** — un partido mucho más difícil, cada ~5 nodos.
3. **Juega los partidos**: en cada turno de ataque eliges Tiro, Pase o Jugada Especial (requiere el medidor lleno) para tu jugador activo. Los elementos siguen una rueda de ventajas tipo piedra-papel-tijera: Fuego vence a Viento, Viento a Tierra, Tierra a Trueno y Trueno a Fuego. Aire es neutral frente a todos.
4. **Muerte permanente**: si pierdes un partido, la partida termina y verás un resumen de tu progreso.
5. **Progresión entre partidas**: ganas Puntos de Leyenda según tu progreso, guardados en tu navegador (localStorage). Gástalos en el **Vestuario** para desbloquear capitanes iniciales adicionales en futuras partidas.

## Aviso

Proyecto de fan hecho por diversión. No afiliado a ninguna franquicia comercial existente. Todos los nombres, personajes y elementos visuales son originales.
