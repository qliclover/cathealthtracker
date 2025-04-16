import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { API_ENDPOINTS } from './config';
import { useNavigate } from 'react-router-dom';

const localizer = momentLocalizer(moment);

function HealthCalendarPage() {
  const [cats, setCats] = useState([]);
  const [records, setRecords] = useState([]);
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

        // 获取所有猫咪
        const catsResponse = await fetch(API_ENDPOINTS.GET_CATS, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!catsResponse.ok) {
          throw new Error('Failed to fetch cats');
        }

        const catsData = await catsResponse.json();
        setCats(catsData);

        // 获取所有猫咪的健康记录
        const allRecords = [];
        for (const cat of catsData) {
          const recordsResponse = await fetch(`${API_ENDPOINTS.GET_CAT}/${cat.id}/records`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (recordsResponse.ok) {
            const catRecords = await recordsResponse.json();
            if (Array.isArray(catRecords)) {
              // 添加猫咪信息到每条记录
              const recordsWithCatInfo = catRecords.map(record => ({
                ...record,
                catName: cat.name,
                catId: cat.id
              }));
              allRecords.push(...recordsWithCatInfo);
            }
          }
        }
        setRecords(allRecords);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // 将记录转换为日历事件格式
  const calendarEvents = records.map(record => ({
    id: record.id,
    title: `${record.catName} - ${record.type}`,
    start: new Date(record.date),
    end: new Date(record.date),
    allDay: true,
    resource: record
  }));

  // 处理事件点击
  const handleEventClick = (event) => {
    const record = event.resource;
    navigate(`/records/${record.id}/edit`);
  };

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
          <div style={{ height: 600 }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleEventClick}
              style={{ height: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default HealthCalendarPage;