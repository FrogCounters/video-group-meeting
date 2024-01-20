import React, { useState, useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import socket from '../../socket';

const PeerVideo = ({ hasPeer, peerRef }) => {
  const ref = useRef();

  useEffect(() => {
    if (!hasPeer) return;
    peerRef.current.on('stream', (stream) => {
      ref.current.srcObject = stream;
      ref.current.play();
    });
  }, [hasPeer]);
  
  return (
    <video
      muted
      playsInline
      ref={ref}
    />
  );
}

const NewRoom = ({ match }) => {
  const [videoDevices, setVideoDevices] = useState([]);
  const roomId = match.params.roomId
  const userVideoRef = useRef();
  const userStream = useRef();
  const peerRef = useRef();
  const [hasPeer, setHasPeer] = useState(false);

  const createPeer = (userId, caller, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      if (signal.renegotiate || signal.transceiverRequest) return
      socket.emit('BE-call-user', {
        userToCall: userId,
        from: caller,
        signal,
      });
    });

    peer.on('disconnect', () => {
      peer.destroy();
    });

    return peer;
  }

  function addPeer(incomingSignal, callerId, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      if (signal.renegotiate || signal.transceiverRequest) return
      socket.emit('BE-accept-call', { signal, to: callerId });
    });

    peer.on('disconnect', () => {
      peer.destroy();
    });

    peer.signal(incomingSignal);
    return peer;
  }

  useEffect(() => {
    // Get Video Devices
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const filtered = devices.filter((device) => device.kind === 'videoinput');
      setVideoDevices(filtered);
    });

    // Connect Camera
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        console.log("stream", stream)
        userVideoRef.current.srcObject = stream;
        userStream.current = stream;

        console.log('socket.id', socket.id)
        socket.emit('BE-join-room', { roomId, userName: 'test' });
        socket.on('FE-user-join', (users) => {
          console.log('FE-user-join')
          if (users.length == 2 && users[0].userId == socket.id) {
            const peer = createPeer(users[1].userId, socket.id, stream)
            peerRef.current = peer;
            setHasPeer(true)
          }
        })
        socket.on('FE-receive-call', ({ signal, from }) => {
          console.log('FE-receive-call')
          const peer = addPeer(signal, from, stream);
          peerRef.current = peer;
          setHasPeer(true)
        })
        socket.on('FE-call-accepted', ({ signal, answerId }) => {
          console.log('FE-call-accepted')
          peerRef.current.signal(signal);
        })
      });

    return () => {
      setHasPeer(false)
      peerRef.current && peerRef.current.destroy();
      peerRef.current = null;
      socket.disconnect();
    };
  }, [roomId]);

  return (<div>
    <video ref={userVideoRef} autoPlay muted playsInline>
    </video>
    <PeerVideo hasPeer={hasPeer} peerRef={peerRef} />
    {roomId}
  </div>)
}

export default NewRoom;
