import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { API_ENDPOINTS } from './config';
import { useNavigate } from 'react-router-dom';

const localizer = momentLocalizer(moment);

function HealthCalendarPage() {
  const [events, setEvents] = useState([]);   
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Helper function to generate recurring events
  const generateRecurringEvents = (task, start, endDate, catName) => {
    const events = [];
    const interval = parseInt(task.repeatInterval, 10) || 1;
    const current = new Date(start);
    
    while (current <= endDate) {
      // Create event for current date
      events.push({
        id: `task-${task.id}-${current.toISOString()}`,
        title: `${task.title} (${catName})`,
        start: new Date(current),
        end: new Date(current),
        allDay: true
      });
      
      // Advance to next occurrence based on repeat type
      if (task.repeatType === 'day') {
        current.setDate(current.getDate() + interval);
      } else if (task.repeatType === 'week') {
        current.setDate(current.getDate() + (7 * interval));
      } else if (task.repeatType === 'month') {
        current.setMonth(current.getMonth() + interval);
      }
    }
    
    return events;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Retrieve auth token
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Fetch all cats (used locally for naming)
        const catsRes = await fetch(API_ENDPOINTS.GET_CATS, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!catsRes.ok) throw new Error('Failed to fetch cats');
        const catsData = await catsRes.json();

        // Fetch health records for each cat
        const recs = [];
        for (const cat of catsData) {
          const rRes = await fetch(`${API_ENDPOINTS.GET_CAT}/${cat.id}/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (rRes.ok) {
            const list = await rRes.json();
            list.forEach(r => {
              recs.push({
                id: `rec-${r.id}`,
                title: `${cat.name}: ${r.type}`,
                start: new Date(r.date),
                end:   new Date(r.date),
                allDay: true
              });
            });
          }
        }

        // Load custom tasks from localStorage
        let tasks = [];
        const stored = localStorage.getItem('dailyTasks');
        if (stored) {
          try {
            tasks = JSON.parse(stored);
          } catch {
            tasks = [];
          }
        }

        // Convert tasks into calendar events
        const taskEvents = [];
        const today = new Date();
        tasks.forEach(t => {
          const start = new Date(t.startDate);
          const catName = t.catId === 'all'
            ? 'All Cats'
            : (catsData.find(c => c.id === t.catId)?.name || '');

          if (t.repeatType === 'none') {
            // Single occurrence
            taskEvents.push({
              id:    `task-${t.id}`,
              title: `${t.title} (${catName})`,
              start,
              end:   start,
              allDay: true
            });
          } else {
            // Generate recurring events
            const endDate = t.endDate
              ? new Date(t.endDate)
              : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
              
            const recurringEvents = generateRecurringEvents(t, start, endDate, catName);
            taskEvents.push(...recurringEvents);
          }
        });

        // Combine and sort events
        const allEvents = [...recs, ...taskEvents];
        allEvents.sort((a, b) => a.start - b.start);
        setEvents(allEvents);

      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Health Calendar</h2>
      <div className="card">
        <div className="card-body">
          <div style={{ height: 600 }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              views={['month','week','day']}
              defaultView="month"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default HealthCalendarPage;