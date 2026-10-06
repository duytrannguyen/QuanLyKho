import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/NguCanhXacThuc';

export default function TrangDangNhap() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login({ username, password });
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Sai tên đăng nhập hoặc mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f2137 0%, #1a3a5c 40%, #0d6efd 100%)', padding: '1rem' }}>
      <div className="card shadow-lg border-0 rounded-4 w-100" style={{ maxWidth: '420px', padding: '2.5rem' }}>
        <div className="d-flex align-items-center justify-content-center gap-3 mb-4">
          <div className="bg-primary text-white fw-bold d-flex align-items-center justify-content-center rounded" style={{ width: '48px', height: '48px', fontSize: '1.25rem', background: 'linear-gradient(135deg, #0d6efd, #6ea8fe)' }}>
            QK
          </div>
          <span className="fs-3 fw-bold text-dark">Tồn Kho V2</span>
        </div>

        <h3 className="text-center fw-bold text-dark mb-1">Đăng nhập hệ thống</h3>
        <p className="text-center text-secondary mb-4">Quản lý kho hàng QKShop</p>

        <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger p-2 text-center small mb-0">{error}</div>}

          <div>
            <label className="form-label fw-medium text-dark">Tên đăng nhập</label>
            <input
              type="text"
              className="form-control bg-light"
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="form-label fw-medium text-dark">Mật khẩu</label>
            <input
              type="password"
              className="form-control bg-light"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 fw-bold py-2 mt-2"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
