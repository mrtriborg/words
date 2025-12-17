const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'words.json');

let words = [];
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    words = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load data file', e);
    words = [];
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(words, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save data file', e);
  }
}

loadData();

app.get('/api/words', (req, res) => {
  res.json(words);
});

// Create new word
app.post('/api/words', (req, res) => {
  const body = req.body || {};
  const maxId = words.reduce((m, w) => Math.max(m, w.id || 0), 0);
  const newWord = Object.assign({ id: maxId + 1, learned: false, examples: [] }, body);
  words.push(newWord);
  saveData();
  res.status(201).json(newWord);
});

app.put('/api/words/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = words.findIndex(w => w.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const updated = Object.assign({}, words[idx], req.body);
  words[idx] = updated;
  saveData();
  res.json(updated);
});

// Delete a word
app.delete('/api/words/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = words.findIndex(w => w.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const deleted = words.splice(idx, 1)[0];
  saveData();
  res.json({ success: true, deleted });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
