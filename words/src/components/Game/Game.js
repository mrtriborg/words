import React, { useEffect, useState, useCallback } from 'react';
import ItemList from '../ItemList/ItemList';
import Item from '../Item/Item';
import './Game.css';

const Game = ({data, updateWord, onSessionEnd}) => {
  const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  useEffect(() => {
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
    setUnknownWords([]);
    setAddedToUnknown(false);
    setIsRepeatMode(false);
  }, [data])

  const [gameData, setGameData] = useState([]);
  const [gameDataRepeat, setGameDataRepeat] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [unknownWords, setUnknownWords] = useState([]);
  const [addedToUnknown, setAddedToUnknown] = useState(false);
  const [isRepeatMode, setIsRepeatMode] = useState(false);
  const hasStartedRef = React.useRef(false);
  const endedRef = React.useRef(false);

  const setDataForRepeat = useCallback(() => {
    if (unknownWords.length > 0) {
      const shuffledUnknown = shuffle([...unknownWords]);
      setGameData(shuffledUnknown);
      setCurrentItem(shuffledUnknown[0]);
      setIsRepeatMode(true);
    } else {
      const dataForRepeat = structuredClone(gameDataRepeat);
      setGameData(structuredClone(gameDataRepeat));
      setCurrentItem(dataForRepeat[0]);
      setIsRepeatMode(false);
    }
  }, [unknownWords, gameDataRepeat]);

  const addToUnknownWords = () => {
    setAddedToUnknown(!addedToUnknown)
  }

  const setNextWord = () => {
    gameData.shift();
    const updatedData = [...gameData];
    if (addedToUnknown) {
      const allUnknownItems = [...unknownWords];
      allUnknownItems.push(currentItem);
      setUnknownWords(allUnknownItems);
    }

    setAddedToUnknown(false);
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
      if (isRepeatMode) {
        // In repeat mode, stay in repeat mode, show repeat button
      } else if (unknownWords.length > 0) {
        // Stay in game to show unknown words and repeat button
      } else {
        endedRef.current = true;
        if (onSessionEnd) onSessionEnd();
      }
    }
  }, [gameData, onSessionEnd, unknownWords, isRepeatMode, setDataForRepeat]);
  
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
            {!isRepeatMode && (
              <a 
                href
                className='btn'
                onClick={addToUnknownWords}
                disabled={addedToUnknown}
              >
                {addedToUnknown ? "Added to unknown list" : "Add to unknown list"}
              </a>
            )}
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
          { (unknownWords.length > 0 || isRepeatMode) && (
            <a
              href
              className='btn repeat'
              onClick={setDataForRepeat}
            >
              Repeat
            </a>
          )}
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