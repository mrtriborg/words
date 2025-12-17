require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'words.json');
const STORAGE_MODE = process.env.STORAGE_MODE || 'file'; // 'file' or 'db'

let pool;
if (STORAGE_MODE === 'db') {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

let words = [];
async function loadData() {
  if (STORAGE_MODE === 'db') {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS words (
          id INTEGER PRIMARY KEY,
          title TEXT,
          transcription TEXT,
          translate TEXT,
          learned BOOLEAN,
          examples JSON
        )
      `);
      const res = await pool.query('SELECT * FROM words ORDER BY id');
      words = res.rows.map(row => ({
        ...row,
        examples: Array.isArray(row.examples) ? row.examples : JSON.parse(row.examples || '[]')
      }));
    } catch (e) {
      console.error('Failed to load from DB', e);
      words = [];
    }
  } else {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      words = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load data file', e);
      words = [];
    }
  }
}

async function saveData() {
  if (STORAGE_MODE === 'db') {
    try {
      await pool.query('DELETE FROM words');
      for (const word of words) {
        await pool.query(
          'INSERT INTO words (id, title, transcription, translate, learned, examples) VALUES ($1, $2, $3, $4, $5, $6)',
          [word.id, word.title, word.transcription, word.translate, word.learned, JSON.stringify(word.examples)]
        );
      }
    } catch (e) {
      console.error('Failed to save to DB', e);
    }
  } else {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(words, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save data file', e);
    }
  }
}

loadData();

app.get('/api/words', (req, res) => {
  res.json(words);
});

// Create new word
app.post('/api/words', async (req, res) => {
  const body = req.body || {};
  const maxId = words.reduce((m, w) => Math.max(m, w.id || 0), 0);
  const newWord = Object.assign({ id: maxId + 1, learned: false, examples: [] }, body);
  words.push(newWord);
  await saveData();
  res.status(201).json(newWord);
});

app.put('/api/words/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = words.findIndex(w => w.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const updated = Object.assign({}, words[idx], req.body);
  words[idx] = updated;
  await saveData();
  res.json(updated);
});

// Delete a word
app.delete('/api/words/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = words.findIndex(w => w.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const deleted = words.splice(idx, 1)[0];
  await saveData();
  res.json({ success: true, deleted });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
