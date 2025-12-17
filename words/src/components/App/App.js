import Game from '../Game/Game';
import ItemList from '../ItemList/ItemList';
import './App.css';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import {data as localData} from '../../data';

const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

function App() {
  const [gameMode, setGameMode] = useState(false);
  const [words, setWords] = useState(localData);
  const [selectedWords, setSelectedWords] = useState(localData);

  const [knownWords, setKnownWords] = useState(true);
  const [sampleSize, setSampleSize] = useState(10);
  const [sessionWords, setSessionWords] = useState([]);

  const setLearnedWords = () => {
    const allData = [...words];
    const filteredData = allData.filter(item => item.learned === !knownWords);
    setKnownWords(!knownWords);
    setSelectedWords(filteredData);
    const remain = filteredData.length;
    setSampleSize(prev => Math.min(prev, Math.max(remain, 0)));
  };

  useEffect(() => {
    // try loading from backend; fall back to local data
    fetch(`${API_BASE}/api/words`)
      .then(r => r.json())
      .then(d => {
        setWords(d);
        setSelectedWords(d);
      })
      .catch(() => {
        setWords(localData);
        setSelectedWords(localData);
      });
  }, []);

  const updateWord = (updated) => {
    setWords(prev => prev.map(w => w.id === updated.id ? updated : w));
    setSelectedWords(prev => prev.map(w => w.id === updated.id ? updated : w));
    setSessionWords(prev => prev.map(w => w.id === updated.id ? updated : w));
  }

  const shuffle = (array) => {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const startGame = () => {
    const available = selectedWords;
    if (!available || available.length === 0) {
      alert('No words selected for the game.');
      return;
    }
    let size = Number(sampleSize) || 0;
    if (size > available.length) {
      size = available.length;
      setSampleSize(size);
    }
    const picked = shuffle(available).slice(0, size);
    setSessionWords(picked);
    setGameMode(true);
  }

  const stopGame = () => {
    // Remove session words from selectedWords so they won't participate next time
    const sessionIds = new Set(sessionWords.map(w => w.id));
    setSelectedWords(prev => prev.filter(w => !sessionIds.has(w.id)));
    setGameMode(false);
    setSessionWords([]);
  }

  return (
    <div className="app">
      <header className="app-header">
        <a
          href
          className='btn'
          onClick={() => gameMode ? stopGame() : startGame()}
        >
          GAME {gameMode ? "OFF" : "ON"}
        </a>
        <Link to="/edit" style={{position:'absolute', right:16, top:16}} className='small-btn'>Edit</Link>
        <input
          type='number'
          min={1}
          value={sampleSize}
          onChange={(e) => {
            const v = Number(e.target.value) || 0;
            // clamp against total selected words (user may choose learned or unlearned lists)
            // clamp against total selected words (user may choose learned or unlearned lists)
            const remain = selectedWords.length;
            const clamped = v > remain ? remain : v;
            setSampleSize(clamped);
          }}
          style={{width: '80px', margin: '5px'}}
        />
        <btn
          href
          className='small-btn'
          onClick={setLearnedWords}
        >
          Get {knownWords ? "Unlearned" : "Learned"} words
        </btn>
        <div className='header-btns-wrapper'>
          <btn
            href
            className='small-btn'
            onClick={() => setSelectedWords(words)}
          >
            Get all words
          </btn>
          <btn
            href
            className='small-btn'
            onClick={() => setSelectedWords([])}
          >
            Remove all words
          </btn>
        </div>
      </header>
      {
        gameMode ? (
          <Game 
            data={sessionWords} 
            updateWord={updateWord}
            onSessionEnd={() => {
              const sessionIds = new Set(sessionWords.map(w => w.id));
              setSelectedWords(prev => prev.filter(w => !sessionIds.has(w.id)));
              setGameMode(false);
                setSessionWords([]);
              }}
            />
          ) : (
            <ItemList 
              data={words}
              gameData={selectedWords}
              setGameData={setSelectedWords}
              updateWord={updateWord}
            />
          )
      }
    </div>
  );
}

export default App;