# Snake

The classic Snake game, rebuilt for the browser with vanilla JavaScript and the
HTML5 Canvas — no framework, no build step, no dependencies.

**▶ Play it: [snake.nazimbo.com](https://snake.nazimbo.com)**

## What's in it

- **Wrap-around board.** The snake passes through the edges instead of dying on
  them, so the only way to lose is to hit yourself.
- **A win condition.** Fill every cell on the board and you actually win — the
  game detects that no free cell is left rather than running forever.
- **Themes.** Several palettes covering both the page and the board. The snake's
  colour is expressed in HSL, so a theme can be flat or a head-to-tail gradient.
- **Procedural chiptune soundtrack.** No audio files: the music is generated at
  runtime through the Web Audio API, with a look-ahead scheduler for tight
  timing, a low-pass filter and an echo send. Several tracks, hot-swappable.
- **Installable.** A service worker caches the game, so it runs offline and can
  be added to a phone's home screen.
- **Touch and keyboard.** Arrow keys or swipes, with direction changes debounced
  so a fast double-tap can't fold the snake back onto itself.

## Controls

| Key | Action |
| --- | --- |
| Arrow keys / swipe | Steer |
| Space | Pause |
| `M` | Mute |
| `Ctrl+D` | Debug panel — FPS, speed, length, positions |

## Running it locally

There is nothing to install.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Serve it over HTTP rather than opening `index.html` directly: the service worker
registers at the root scope and its cache list uses root-relative paths, so the
offline features only work from a site root.

## Other things I've built

Free, no account needed, all running in the browser:

- **[Bamboozle](https://bamboozle.nazimbo.com)** — an online multiplayer party
  game. Two teams invent fake answers to trivia questions, then bet their tokens
  on which of the opponent's answers is the real one. 2–16 players, each on their
  own phone.
- **[Sommet](https://sommet.nazimbo.com)** — a satirical swipe-to-decide game
  about holding on to power.
- **[Reign Supreme](https://reignsupreme.nazimbo.com)** — a higher/lower game
  about how long world leaders actually ruled.
- **[Convertify](https://convertify.nazimbo.com)** — file conversion for
  documents, images and audio.

More at **[nazimbo.com](https://nazimbo.com)**.

## License

MIT.
