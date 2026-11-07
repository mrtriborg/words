require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const DATA_FILE = path.join(__dirname, 'words.json');
const STORAGE_MODE = process.env.STORAGE_MODE || 'file'; // 'file' or 'db'

let pool;
if (STORAGE_MODE === 'db') {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

let words = [];

function normalizeRow(row, index = 0) {
  let examplesArray = [];

  if (row.examples === null || row.examples === undefined) {
    examplesArray = [];
  } else if (Array.isArray(row.examples)) {
    examplesArray = row.examples;
  } else if (typeof row.examples === 'string') {
    try {
      examplesArray = JSON.parse(row.examples);
      if (!Array.isArray(examplesArray)) examplesArray = [];
    } catch (parseError) {
      console.error(`🚨 Error parsing examples at row ${index}:`, parseError.message, 'Raw value:', row.examples);
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
}

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
      console.log('🗄️ RAW DB RESPONSE:', {
        rowCount: res.rowCount,
        sampleRow: res.rows[0] || null
      });
      console.log('📜 DB ROWS COUNT:', res.rows.length);
      console.log(`📦 Fetched ${res.rows.length} rows from DB`);

      words = res.rows.map((row, index) => normalizeRow(row, index));

      console.log(`✅ Successfully loaded ${words.length} words into memory`);
      
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
    const fileContents = fs.readFileSync(DATA_FILE, 'utf8');
    const fileWords = JSON.parse(fileContents);
    if (!Array.isArray(fileWords)) {
      throw new TypeError(`Expected an array of words in ${DATA_FILE}`);
    }
    words = fileWords.map((row, index) => normalizeRow(row, index));
    console.log(`✅ Successfully loaded ${words.length} words from file`);
  }
}

async function saveData(nextWords) {
  if (STORAGE_MODE === 'db') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM words');
      for (const word of nextWords) {
        await client.query(
          'INSERT INTO words (id, title, transcription, translate, learned, examples) VALUES ($1, $2, $3, $4, $5, $6)',
          [word.id, word.title, word.transcription, word.translate, word.learned, JSON.stringify(word.examples)]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
    finally {
      client.release();
    }
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify(nextWords, null, 2), 'utf8');
  }
}

app.get('/api/words', async (req, res) => {
  if (STORAGE_MODE === 'db') {
    try {
      const dbRes = await pool.query('SELECT * FROM words ORDER BY id');
      console.log('🗄️ RAW DB RESPONSE for /api/words:', {
        rowCount: dbRes.rowCount,
        sampleRow: dbRes.rows[0] || null
      });
      console.log('📜 DB ROWS COUNT for /api/words:', dbRes.rows.length);
      return res.json(dbRes.rows.map((row, index) => normalizeRow(row, index)));
    } catch (fetchError) {
      console.error('💥 Failed to fetch words from DB in /api/words:', fetchError);
      return res.status(500).json({ error: 'DB read failed' });
    }
  }

  console.log('📦 Returning in-memory words count:', words.length);
  res.json(words);
});

// Create new word
app.post('/api/words', async (req, res) => {
  const body = req.body || {};
  const maxId = words.reduce((m, w) => Math.max(m, w.id || 0), 0);
  const newWord = Object.assign({ id: maxId + 1, learned: false, examples: [] }, body);
  const nextWords = [...words, newWord];
  try {
    await saveData(nextWords);
    words = nextWords;
  } catch (error) {
    console.error('Failed to create word:', error);
    return res.status(500).json({ error: 'Failed to save word' });
  }
  res.status(201).json(newWord);
});

app.post('/api/words/import', async (req, res) => {
  const importedWords = req.body && req.body.words;
  if (!Array.isArray(importedWords)) {
    return res.status(400).json({ error: 'Expected a JSON array in the words field' });
  }

  const ids = new Set();
  const normalizedWords = [];
  for (const [index, row] of importedWords.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return res.status(400).json({ error: `Word at index ${index} must be an object` });
    }
    if (!Number.isInteger(row.id) || row.id < 1 || ids.has(row.id)) {
      return res.status(400).json({ error: `Word at index ${index} has a missing, invalid, or duplicate id` });
    }
    if (typeof row.title !== 'string' || typeof row.translate !== 'string') {
      return res.status(400).json({ error: `Word at index ${index} must have title and translate strings` });
    }
    if (row.transcription !== undefined && typeof row.transcription !== 'string') {
      return res.status(400).json({ error: `Word at index ${index} has an invalid transcription` });
    }
    if (row.learned !== undefined && typeof row.learned !== 'boolean') {
      return res.status(400).json({ error: `Word at index ${index} has an invalid learned value` });
    }
    if (row.examples !== undefined && !Array.isArray(row.examples)) {
      return res.status(400).json({ error: `Word at index ${index} has invalid examples` });
    }
    ids.add(row.id);
    normalizedWords.push(normalizeRow({
      ...row,
      transcription: row.transcription || '',
      learned: row.learned === undefined ? false : row.learned,
      examples: row.examples || []
    }, index));
  }

  const nextWords = [...words];
  const existingIndexes = new Map(nextWords.map((word, index) => [word.id, index]));
  for (const word of normalizedWords) {
    const existingIndex = existingIndexes.get(word.id);
    if (existingIndex === undefined) {
      existingIndexes.set(word.id, nextWords.length);
      nextWords.push(word);
    } else {
      nextWords[existingIndex] = word;
    }
  }

  try {
    await saveData(nextWords);
    words = nextWords;
    return res.json({ imported: normalizedWords.length, words });
  } catch (error) {
    console.error('Failed to import words:', error);
    return res.status(500).json({ error: 'Failed to save imported words' });
  }
});

app.put('/api/words/:id', async (req, res) => {
  const id = Number(req.params.id);
  const idx = words.findIndex(w => w.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const updated = Object.assign({}, words[idx], req.body);
  const nextWords = [...words];
  nextWords[idx] = updated;
  try {
    await saveData(nextWords);
    words = nextWords;
  } catch (error) {
    console.error('Failed to update word:', error);
    return res.status(500).json({ error: 'Failed to save word' });
  }
  res.json(updated);
});

// Delete a word
app.delete('/api/words/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid word id' });
  }

  try {
    let deleted;
    if (STORAGE_MODE === 'db') {
      const result = await pool.query('DELETE FROM words WHERE id = $1 RETURNING *', [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      deleted = normalizeRow(result.rows[0]);
      words = words.filter(word => Number(word.id) !== id);
    } else {
      const idx = words.findIndex(word => Number(word.id) === id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      deleted = words[idx];
      const nextWords = words.filter((_, index) => index !== idx);
      await saveData(nextWords);
      words = nextWords;
    }

    return res.json({ success: true, deleted });
  } catch (error) {
    console.error('Failed to delete word:', error);
    return res.status(500).json({ error: 'Failed to delete word' });
  }
});

const PORT = process.env.PORT || 5000;
loadData()
  .then(() => app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`)))
  .catch(error => {
    console.error('Failed to initialize backend:', error);
    process.exitCode = 1;
  });
