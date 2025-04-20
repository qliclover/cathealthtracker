// src/HealthCalendarPage.js
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { API_ENDPOINTS } from './config';
import { useNavigate } from 'react-router-dom';

const localizer = momentLocalizer(moment);

export default function HealthCalendarPage() {
  const [records, setRecords] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Fetch cats
        const catsRes = await fetch(API_ENDPOINTS.GET_CATS, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!catsRes.ok) throw new Error('Failed to fetch cats');
        const cats = await catsRes.json();

        // Fetch health records for each cat
        const allRecs = [];
        for (const cat of cats) {
          const recRes = await fetch(`${API_ENDPOINTS.GET_CAT}/${cat.id}/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (recRes.ok) {
            const recs = await recRes.json();
            if (Array.isArray(recs)) {
              allRecs.push(
                ...recs.map(r => ({
                  ...r,
                  catName: cat.name
                }))
              );
            }
          }
        }
        // Sort and keep most recent 5
        allRecs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecords(allRecs.slice(0, 5));

        // Load daily tasks from localStorage
        const stored = localStorage.getItem('dailyTasks');
        if (stored) {
          try {
            setTasks(JSON.parse(stored));
          } catch {
            localStorage.removeItem('dailyTasks');
          }
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Generate calendar events from health records + tasks
  const calendarEvents = [
    // Health record events
    ...records.map(record => ({
      id: `rec-${record.id}`,
      title: `${record.catName} - ${record.type}`,
      start: new Date(record.date),
      end: new Date(record.date),
      allDay: true
    })),
    // Task events for next 30 days
    ...generateTaskEvents(tasks)
  ];

  function generateTaskEvents(tasks) {
    const events = [];
    const today = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysAhead = 30;

    for (const task of tasks) {
      for (let i = 0; i < daysAhead; i++) {
        const d = new Date(today.getTime() + i * msPerDay);
        let include = false;

        switch (task.repeatType) {
          case 'none':
            include = i === 0;
            break;
          case 'daily':
            include = true;
            break;
          case 'weekly':
            include = d.getDay() === today.getDay();
            break;
          case 'monthly':
            include = d.getDate() === today.getDate();
            break;
          case 'yearly':
            include =
              d.getDate() === today.getDate() &&
              d.getMonth() === today.getMonth();
            break;
          default:
            break;
        }

        if (include) {
          const eventDate = new Date(d.setHours(0, 0, 0, 0));
          events.push({
            id: `task-${task.id}-${i}`,
            title:
              task.catId === 'all'
                ? `${task.title} (All Cats)`
                : task.title,
            start: eventDate,
            end: eventDate,
            allDay: true
          });
        }
      }
    }

    return events;
  }

  const handleSelectEvent = event => {
    if (event.id.startsWith('rec-')) {
      const recordId = event.id.replace('rec-', '');
      navigate(`/records/${recordId}/edit`);
    }
    // Task clicks could be handled similarly if you have an edit page
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: '50vh' }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Health Calendar</h2>
      <div className="card">
        <div className="card-body">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            onSelectEvent={handleSelectEvent}
            style={{ height: 600 }}
            views={['month', 'week', 'day']}
            defaultView="month"
          />
        </div>
      </div>
    </div>
  );
}
