import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
//import Peer from './simple-peer'

console.log(Peer._channelReadyT)
const Container = styled.div`
    padding: 20px;
    display: flex;
    height: 100vh;
    width: 90%;
    margin: auto;
    flex-wrap: wrap;
`;


const StyledVideo = styled.video`
    height: 40%;
    width: 50%;
`;

const buttonAlign = {
    display: 'flex',
    alignItem: 'center',
    justifyContent: 'center',
    paddingTop: '15px'
}

const buttonStyle = {
    paddingRight: '10px',
    fontSize: '20px'
}
const Video = (props) => {
    const ref = useRef();

    useEffect(() => {
        props.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
    }, []);

    return (
        <StyledVideo playsInline autoPlay ref={ref} />

    );
}


const videoConstraints = {
    height: window.innerHeight / 2,
    width: window.innerWidth / 2
};

const Room = (props) => {
    delete Peer['destroy'];
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const roomID = props.match.params.roomID;
    let lastAudioId, lastVideoId;
    let pcObj;
    useEffect(() => {
        socketRef.current = io.connect("/");
        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true }).then(stream => {
            console.log(stream)
            console.log();
            userVideo.current.srcObject = stream;
            socketRef.current.emit("join room", roomID);
            socketRef.current.on("all users", users => {
                const peers = [];
                users.forEach(userID => {
                    const peer = createPeer(userID, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    })
                    peers.push(peer);
                })
                setPeers(peers);
            })

            socketRef.current.on("user joined", payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })

                setPeers(users => [...users, peer]);
            });

            socketRef.current.on("receiving returned signal", payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });
        })
    }, []);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
        })

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        peer.signal(incomingSignal);

        return peer;
    }

    function MuteAudio(e, isMute) {
        let videoElements = document.getElementsByTagName('video');
        console.log(videoElements)
        document.getElementById('currentUser').srcObject.getAudioTracks()[0].enabled = !isMute ? false : true;
        document.getElementById(e.target.id).style.cssText = 'color:red; padding-right:10px; font-size:20px'
        if (lastAudioId != undefined && lastAudioId !== e.target.id) {
            document.getElementById(lastAudioId).style.cssText = 'color:black; padding-right:10px; font-size:20px'
            lastAudioId = e.target.id;
        } else {
            lastAudioId = e.target.id;
        }
    }

    function MuteVideo(e, isMute) {
        document.getElementById('currentUser').srcObject.getVideoTracks()[0].enabled = !isMute ? false : true;
        document.getElementById(e.target.id).style.cssText = 'color:red; padding-right:10px; font-size:20px'
        if (lastVideoId != undefined && lastVideoId !== e.target.id) {
            document.getElementById(lastVideoId).style.cssText = 'color:black; padding-right:10px; font-size:20px'
            lastVideoId = e.target.id;
        } else {
            lastVideoId = e.target.id;
        }
    }

    function endCall(isEnd) {
        for (var i = 0; i < peers.length; i++) {
            if (peers[i]._pc != null && peers[i]._pc != undefined) {
                const senders = peers[i]._pc.getSenders();
                senders.forEach((sender) => {
                    peers[i]._pc.removeTrack(sender)

                });

            }
        }
        Array.prototype.slice.call(document.getElementsByTagName('video')).forEach(
            function (item) {
                if (item.id != 'currentUser' && item.srcObject != null) {
                    item.srcObject.getAudioTracks()[0].enabled = false;
                    item.remove();
                }
            }
        );
    }

    setInterval(function () {
        for (var j = 0; j < peers.length; j++) {
            if (peers[j] != null || peers[j] != undefined) {
                let videoElements = document.getElementsByTagName('video');
                var element = Array.prototype.slice.call(document.getElementsByTagName("video"), 0);
                for (var i = 0; i < videoElements.length; i++) {
                    if ((peers[j].destroyed && (videoElements[i].srcObject != null && videoElements[i].srcObject == undefined && videoElements[i].srcObject.active == false))
                        || (videoElements[i].srcObject != null && videoElements[i].srcObject.getVideoTracks()[0].muted == true)) {
                        console.log(videoElements[i].srcObject)
                        element[i].parentNode.removeChild(element[i]);
                    }

                }
            }
        }
    }, 5000)

    return (
        <div>
            <Container>
                <div style={{ width: '50%', height: '40%' }}>
                    <StyledVideo muted ref={userVideo} autoPlay playsInline id="currentUser" style={{ width: '100%', height: '100%' }} />
                    <div style={buttonAlign}>

                        <i class='fas fa-microphone-slash' id='muteAudio' style={buttonStyle} onClick={(e) => MuteAudio(e, false)} ></i>
                        <i class='fas fa-microphone' style={buttonStyle} id='unmuteAudio' onClick={(e) => MuteAudio(e, true)} ></i>
                        <i class='fas fa-video-slash' style={buttonStyle} id='muteVideo' onClick={(e) => MuteVideo(e, false)} ></i>
                        <i class='fas fa-video' style={buttonStyle} id='unmuteVideo' onClick={(e) => MuteVideo(e, true)} ></i>
                        <i class='far fa-stop-circle' style={buttonStyle} id='unmuteVideo' onClick={() => endCall(true)} ></i>

                        {/* <button onClick={() => MuteAudio(true)} style={{ height: '5%' }}>unMute</button>
                        <button onClick={() => MuteVideo(false, socketRef)} style={{ height: '5%' }}>Pause</button>
                        <button onClick={() => MuteVideo(true)} style={{ height: '5%' }}>Resume</button> */}
                        {peersRef['current'].length == 0 ? <p style={{ paddingLeft: '25px', color: 'red' }}>No other participants are available</p> : ''}
                    </div>
                </div>
                {peers.map((peer, index) => {
                    return (
                        <Video key={index} peer={peer} />
                    );
                })}
            </Container>
        </div>
    );
};



export default Room;
