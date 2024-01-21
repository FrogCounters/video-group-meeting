import React, { useRef, useState, useEffect } from 'react';
import image from '../../img/logo.png';
import styled from 'styled-components';
import socket from '../../socket';

const Modal = ({ children, show }) => {
  if (!show) {
    return (<></>);
  }
  return (
    <div className='absolute rounded-2xl shadow bg-white py-10 px-8 ml-32'>
      {children}
    </div>    
  )
}

const Main = ({ history }) => {
  const [showJoin, setShowJoin] = useState(false);

  const joinRoom = (e) => {
    e.preventDefault();
    const roomId = e.target[0].value;
    history.push(`/room/${roomId}`)
  }

  const createRoom = () => {
    const roomId = Math.floor(Math.random() * 1000);
    history.push(`/room/${roomId}`)
  }

  return (<div>
    <img src={image} width={500} className='mb-12'></img>
    <Modal show={showJoin}>
      <form onSubmit={joinRoom} className='flex flex-col items-start gap-y-6'>
        <h2 className='text-black text-2xl font-bold'>Join Meeting</h2>
        <input type="number" required placeholder='Meeting ID' className='border border-slate-600 active:border-blue-600 text-black text-xl px-2 py-1'></input>
        <div className='flex flex-row gap-x-4 justify-end'>
          <button onClick={() => setShowJoin(false)} className='px-4 py-1 rounded-xl border border-slate-600 text-black'>Cancel</button>
          <button className='px-4 py-1 rounded-xl border border-slate-600 text-black'>Join</button>
        </div>
      </form>
    </Modal>
    <div className='rounded-2xl bg-white px-12 py-8 flex flex-col gap-y-4 items-center'>
      <button onClick={() => setShowJoin(true)} style={{backgroundColor: "#3c64ed"}} className='rounded-xl border text-white font-bold w-96 text-center py-2'>
        Join a Meeting
      </button>
      <button onClick={createRoom} className='rounded-xl border border-slate-600 text-black w-96 text-center py-2'>
        Create a Meeting
      </button>
      <button onClick={createRoom} className='rounded-xl border border-slate-600 text-black w-96 text-center py-2'>
        How to play?
      </button>
    </div>
  </div>)
}

export default Main;
