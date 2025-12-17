import React, { useEffect, useState } from 'react';
import './Item.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

const Item = ({
  item, 
  gameMode, 
  allData,
  gameData, 
  setGameData,
  updateWord,
  nextAfterMark,
  currentItemId, 
  setCurrentItemId
}) => {

  const [showTranslate, setShowTranslate] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [itemChosen, setItemChosen] = useState(false);

  useEffect(() => {
    setShowTranslate(false);
    setShowModal(false);
    let timer = setTimeout(() => {
        {itemChosen && setShowModal(true)};
      }, 1000)
    return () => {
      clearTimeout(timer);
    };
  }, [item, itemChosen])

  const isWordInGame = (id) => {
    return gameData.find(element => element.id === id)
  }

  const addToGame = () => {
    if (gameMode) return;
    let data = [...gameData];
    if (isWordInGame(item.id)) {
      data = data.filter(element => element.id !== item.id);
      setGameData(data);
    } else {
      data.push(item);
      setGameData(data);
    }
  }

  const onMouseEnterHandler = () => {
    if (!gameMode) {
      setCurrentItemId(item.id)
      setItemChosen(true);
    }
  };

  const onMouseLeaveHandler = () => {
    if (!gameMode) {
      setItemChosen(false);
    }
  };

  return (
    <div 
      className='item-container'
      onMouseEnter={onMouseEnterHandler}
      onMouseLeave={onMouseLeaveHandler}
    > 
      {
        showModal && !gameMode && item.id === currentItemId &&
        <div className='translate-modal'>
          <span>
            {item.title + ': ' + item.translate}
          </span>
        </div>
      }
      <span 
        style={{
          backgroundColor: !gameMode ? gameData.find(element => element.id === item.id) ? 'rgb(21, 255, 0)' : '' : '',
          cursor: 'pointer',
          fontWeight: "bold"
        }}
        className={gameMode ? '' : 'item'}
        onClick={addToGame}
      >
        {item.title + ' '}
      </span>
      {
        !item.learned && gameMode &&
        <button
          className='small-btn'
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const res = await fetch(`${API_BASE}/api/words/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ learned: true })
              });
                const updated = await res.json();
                if (updateWord) updateWord(updated);
                if (nextAfterMark) nextAfterMark();
            } catch (err) {
              console.error('Failed to mark learned', err);
            }
          }}
        >
          Add to learned
        </button>
      }
      {
        item.learned && gameMode &&
        <button
          className='small-btn'
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const res = await fetch(`${API_BASE}/api/words/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ learned: false })
              });
                const updated = await res.json();
                if (updateWord) updateWord(updated);
                if (nextAfterMark) nextAfterMark();
            } catch (err) {
              console.error('Failed to mark unlearned', err);
            }
          }}
        >
          Add to unlearn
        </button>
      }
      {
        gameMode && 
        <>
          <span
            style={{
              fontWeight: "bold"
            }}
          >
            {item.transcription + ' - '}
          </span>
          <span 
            style={{cursor: 'pointer'}}
            onClick={() => setShowTranslate(!showTranslate)}
          >
            {showTranslate ? item.translate : 'TRANSLATE'}
          </span>
          {
            showTranslate && item.examples.length > 0 && 
              <div className='example-list'>
                {
                  item.examples.map((example) => {
                    return <div className='example'>
                      <span style={{fontWeight: "bold"}}>{example.en}</span>
                      <span>{example.ru}</span>
                    </div>
                  }) 
                } 
              </div> 
          }
        </>
      }
    </div>
  )
}

export default Item