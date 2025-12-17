import React, { useEffect, useState } from 'react';
import ItemList from '../ItemList/ItemList';
import Item from '../Item/Item';
import './Game.css';

const Game = ({data, updateWord, onSessionEnd}) => {
  useEffect(() => {
    const shuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    if (!data || data.length === 0) {
      setGameData([]);
      setGameDataRepeat([]);
      setCurrentItem(null);
      return;
    }
    const shuffledArray = shuffle([...data]);
    setGameData(shuffledArray);
    setGameDataRepeat(structuredClone(shuffledArray));
    setCurrentItem(shuffledArray[0]);
  }, [data])

  const [gameData, setGameData] = useState([]);
  const [gameDataRepeat, setGameDataRepeat] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [unknownWords, setUnknownWords] = useState([]);
  const [addedToUnknown, setAdddedToUnknown] = useState(false);
  const hasStartedRef = React.useRef(false);
  const endedRef = React.useRef(false);

  const addToUnknownWords = () => {
    setAdddedToUnknown(!addedToUnknown)
  }

  const setNextWord = () => {
    gameData.shift();
    const updatedData = [...gameData];
    if (addedToUnknown) {
      const allUnknownItems = [...unknownWords];
      allUnknownItems.push(currentItem);
      setUnknownWords(allUnknownItems);
    }

    setAdddedToUnknown(false);
    setGameData(updatedData);
    if (gameData.length > 0) setCurrentItem(gameData[0]);
  };

  // detect session end and notify parent
  useEffect(() => {
    if (gameData && gameData.length > 0) {
      hasStartedRef.current = true;
      endedRef.current = false;
    }
    if (hasStartedRef.current && (!gameData || gameData.length === 0) && !endedRef.current) {
      endedRef.current = true;
      if (onSessionEnd) onSessionEnd();
    }
  }, [gameData, onSessionEnd]);

  const setDataForRepeat = () => {
    const dataForRepeat = structuredClone(gameDataRepeat);
    setGameData(structuredClone(gameDataRepeat));
    setCurrentItem(dataForRepeat[0]);
  };
  
  return (
    <div className='game-container'>
      {
        gameData.length > 0 ? 
        <>
          <Item
            item={currentItem}
            gameMode={true}
            updateWord={updateWord}
            nextAfterMark={() => setNextWord()}
          />
          <div className='game-buttons'>
            <a 
              href
              className='btn'
              onClick={addToUnknownWords}
            >
              {addedToUnknown ? "Added to unknown list" : "Add to unknown list"}
            </a>
            <a 
              href
              className='btn'
              onClick={setNextWord}
            >
              NEXT
            </a>
          </div>
        </> :
        <>
          <a
            href
            className='btn repeat'
            onClick={setDataForRepeat}
          >
            Repeat
          </a>
          <ItemList 
            data={unknownWords}
            gameData={gameData}
            gameMode={true}
            updateWord={updateWord}
          />
        </>
      }
    </div>
  )
}

export default Game