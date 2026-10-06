import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
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
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginLogo}>
          <div className={styles.loginLogoIcon}>QK</div>
          <span className={styles.loginLogoText}>Tồn Kho V2</span>
        </div>

        <h1 className={styles.loginTitle}>Đăng nhập hệ thống</h1>
        <p className={styles.loginSubtitle}>Quản lý kho hàng QKShop</p>

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          {error && <div className={styles.errorMsg}>{error}</div>}

          <div>
            <label className="form-label">Tên đăng nhập</label>
            <input
              type="text"
              className={styles.loginInput}
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              className={styles.loginInput}
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className={styles.loginBtn}
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
