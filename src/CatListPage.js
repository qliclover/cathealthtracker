import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function CatListPage() {
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(API_ENDPOINTS.GET_CATS, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          throw new Error('获取猫咪列表失败');
        }

        const data = await response.json();
        setCats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCats();
  }, [navigate]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">加载中...</span>
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>我的猫咪</h2>
        <Link to="/cats/add" className="btn btn-primary">
          添加猫咪
        </Link>
      </div>

      {cats.length === 0 ? (
        <div className="alert alert-info">
          您还没有添加任何猫咪。点击"添加猫咪"按钮来添加您的第一只猫咪。
        </div>
      ) : (
        <div className="row">
          {cats.map(cat => (
            <div key={cat.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{cat.name}</h5>
                  <h6 className="card-subtitle mb-2 text-muted">{cat.breed}</h6>
                  <p className="card-text">
                    <strong>年龄:</strong> {cat.age} 岁<br />
                    <strong>体重:</strong> {cat.weight} kg
                  </p>
                  <Link to={`/cats/${cat.id}`} className="btn btn-outline-primary">
                    查看详情
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CatListPage;