import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const SOCKET_URL = API_BASE_URL;

export default function MonitorView() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on('queueUpdate', (queueData) => {
      setQueue(queueData);
    });
    // Initial fetch fallback
    fetch(`${API_BASE_URL}/api/queue`)
      .then((res) => res.json())
      .then((data) => setQueue(data.queue));
    return () => socket.disconnect();
  }, []);

  const nextPatient = queue.find((p) => p.status === 'next') || queue[0];
  const waitingList = queue.filter((p) => p !== nextPatient);

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>ClinicQ Monitor</h1>
      <div style={{ fontSize: 32, margin: '40px 0', color: '#1976d2' }}>
        {nextPatient ? (
          <>
            Next: <b>{nextPatient.name}</b>
          </>
        ) : (
          'No patients in queue.'
        )}
      </div>
      {waitingList.length > 0 && (
        <div>
          <h2 style={{ fontSize: 22 }}>Waiting: {waitingList.length} patient{waitingList.length > 1 ? 's' : ''}</h2>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: 20 }}>
            {waitingList.map((p, idx) => (
              <li key={idx}>{p.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 