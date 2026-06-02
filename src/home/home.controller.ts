import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

interface JokeApiResponse {
  id: number;
  type: string;
  setup: string;
  punchline: string;
}

const HTML = (joke?: JokeApiResponse, error?: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rudolph — Joke Machine</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #1a1a2e;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #16213e;
      border: 1px solid #0f3460;
      border-radius: 16px;
      padding: 40px;
      max-width: 520px;
      width: 90%;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    h1 { font-size: 1.5rem; margin-bottom: 8px; color: #e94560; }
    .tagline { color: #888; font-size: 0.9rem; margin-bottom: 32px; }
    .joke {
      background: #0f3460;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 28px;
    }
    .setup {
      font-size: 1.15rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .punchline {
      font-size: 1.1rem;
      color: #e94560;
      line-height: 1.5;
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    .punchline.visible { opacity: 1; }
    .reveal-btn {
      background: #e94560;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 12px 28px;
      font-size: 1rem;
      cursor: pointer;
      margin-bottom: 24px;
      transition: background 0.2s;
    }
    .reveal-btn:hover { background: #c73652; }
    .error { color: #e94560; margin-bottom: 24px; }
    .new-btn {
      background: transparent;
      color: #888;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 10px 24px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: color 0.2s, border-color 0.2s;
    }
    .new-btn:hover { color: #e0e0e0; border-color: #666; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎭 Rudolph Joke Machine</h1>
    <p class="tagline">Powered by official-joke-api</p>
    ${error ? `<p class="error">Oops: ${error}</p>` : ''}
    ${joke ? `
    <div class="joke">
      <p class="setup">${joke.setup}</p>
      <p class="punchline" id="punchline">${joke.punchline}</p>
    </div>
    <button class="reveal-btn" onclick="document.getElementById('punchline').classList.add('visible'); this.style.display='none'">Reveal Punchline</button>
    ` : ''}
    <button class="new-btn" onclick="location.reload()">Get Another Joke</button>
  </div>

  <script>
    // Auto-reveal punchline after a short delay for a nicer experience
    setTimeout(() => {
      const p = document.getElementById('punchline');
      if (p) {
        p.classList.add('visible');
        const btn = document.querySelector('.reveal-btn');
        if (btn) btn.style.display = 'none';
      }
    }, 2500);
  </script>
</body>
</html>`;

@Controller()
export class HomeController {
  @Get()
  async home(@Res() res: Response) {
    try {
      const resp = await fetch('https://official-joke-api.appspot.com/random_joke');
      if (!resp.ok) throw new Error(`API returned ${resp.status}`);
      const joke: JokeApiResponse = await resp.json() as JokeApiResponse;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(HTML(joke));
    } catch (err: any) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(HTML(undefined, err.message));
    }
  }
}
