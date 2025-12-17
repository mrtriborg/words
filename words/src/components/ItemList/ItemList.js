import React, { useState } from 'react';
import Item from '../Item/Item';
import './ItemList.css';

const ItemList = ({data, gameData, setGameData, gameMode, updateWord}) => {
  const [currentItemId, setCurrentItemId] = useState(null);
  return (
    <div className={gameMode ? 'game-mode-item-list' : 'item-list'}>
      {
        data.map(item => {
          return <Item 
            key={item.id} 
            item={item}
            allData={data} 
            gameData={gameData} 
            setGameData={setGameData} 
            gameMode={gameMode}
            updateWord={updateWord}
            currentItemId={currentItemId} 
            setCurrentItemId={setCurrentItemId}
          />
        })
      }
    </div>    
  )
}

export default ItemList;