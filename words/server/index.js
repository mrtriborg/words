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
          examples JSONB
        )
      `);

      console.log('🔍 Starting to fetch words from DB...');
      const res = await pool.query('SELECT * FROM words ORDER BY id');
      console.log(`📦 Fetched \${res.rows.length} rows from DB`);

      words = res.rows.map((row, index) => {
        let examplesArray = [];
        
        // Безопасный парсинг
        if (row.examples === null || row.examples === undefined) {
          examplesArray = [];
        } else if (Array.isArray(row.examples)) {
          examplesArray = row.examples;
        } else if (typeof row.examples === 'string') {
          try {
            examplesArray = JSON.parse(row.examples);
            if (!Array.isArray(examplesArray)) examplesArray = [];
          } catch (parseError) {
            console.error(`🚨 Error parsing examples at row \${index}:`, parseError.message, 'Raw value:', row.examples);
            examplesArray = [];
          }
        } else {
          examplesArray = [];
        }

        return {
          id: row.id,
          title: row.title,
          transcription: row.transcription,
          translate: row.translate,
          learned: row.learned,
          examples: examplesArray
        };
      });

      console.log(`✅ Successfully loaded \${words.length} words into memory`);
      
      // ТОЛЬКО если режим file, пишем в JSON. В режиме db ЭТО НЕ НУЖНО и опасно!
      if (STORAGE_MODE === 'file') { 
         fs.writeFileSync(DATA_FILE, JSON.stringify(words, null, 2), 'utf8');
      }

    } catch (e) {
      console.error('💥 CRITICAL ERROR loading data from DB:', e.message);
      console.error('Stack trace:', e.stack);
      words = [];
      throw e; // Важно: если БД не работает, пусть сервер падает, а не отдает пустой массив
    }
  } else {
    // ... логика для файла
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
