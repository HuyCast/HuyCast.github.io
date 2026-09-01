import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Health check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Configure MIME types and static file serving
express.static.mime.define({
  'application/javascript': ['mjs', 'js'],
  'application/pdf': ['pdf']
});

// Serve static assets from project root
app.use(express.static(__dirname, {
  extensions: ['html', 'htm'],
  index: 'index.html',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// Route redirects for cleaner navigation
app.get('/flashcard', (req, res) => {
  res.redirect('/flashcard/');
});

app.get('/vstep', (req, res) => {
  res.redirect('/vstep/');
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Application running on http://0.0.0.0:${PORT}`);
});
