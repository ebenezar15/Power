# Power & Presence

An interactive, bilingual (English / தமிழ்) study atlas with four studies:

1. Healing, gifts, miracles, signs & wonders, power and authority
2. The prophetic, prophecy, declarations and the authority of sons
3. Music and worship in Scripture and practice
4. Curses, demonology, generational curses and deliverance

The language switch sits at the top right. Scripture references are stored once in English and converted to Tamil book names at render time, so they never need separate translation.

## Structure

- `src/data/*.js` — content. Every text value is an `[english, tamil]` pair.
- `src/js/app.js` — renderers for maps, cycles, flowcharts, decision trees, timelines, flip cards, steppers, self-checks, balance scale, quizzes.
- `src/style.css`, `src/shell.html` — layout and theme.
- `build.py` — inlines everything into `dist/power-presence.html`.

```bash
python3 build.py
```
