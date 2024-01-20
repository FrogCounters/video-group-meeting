import React, { useState, useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import socket from '../../socket';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

const DEFAULT_THRESHOLD = 0.33;

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

const isPointValid = (point) => {
  return point.score > 0.33;
};

const euclideanDistance = (pointA, pointB) => {
  return Math.sqrt(Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2));
};

const NewRoom = ({ match }) => {
  const [videoDevices, setVideoDevices] = useState([]);
  const roomId = match.params.roomId
  const userVideoRef = useRef();
  const userStream = useRef();
  const peerRef = useRef();
  const [hasPeer, setHasPeer] = useState(false);
  const isReady = useRef(false);
  const [readyState, setReadyState] = useState(false);

  const [timesHit, setTimesHit] = useState(0);
  const [timesPunched, setTimesPunched] = useState(0);
  const lastLeftWrist = useRef(640);
  const lastRightWrist = useRef(0);
  const lastNose = useRef(320);
  const [health, setHealth] = useState(100);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [gameState, setGameState] = useState('waiting'); // ['waiting', 'playing', 'win', 'lose']

  const handleLeftPunch = () => {
    peerRef.current.send(JSON.stringify({
      type: 'punch',
      direction: 'left',
      timestamp: Date.now(),
    }));
  }

  const handleRightPunch = () => {
    console.log("Right Punch")
    peerRef.current.send(JSON.stringify({
      type: 'punch',
      direction: 'right',
      timestamp: Date.now(),
    }));
  }

  const handlePunched = (direction) => {
    console.log('nose', lastNose.current)
    if (direction == 'right' && lastNose.current > 320) {
      setHealth(health => health - 10)
    } else if (direction == 'left' && lastNose.current < 320) {
      setHealth(health => health - 10)
    }
  }

  useEffect(() => {
    if (peerRef.current == null) return;
    peerRef.current.send(JSON.stringify({
      type: 'health',
      health: health,
      timestamp: Date.now(),
    }));
  }, [health])

  const whileReady = (poses) => {
    console.log("While Readying")
    const leftWrist = poses[9];
    const rightWrist = poses[10];
    const leftElbow = poses[7];
    const rightElbow = poses[8];

    // Check for left punch
    if (!isPointValid(leftWrist) && !isPointValid(leftElbow)) {
      setTimesPunched(timesPunched => timesPunched + 1);
      handleLeftPunch();
      isReady.current = false;
      setReadyState(false);
      return
    }

    // Check for right punch
    if (!isPointValid(rightWrist) && !isPointValid(rightElbow)) {
      setTimesPunched(timesPunched => timesPunched + 1);
      handleRightPunch();
      isReady.current = false;
      setReadyState(false);
      return
    }
  }

  const whileNotReady = (poses) => {
    console.log("While Not Readying")
    const leftWrist = poses[9];
    const rightWrist = poses[10];
    const leftElbow = poses[7];
    const rightElbow = poses[8];
    const leftShoulder = poses[5];
    const rightShoulder = poses[6];

    const allPointsValid = [leftWrist, rightWrist, leftElbow, rightElbow, leftShoulder, rightShoulder].every(isPointValid);
    const leftDistance = euclideanDistance(leftWrist, leftShoulder);
    const rightDistance = euclideanDistance(rightWrist, rightShoulder);

    // console.log({
    //   allPointsValid: allPointsValid,
    //   leftDistance: leftDistance,
    //   rightDistance: rightDistance,
    // })

    if (allPointsValid && leftDistance <= 70 && rightDistance <= 70) {
      // setIsReady(true);
      isReady.current = true;
      setReadyState(true);
    }
  }

  const updateTrackers = (poses) => {
    const leftWrist = poses[9];
    const rightWrist = poses[10];
    const nose = poses[0];

    if (isPointValid(leftWrist)) {
      lastLeftWrist.current = leftWrist.x;
    }

    if (isPointValid(rightWrist)) {
      lastRightWrist.current = rightWrist.x;
    }

    if (isPointValid(nose)) {
      lastNose.current = nose.x.toFixed(2);
    }
  }

  useEffect(() => {
    if (!hasPeer) return;

    let detector;
    let animationFrameId;

    const initPoseDetector = async () => {
      await tf.ready();
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
      };
      detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
      animate();
    };

    /*
    0 - nose
    1 - left_eye
    2 - right_eye
    3 - left_ear
    4 - right_ear
    5 - left_shoulder
    6 - right_shoulder
    7 - left_elbow
    8 - right_elbow
    9 - left_wrist
    10 - right_wrist
    11 - left_hip
    12 - right_hip
    13 - left_knee
    14 - right_knee
    15 - left_ankle
    16 - right_ankle
    */

    const animate = async () => {
      if (userVideoRef.current && detector) {
        const poses = await detector.estimatePoses(userVideoRef.current);
        if (poses[0] != undefined) {
          updateTrackers(poses[0].keypoints);
          if (isReady.current) {
            whileReady(poses[0].keypoints);
          } else {
            whileNotReady(poses[0].keypoints);
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    initPoseDetector();

    // Cleanup function
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [hasPeer]);

  useEffect(() => {
    if (health <= 0) {
      peerRef.current.send(JSON.stringify({
        type: 'gameover',
        timestamp: Date.now(),
      }));
      setGameState('lose');
    }
  }, [health]);

  const handleData = (data) => {
    const parsed = JSON.parse(data);
    console.log("parsed", parsed)
    const { type, direction, health } = parsed
    if (type == 'punch') {
      handlePunched(direction)
    } else if (type == 'gameover') {
      setGameState('win');
    } else if (type == 'health') {
      setEnemyHealth(health);
    }
  }

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

    peer.on('data', handleData)

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

    peer.on('data', handleData)

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
          setGameState('playing');
        })
        socket.on('FE-call-accepted', ({ signal, answerId }) => {
          console.log('FE-call-accepted')
          peerRef.current.signal(signal);
          setGameState('playing');
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
    { (gameState == 'playing' || gameState == 'waiting') && (<>
      <div>
        { gameState == 'playing' && (<>
          <div>Health: { enemyHealth }</div>
          <div>Ready: { String(readyState) }</div>
        </>)}
        <PeerVideo hasPeer={hasPeer} peerRef={peerRef} />
      </div>
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        transform: 'scale(0.4)'
      }}>
        { gameState == 'playing' && (<>
          <div style={{ transform: 'scale(2.5)'}}>Health: { health }</div>
        </>)}
        <video ref={userVideoRef} autoPlay muted playsInline style={{ paddingTop: '20px', transform: 'scaleX(-1)' }} />
      </div>
    </>)}

    { gameState == 'win' && (<>
      <div>You win!</div>
    </>)}

    { gameState == 'lose' && (<>
      <div>You lose D:</div>
    </>)}
  </div>)
}

export default NewRoom;
