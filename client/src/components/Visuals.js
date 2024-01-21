import React from 'react';
import fullHeart from '../img/fullheart.png'
import halfHeart from '../img/halfheart.png'
import yes from '../img/yes.png'
import no from '../img/no.png'

const HealthBar = ({ health }) => {
  // Calculate the number of full hearts and half hearts
  const fullHearts = Math.floor(health / 20);
  const hasHalfHeart = health % 20 !== 0;

  // Create an array to store heart components
  const hearts = Array(fullHearts).fill(fullHeart);

  // Add a half heart if necessary
  if (hasHalfHeart) {
    hearts.push(halfHeart);
  }

  return (
    <div style={{ display: 'flex' }}>
      {hearts.map((heart, index) => (
        <img
          key={index}
          src={heart}
          alt={`heart ${index + 1}`}
          style={{ width: '30px', height: '30px', marginRight: '5px' }}
        />
      ))}
    </div>
  );
};

const ReadyCheck = ({ isReady }) => {
  return (
    <div>
      {isReady ? (
        <img src={yes} alt="Yes" style={{ width: '40px', height: '40px' }} />
      ) : (
        <img src={no} alt="No" style={{ width: '40px', height: '40px' }} />
      )}
    </div>
  );
};

export {HealthBar, ReadyCheck};
