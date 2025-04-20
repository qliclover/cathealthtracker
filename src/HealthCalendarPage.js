// src/HealthCalendarPage.js
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';

const localizer = momentLocalizer(moment);

export default function HealthCalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Load only the customized tasks (from localStorage)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dailyTasks');
      if (stored) {
        setTasks(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load tasks', e);
      setError('Unable to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate calendar events from tasks
  const calendarEvents = generateTaskEvents(tasks);

  function generateTaskEvents(tasks) {
    const events = [];
    const today = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysAhead = 30; // show next 30 days

    tasks.forEach(task => {
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
            id: `${task.id}-${i}`,
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
    });

    return events;
  }

  const handleSelectEvent = event => {
    // tasks don't have detail pages; you could navigate elsewhere if needed
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
      <h2 className="mb-4">Task Calendar</h2>
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
