import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import MonitorView from './MonitorView';
import './App.css';
import notificationSound from './assets/notification.mp3';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_URL = `${API_BASE_URL}/api/doctor/status`;
const QUEUE_URL = `${API_BASE_URL}/api/queue`;
const ADVANCE_URL = `${API_BASE_URL}/api/queue/advance`;
const SOCKET_URL = API_BASE_URL;

function App() {
  const [doctorAvailable, setDoctorAvailable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [patientName, setPatientName] = useState('');
  const [queueError, setQueueError] = useState(null);

  const [showMonitor, setShowMonitor] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  const audioRef = useState(() => new Audio(notificationSound))[0];

  // Socket.IO setup
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on('doctorStatus', (status) => {
      setDoctorAvailable(status);
      setLoading(false);
    });
    socket.on('queueUpdate', (queueData) => {
      setQueue(queueData);
      setQueueLoading(false);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch doctor status on mount (fallback for initial load)
  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        setDoctorAvailable(data.available);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to fetch doctor status');
        setLoading(false);
      });
  }, []);

  // Fetch queue (fallback for initial load)
  const fetchQueue = () => {
    setQueueLoading(true);
    fetch(QUEUE_URL)
      .then((res) => res.json())
      .then((data) => {
        setQueue(data.queue);
        setQueueLoading(false);
      })
      .catch(() => {
        setQueueError('Failed to fetch queue');
        setQueueLoading(false);
      });
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Add patient
  const handleAddPatient = (e) => {
    e.preventDefault();
    if (!patientName.trim()) return;
    fetch(QUEUE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: patientName.trim() }),
    })
      .then((res) => res.json())
      .then(() => {
        setPatientName('');
        // No need to fetchQueue, will update via socket
      })
      .catch(() => setQueueError('Failed to add patient'));
  };

  // Advance queue
  const handleAdvanceQueue = () => {
    fetch(ADVANCE_URL, { method: 'POST' })
      .then((res) => res.json())
      .then(() => {
        // No need to fetchQueue, will update via socket
      })
      .catch(() => setQueueError('Failed to advance queue'));
  };

  // Toggle doctor status (for demo)
  const toggleDoctorStatus = () => {
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: !doctorAvailable }),
    })
      .then((res) => res.json())
      .then((data) => setDoctorAvailable(data.available))
      .catch(() => setError('Failed to update status'));
  };

  // Check if registered patient is next
  useEffect(() => {
    if (!registeredName) return;
    const nextPatient = queue.find((p) => p.status === 'next') || queue[0];
    if (nextPatient && nextPatient.name.toLowerCase() === registeredName.toLowerCase()) {
      setShowNotification(true);
    } else {
      setShowNotification(false);
    }
  }, [queue, registeredName]);

  // Request notification permission on registration
  const handleRegisterName = (e) => {
    e.preventDefault();
    if (registeredName.trim()) {
      setRegisteredName(registeredName.trim());
      if (window.Notification && Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
    }
  };

  // Show browser notification and play sound when it's the patient's turn
  useEffect(() => {
    if (!registeredName) return;
    const nextPatient = queue.find((p) => p.status === 'next') || queue[0];
    if (
      nextPatient &&
      nextPatient.name.toLowerCase() === registeredName.toLowerCase()
    ) {
      // Play sound
      if (audioRef) {
        audioRef.currentTime = 0;
        audioRef.play();
      }
      // Browser notification
      if (window.Notification && Notification.permission === 'granted') {
        new Notification('ClinicQ', {
          body: `It is your turn! Please proceed to the doctor, ${registeredName}.`,
        });
      }
    }
  }, [queue, registeredName, audioRef]);

  if (showMonitor) {
    return (
      <>
        <button onClick={() => setShowMonitor(false)} style={{ position: 'absolute', top: 10, left: 10 }}>
          Back to App
        </button>
        <MonitorView />
      </>
    );
  }

  return (
    <div className="container">
      <button onClick={() => setShowMonitor(true)} style={{ position: 'absolute', top: 10, right: 10 }}>
        Monitor View
      </button>
      <h1>ClinicQ - Doctor Status & Patient Queue</h1>
      {/* Notification banner */}
      {showNotification && (
        <div style={{ background: '#1976d2', color: 'white', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: 20 }}>
          <b>{registeredName}</b>, it is your turn! Please proceed to the doctor.
        </div>
      )}
      {/* Register patient name */}
      <form onSubmit={handleRegisterName} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Enter your name to get notified"
          value={registeredName}
          onChange={e => setRegisteredName(e.target.value)}
        />
        <button type="submit">Register Name</button>
      </form>
      {loading ? (
        <p>Loading doctor status...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <>
          <h2>
            Doctor is: {doctorAvailable ? (
              <span style={{ color: 'green' }}>Available</span>
            ) : (
              <span style={{ color: 'red' }}>Unavailable</span>
            )}
          </h2>
          <button onClick={toggleDoctorStatus} style={{ marginBottom: 30 }}>
            Toggle Doctor Status (Demo)
          </button>
        </>
      )}

      <hr />
      <h2>Patient Queue</h2>
      <form onSubmit={handleAddPatient} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Enter patient name"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
        />
        <button type="submit">Add Patient</button>
      </form>
      <button onClick={handleAdvanceQueue} style={{ marginBottom: 20 }}>
        Advance Queue
      </button>
      {queueLoading ? (
        <p>Loading queue...</p>
      ) : queueError ? (
        <p style={{ color: 'red' }}>{queueError}</p>
      ) : queue.length === 0 ? (
        <p>No patients in queue.</p>
      ) : (
        <ul>
          {queue.map((patient, idx) => (
            <li
              key={idx}
              style={{
                fontWeight: patient.status === 'next' ? 'bold' : 'normal',
                color: patient.status === 'next' ? 'blue' : 'black',
              }}
            >
              {patient.name} {patient.status === 'next' && '← Next'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
