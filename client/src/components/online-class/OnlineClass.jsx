import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, safeJson } from "../../api/client";
import { dateKey } from "../../utils/date";

const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const className = (schedule) => schedule?.classId?.className || schedule?.classId?.courseId?.title || "Online class";
const courseName = (schedule) => schedule?.classId?.courseId?.title || schedule?.classId?.courseId?.subject || "Course";
const storedUser = () => safeJson(localStorage.getItem("user"), {});
const makePeerId = () => `${storedUser()?._id || "user"}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const videoSender = (pc) => pc.getSenders().find((sender) => sender._onlineVideoSender || sender.track?.kind === "video");

function VideoTile({ label, stream, muted = false, classNameValue = "", emptyText = "Camera connecting..." }) {
  const ref = useRef(null);
  const hasVideo = Boolean(stream?.getVideoTracks?.().some((track) => track.readyState !== "ended"));

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream || null;
  }, [stream]);

  return (
    <article className={`online-video-tile ${classNameValue}`}>
      {stream && <video ref={ref} autoPlay muted={muted} playsInline />}
      {!hasVideo && <div className="online-video-placeholder">{emptyText}</div>}
      <span>{label}</span>
    </article>
  );
}

export function OnlineClass({ role = "", onStatus }) {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  const localPeerId = useRef("");
  const roomId = useRef("");
  const localStream = useRef(null);
  const screenStream = useRef(null);
  const peers = useRef(new Map());
  const queuedIce = useRef(new Map());
  const lastSignalAt = useRef(new Date(0).toISOString());
  const messageIds = useRef(new Set());
  const signalIds = useRef(new Set());
  const pollTimer = useRef(null);
  const heartbeatTimer = useRef(null);

  const user = storedUser();
  const isTeacher = role === "teacher";
  const localParticipant = participants.find((item) => item.peerId === localPeerId.current || item.userId === user?._id);
  const canUseMic = isTeacher || Boolean(localParticipant?.micAllowed);

  const load = useCallback(async () => {
    setMessage("Loading online classes...");
    const data = await api("/api/online-classes");
    setItems(data);
    setMessage("");
  }, []);

  useEffect(() => {
    load().catch((err) => {
      setMessage(err.message || "Could not load online classes.");
      onStatus?.(err.message || "Could not load online classes.");
    });
  }, [load, onStatus]);

  const activeVideoTrack = () =>
    screenSharing && screenStream.current
      ? screenStream.current.getVideoTracks()[0] || null
      : localStream.current?.getVideoTracks()[0] || null;

  const activeVideoStream = () => (screenSharing && screenStream.current ? screenStream.current : localStream.current);

  const sendSignal = useCallback(async (toPeerId, type, payload) => {
    const sessionId = roomId.current;
    if (!sessionId || !toPeerId) return;
    await api(`/api/online-classes/${sessionId}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPeerId: localPeerId.current, toPeerId, type, payload }),
    });
  }, []);

  const ensurePeer = useCallback((remotePeerId) => {
    if (peers.current.has(remotePeerId)) return peers.current.get(remotePeerId);
    const pc = new RTCPeerConnection(rtcConfig);

    localStream.current?.getAudioTracks().forEach((track) => pc.addTrack(track, localStream.current));
    const videoTrack = activeVideoTrack();
    if (videoTrack) {
      const sender = pc.addTrack(videoTrack, activeVideoStream() || localStream.current);
      sender._onlineVideoSender = true;
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) sendSignal(remotePeerId, "candidate", event.candidate).catch(() => {});
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStreams((current) => {
        const next = new Map(current);
        next.set(remotePeerId, stream);
        return next;
      });
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        pc.close();
        peers.current.delete(remotePeerId);
        setRemoteStreams((current) => {
          const next = new Map(current);
          next.delete(remotePeerId);
          return next;
        });
      }
    };
    peers.current.set(remotePeerId, pc);
    return pc;
  }, [sendSignal, screenSharing]);

  const offerTo = useCallback(async (remotePeerId) => {
    const pc = ensurePeer(remotePeerId);
    if (pc.signalingState !== "stable") return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal(remotePeerId, "offer", offer);
  }, [ensurePeer, sendSignal]);

  const queueIce = (remotePeerId, candidate) => {
    if (!queuedIce.current.has(remotePeerId)) queuedIce.current.set(remotePeerId, []);
    queuedIce.current.get(remotePeerId).push(candidate);
  };

  const flushQueuedIce = async (remotePeerId, pc) => {
    const pending = queuedIce.current.get(remotePeerId) || [];
    queuedIce.current.delete(remotePeerId);

    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore candidates that are no longer valid for the current SDP.
      }
    }
  };

  const handleSignal = useCallback(async (signal) => {
    const pc = ensurePeer(signal.fromPeerId);
    if (signal.type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      await flushQueuedIce(signal.fromPeerId, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(signal.fromPeerId, "answer", answer);
    }
    if (signal.type === "answer" && pc.signalingState !== "stable") {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      await flushQueuedIce(signal.fromPeerId, pc);
    }
    if (signal.type === "candidate") {
      if (!pc.remoteDescription) {
        queueIce(signal.fromPeerId, signal.payload);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
      } catch {
        queueIce(signal.fromPeerId, signal.payload);
      }
    }
  }, [ensurePeer, sendSignal]);

  const syncPeers = useCallback(async (nextParticipants) => {
    const remotePeers = (nextParticipants || []).filter((item) => item.peerId && item.peerId !== localPeerId.current);
    const active = new Set(remotePeers.map((item) => item.peerId));

    peers.current.forEach((pc, id) => {
      if (!active.has(id)) {
        pc.close();
        peers.current.delete(id);
        setRemoteStreams((current) => {
          const next = new Map(current);
          next.delete(id);
          return next;
        });
      }
    });

    for (const participant of remotePeers) {
      ensurePeer(participant.peerId);
      if (localPeerId.current > participant.peerId) await offerTo(participant.peerId);
    }
  }, [ensurePeer, offerTo]);

  const pollState = useCallback(async () => {
    const sessionId = roomId.current;
    if (!sessionId) return;
    const state = await api(`/api/online-classes/${sessionId}/state?peerId=${encodeURIComponent(localPeerId.current)}&since=${encodeURIComponent(lastSignalAt.current)}`);
    const nextSignals = (state.signals || []).filter((signal) => {
      const id = String(signal._id || `${signal.fromPeerId}:${signal.toPeerId}:${signal.type}:${signal.createdAt}`);
      if (signalIds.current.has(id)) return false;
      signalIds.current.add(id);
      return true;
    });
    const eventTimes = [...(state.messages || []), ...nextSignals]
      .map((item) => new Date(item.createdAt).getTime())
      .filter((time) => Number.isFinite(time));

    if (eventTimes.length) {
      lastSignalAt.current = new Date(Math.max(0, Math.max(...eventTimes) - 1)).toISOString();
    }

    setRoom(state);
    setParticipants(state.participants || []);
    setMessages((current) => {
      const next = [...current];
      (state.messages || []).forEach((item) => {
        if (!messageIds.current.has(item._id)) {
          messageIds.current.add(item._id);
          next.push(item);
        }
      });
      return next.slice(-200);
    });
    await syncPeers(state.participants || []);
    for (const signal of nextSignals) await handleSignal(signal);

    if (state.status !== "live") closeRoom(false);
  }, [handleSignal, syncPeers]);

  const closeRoom = useCallback(async (sendLeave = true) => {
    const sessionId = roomId.current;
    window.clearInterval(pollTimer.current);
    window.clearInterval(heartbeatTimer.current);
    pollTimer.current = null;
    heartbeatTimer.current = null;
    peers.current.forEach((pc) => pc.close());
    peers.current.clear();
    queuedIce.current.clear();
    localStream.current?.getTracks().forEach((track) => track.stop());
    screenStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    screenStream.current = null;
    if (sendLeave && sessionId) {
      await api(`/api/online-classes/${sessionId}/leave`, { method: "POST" }).catch(() => {});
    }
    setRoom(null);
    setParticipants([]);
    setMessages([]);
    setRemoteStreams(new Map());
    setMicOn(false);
    setCameraOn(true);
    setScreenSharing(false);
    roomId.current = "";
    localPeerId.current = "";
    lastSignalAt.current = new Date(0).toISOString();
    messageIds.current.clear();
    signalIds.current.clear();
    load().catch(() => {});
  }, [load]);

  useEffect(() => () => {
    window.clearInterval(pollTimer.current);
    window.clearInterval(heartbeatTimer.current);
    peers.current.forEach((pc) => pc.close());
    queuedIce.current.clear();
    roomId.current = "";
    localStream.current?.getTracks().forEach((track) => track.stop());
    screenStream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!room) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [room]);

  const joinSession = async (session) => {
    try {
      setMessage("");
      localPeerId.current = makePeerId();
      lastSignalAt.current = new Date(0).toISOString();
      messageIds.current.clear();
      signalIds.current.clear();
      queuedIce.current.clear();
      const joined = await api(`/api/online-classes/${session._id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: localPeerId.current }),
      });
      roomId.current = joined._id;

      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => new MediaStream());
        setCameraOn(false);
      }
      const nextMic = isTeacher;
      localStream.current.getAudioTracks().forEach((track) => { track.enabled = nextMic; });
      setMicOn(nextMic);
      setRoom(joined);
      setParticipants(joined.participants || []);
      setMessages(joined.messages || []);
      (joined.messages || []).forEach((item) => messageIds.current.add(item._id));
      await syncPeers(joined.participants || []);
      pollTimer.current = window.setInterval(() => pollState().catch(() => {}), 2000);
      heartbeatTimer.current = window.setInterval(() => {
        api(`/api/online-classes/${joined._id}/heartbeat`, { method: "POST" }).catch(() => {});
      }, 15000);
    } catch (err) {
      setMessage(err.message || "Could not join online class.");
      onStatus?.(err.message || "Could not join online class.");
      await closeRoom(false);
    }
  };

  const openClass = async (scheduleId) => {
    setMessage("");
    const session = await api(`/api/online-classes/${scheduleId}/open`, { method: "POST" });
    await load();
    await joinSession(session);
  };

  const toggleCamera = async () => {
    if (screenSharing) return;
    const next = !cameraOn;
    if (next && !localStream.current?.getVideoTracks()[0]) {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = cameraStream.getVideoTracks()[0];
      localStream.current.addTrack(track);
      for (const pc of peers.current.values()) {
        const sender = videoSender(pc);
        if (sender) await sender.replaceTrack(track);
      }
    }
    localStream.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    setCameraOn(next);
  };

  const toggleMic = () => {
    if (!canUseMic) {
      onStatus?.("Teacher has not allowed your microphone yet.");
      return;
    }
    const next = !micOn;
    localStream.current?.getAudioTracks().forEach((track) => { track.enabled = next; });
    setMicOn(next);
  };

  const replaceOutgoingVideo = async (track) => {
    for (const pc of peers.current.values()) {
      const sender = videoSender(pc);
      if (sender) await sender.replaceTrack(track);
    }
  };

  const stopShareScreen = async () => {
    screenStream.current?.getTracks().forEach((track) => track.stop());
    screenStream.current = null;
    setScreenSharing(false);
    await replaceOutgoingVideo(cameraOn ? localStream.current?.getVideoTracks()[0] || null : null);
  };

  const shareScreen = async () => {
    if (screenSharing) return stopShareScreen();
    if (!navigator.mediaDevices?.getDisplayMedia) {
      onStatus?.("Screen sharing is not supported in this browser.");
      return;
    }
    screenStream.current = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = screenStream.current.getVideoTracks()[0];
    track.addEventListener("ended", () => stopShareScreen().catch(() => {}));
    setScreenSharing(true);
    await replaceOutgoingVideo(track);
  };

  const requestSpeak = async () => {
    await api(`/api/online-classes/${room._id}/speak-request`, { method: "POST" });
    await pollState();
  };

  const setMicPermission = async (userId, allowed) => {
    await api(`/api/online-classes/${room._id}/mic-permission`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, allowed }),
    });
    await pollState();
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get("message") || "").trim();
    if (!text) return;
    const sessionId = roomId.current || room?._id;
    if (!sessionId) return;

    try {
      const saved = await api(`/api/online-classes/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      form.reset();
      if (saved?._id) {
        messageIds.current.add(saved._id);
        setMessages((current) => [...current, saved].slice(-200));
      }
      await pollState();
    } catch (err) {
      setMessage(err.message || "Could not send comment.");
      onStatus?.(err.message || "Could not send comment.");
    }
  };

  const endClass = async () => {
    if (!window.confirm("End this online class?")) return;
    await api(`/api/online-classes/${room._id}/end`, { method: "POST" });
    await closeRoom(false);
  };

  const localPreviewStream = screenSharing && screenStream.current ? screenStream.current : localStream.current;
  const teacherParticipant = participants.find((item) => item.role === "teacher") || (isTeacher ? localParticipant : null);
  const isLocalTeacher = teacherParticipant?.peerId === localPeerId.current || (!teacherParticipant && isTeacher);
  const teacherStream = isLocalTeacher ? localPreviewStream : remoteStreams.get(teacherParticipant?.peerId) || null;
  const teacherLabel = screenSharing && isLocalTeacher
    ? "Teacher screen"
    : `${teacherParticipant?.fullName || user?.fullName || "Teacher"}${isLocalTeacher ? " (You)" : ""}`;
  const studentTiles = participants
    .filter((item) => item.role !== "teacher")
    .map((item) => ({
      participant: item,
      stream: item.peerId === localPeerId.current ? localPreviewStream : remoteStreams.get(item.peerId) || null,
      muted: item.peerId === localPeerId.current,
    }));

  return (
    <section className="online-class-shell">
      {message && <div className="status-message">{message}</div>}
      <div className="online-class-list">
        {items.map((item) => {
          const live = item.session?.status === "live" && item.isClassTime;
          return (
            <article className={`online-class-card ${live ? "live" : ""}`} key={item.schedule?._id}>
              <div className="online-class-main">
                <span className="online-class-date">{dateKey(item.schedule?.date)}</span>
                <h3>{className(item.schedule)}</h3>
                <p>{courseName(item.schedule)}</p>
                <div className="online-class-meta">
                  <span>{item.schedule?.startTime || "--:--"} - {item.schedule?.endTime || "--:--"}</span>
                  <span>{item.schedule?.room || "Online"}</span>
                </div>
              </div>
              <div className="online-class-actions">
                <span className={`online-status ${live ? "live" : item.isClassTime ? "ready" : ""}`}>
                  {live ? "Live now" : item.isClassTime ? "Class time" : "Scheduled"}
                </span>
                {isTeacher
                  ? live
                    ? <button type="button" onClick={() => joinSession(item.session)}>Enter room</button>
                    : <button type="button" disabled={!item.canOpen} onClick={() => openClass(item.schedule._id)}>Open class</button>
                  : <button type="button" disabled={!item.canJoin} onClick={() => item.session && joinSession(item.session)}>Join class</button>}
              </div>
            </article>
          );
        })}
        {!items.length && !message && <div className="empty-state">No online classes found.</div>}
      </div>

      {room && createPortal((
        <div className="online-room-modal">
          <section className="online-room">
            <header className="online-room-header">
              <div>
                <span>Live class</span>
                <h2>{className(room.scheduleId)}</h2>
                <p>{courseName(room.scheduleId)} - {room.scheduleId?.startTime || ""} to {room.scheduleId?.endTime || ""}</p>
              </div>
              <button className="online-close-button" type="button" onClick={() => closeRoom(true)}>Leave</button>
            </header>
            <div className="online-room-body">
              <section className="online-stage">
                <div className="online-video-layout">
                  <VideoTile
                    label={teacherLabel}
                    stream={teacherStream}
                    muted={isLocalTeacher}
                    classNameValue="teacher-main"
                    emptyText="Waiting for teacher camera..."
                  />
                  <div className="online-student-strip" aria-label="Student cameras">
                    {studentTiles.map(({ participant, stream, muted }) => (
                      <VideoTile
                        key={participant.peerId}
                        label={`${participant.fullName}${participant.peerId === localPeerId.current ? " (You)" : ""}`}
                        stream={stream}
                        muted={muted}
                        classNameValue="student-thumb"
                        emptyText="Camera not connected"
                      />
                    ))}
                    {!studentTiles.length && <div className="online-student-empty">No students in the room yet.</div>}
                  </div>
                </div>
                <div className="online-controls">
                  <button type="button" disabled={screenSharing} onClick={toggleCamera}>{cameraOn ? "Camera off" : "Camera on"}</button>
                  <button type="button" disabled={!canUseMic} onClick={toggleMic}>{micOn ? "Mute" : canUseMic ? "Talk" : "Mic locked"}</button>
                  {isTeacher && <button className={screenSharing ? "active" : ""} type="button" onClick={shareScreen}>{screenSharing ? "Stop sharing" : "Share screen"}</button>}
                  {!isTeacher && !canUseMic && <button type="button" onClick={requestSpeak}>{localParticipant?.handRaised ? "Waiting approval" : "Request to speak"}</button>}
                  {isTeacher && <button type="button" className="danger" onClick={endClass}>End class</button>}
                </div>
              </section>
              <aside className="online-side">
                <section>
                  <h3>Participants</h3>
                  <div className="online-participants">
                    {participants.map((item) => (
                      <div className="online-participant" key={item.peerId}>
                        <div><strong>{item.fullName}</strong><span>{item.role}{item.handRaised ? " - wants to speak" : ""}</span></div>
                        {isTeacher && item.role !== "teacher"
                          ? <button className="online-small-button" type="button" onClick={() => setMicPermission(item.userId, !item.micAllowed)}>{item.micAllowed ? "Mute" : "Allow mic"}</button>
                          : <span className="online-mic-state">{item.micAllowed ? "Mic allowed" : "Muted"}</span>}
                      </div>
                    ))}
                  </div>
                </section>
                <section className="online-chat">
                  <h3>Comments</h3>
                  <div className="online-chat-messages">
                    {messages.map((item) => (
                      <div className={`online-chat-message ${item.senderId === user?._id ? "mine" : ""}`} key={item._id}>
                        <strong>{item.fullName}</strong>
                        <p>{item.text}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendMessage}>
                    <input name="message" type="text" placeholder="Write a comment..." autoComplete="off" />
                    <button type="submit">Send</button>
                  </form>
                </section>
              </aside>
            </div>
          </section>
        </div>
      ), document.body)}
    </section>
  );
}
