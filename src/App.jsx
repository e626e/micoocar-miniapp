import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      console.log('Telegram WebApp SDK не найден');
      return;
    }

    tg.ready();
    tg.expand();

    tg.setHeaderColor('#ffffff');
    tg.setBackgroundColor('#ffffff');

    document.documentElement.style.colorScheme = 'light';
    document.documentElement.style.backgroundColor = '#ffffff';

    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#111111';

    setUser(tg.initDataUnsafe?.user || null);
  }, []);

  return (
    <div className="app">

      <header className="header">
        <div>
          <div className="logo">
            MICOOCAR
          </div>

          <div className="subtitle">
            Автомобили из Китая
          </div>
        </div>

        <div className="profile">
          {user?.first_name?.charAt(0) || '👤'}
        </div>
      </header>

      <main>

        <section className="hero">

          <div className="hero-text">

            <span className="hero-label">
              MICOOCAR
            </span>

            <h1>
              Найди свой
              <br />
              автомобиль
            </h1>

            <p>
              Автомобили из Китая
            </p>

            <button className="main-button">
              Смотреть автомобили
            </button>

          </div>

        </section>

        <section className="section">

          <div className="section-title">
            <h2>
              Популярные
            </h2>

            <span>
              Все →
            </span>
          </div>

          <div className="empty-card">

            <div className="empty-icon">
              🚗
            </div>

            <h3>
              Автомобили скоро появятся
            </h3>

            <p>
              Мы уже готовим каталог автомобилей
              для MICOOCAR.
            </p>

          </div>

        </section>

      </main>

      <nav className="bottom-nav">

        <div className="nav-item active">
          <span>⌂</span>
          <small>Главная</small>
        </div>

        <div className="nav-item">
          <span>🚗</span>
          <small>Каталог</small>
        </div>

        <div className="nav-item">
          <span>♡</span>
          <small>Избранное</small>
        </div>

        <div className="nav-item">
          <span>👤</span>
          <small>Профиль</small>
        </div>

      </nav>

    </div>
  );
}

export default App;