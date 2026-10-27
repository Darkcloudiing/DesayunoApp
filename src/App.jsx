import React, { useState, useEffect } from 'react';
import ParticipantDraw from './components/ParticipantDraw';
import AdminPanel from './components/AdminPanel';
import ProjectorModal from './components/ProjectorModal';

export default function App() {
  const [view, setView] = useState('participant'); // 'participant' or 'admin'
  const [showProjector, setShowProjector] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [stats, setStats] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check URL query param e.g. ?admin=true or hash
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true' || window.location.hash === '#admin') {
      setView('admin');
    }
  }, []);

  const loadData = async () => {
    try {
      const [eventRes, netRes] = await Promise.all([
        fetch('/api/event'),
        fetch('/api/network-info')
      ]);

      if (eventRes.ok) {
        const eData = await eventRes.json();
        setEventData(eData.event);
        setStats(eData.stats);
      }

      if (netRes.ok) {
        const nData = await netRes.json();
        setNetworkInfo(nData);
      }
    } catch (err) {
      console.error('Error cargando datos del servidor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '2rem' }}>
      {/* View Switcher Container */}
      {view === 'participant' ? (
        <ParticipantDraw
          event={eventData}
          onSwitchToAdmin={() => setView('admin')}
        />
      ) : (
        <AdminPanel
          event={eventData}
          stats={stats}
          networkInfo={networkInfo}
          onRefresh={loadData}
          onOpenProjector={() => setShowProjector(true)}
          onSwitchToParticipant={() => setView('participant')}
        />
      )}

      {/* Projector Fullscreen Modal */}
      {showProjector && (
        <ProjectorModal
          event={eventData}
          stats={stats}
          networkInfo={networkInfo}
          onClose={() => setShowProjector(false)}
        />
      )}
    </main>
  );
}
