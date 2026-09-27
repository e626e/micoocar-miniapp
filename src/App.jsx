import { useEffect, useState } from 'react';

import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [selectedCar, setSelectedCar] = useState(null);
  const [favorites, setFavorites] = useState([]);

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

  const cars = [
    {
      id: 1,
      brand: 'BYD',
      model: 'Song Plus',
      year: 2025,
      mileage: '12 000 км',
      engine: '1.5 л',
      power: '218 л.с.',
      price: '2 190 000 ₽',
    },
    {
      id: 2,
      brand: 'Li Auto',
      model: 'L7',
      year: 2025,
      mileage: '8 500 км',
      engine: '1.5 л',
      power: '449 л.с.',
      price: '4 290 000 ₽',
    },
    {
      id: 3,
      brand: 'Zeekr',
      model: '001',
      year: 2024,
      mileage: '15 200 км',
      engine: 'Электро',
      power: '544 л.с.',
      price: '4 590 000 ₽',
    },
  ];

  const navigate = (nextPage) => {
    setSelectedCar(null);
    setPage(nextPage);
    window.scrollTo(0, 0);
  };

  const openCar = (car) => {
    setSelectedCar(car);
    setPage('car');
    window.scrollTo(0, 0);
  };

  const toggleFavorite = (carId) => {
    setFavorites((current) => {
      if (current.includes(carId)) {
        return current.filter((id) => id !== carId);
      }

      return [...current, carId];
    });
  };

  const isFavorite = (carId) => {
    return favorites.includes(carId);
  };

  const renderHome = () => (
    <>
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

          <button
            className="main-button"
            onClick={() => navigate('catalog')}
          >
            Смотреть автомобили
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <h2>
            Популярные
          </h2>

          <button
            className="section-link"
            onClick={() => navigate('catalog')}
          >
            Все →
          </button>
        </div>

        <div className="cars-grid">
          {cars.slice(0, 2).map((car) => (
            <CarCard
              key={car.id}
              car={car}
              favorite={isFavorite(car.id)}
              onFavorite={toggleFavorite}
              onOpen={openCar}
            />
          ))}
        </div>
      </section>
    </>
  );

  const renderCatalog = () => (
    <section className="section page-section">
      <div className="page-header">
        <button
          className="back-button"
          onClick={() => navigate('home')}
        >
          ←
        </button>

        <div>
          <h2>Каталог</h2>
          <p>Автомобили из Китая</p>
        </div>
      </div>

      <div className="cars-grid">
        {cars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            favorite={isFavorite(car.id)}
            onFavorite={toggleFavorite}
            onOpen={openCar}
          />
        ))}
      </div>
    </section>
  );

  const renderFavorites = () => {
    const favoriteCars = cars.filter((car) =>
      favorites.includes(car.id)
    );

    return (
      <section className="section page-section">
        <div className="page-header">
          <div>
            <h2>Избранное</h2>
            <p>
              {favoriteCars.length > 0
                ? `${favoriteCars.length} автомобиля`
                : 'Сохранённые автомобили'}
            </p>
          </div>
        </div>

        {favoriteCars.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">
              ♡
            </div>

            <h3>
              Пока ничего нет
            </h3>

            <p>
              Добавляй понравившиеся автомобили
              в избранное с помощью ❤️
            </p>

            <button
              className="main-button"
              onClick={() => navigate('catalog')}
            >
              Открыть каталог
            </button>
          </div>
        ) : (
          <div className="cars-grid">
            {favoriteCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                favorite={true}
                onFavorite={toggleFavorite}
                onOpen={openCar}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderProfile = () => (
    <section className="section page-section">
      <div className="page-header">
        <div>
          <h2>Профиль</h2>
          <p>Ваш аккаунт MICOOCAR</p>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-large">
          {user?.first_name?.charAt(0) || '👤'}
        </div>

        <h3>
          {user?.first_name || 'Пользователь'}
        </h3>

        {user?.username && (
          <p>
            @{user.username}
          </p>
        )}

        <div className="profile-info">
          <div>
            <span>Избранное</span>
            <strong>{favorites.length}</strong>
          </div>

          <div>
            <span>Каталог</span>
            <strong>{cars.length}</strong>
          </div>
        </div>
      </div>
    </section>
  );

  const renderCar = () => {
    if (!selectedCar) {
      return null;
    }

    const car = selectedCar;

    return (
      <section className="section page-section">
        <button
          className="back-button"
          onClick={() => navigate('catalog')}
        >
          ← Назад
        </button>

        <div className="car-detail">
          <div className="car-image-large">
            <span>
              {car.brand}
            </span>
          </div>

          <div className="car-detail-header">
            <div>
              <div className="car-brand">
                {car.brand}
              </div>

              <h2>
                {car.model}
              </h2>
            </div>

            <button
              className={`favorite-button ${
                isFavorite(car.id) ? 'favorite-active' : ''
              }`}
              onClick={() => toggleFavorite(car.id)}
            >
              {isFavorite(car.id) ? '♥' : '♡'}
            </button>
          </div>

          <div className="car-price">
            {car.price}
          </div>

          <div className="spec-grid">
            <div>
              <span>Год</span>
              <strong>{car.year}</strong>
            </div>

            <div>
              <span>Пробег</span>
              <strong>{car.mileage}</strong>
            </div>

            <div>
              <span>Двигатель</span>
              <strong>{car.engine}</strong>
            </div>

            <div>
              <span>Мощность</span>
              <strong>{car.power}</strong>
            </div>
          </div>

          <button className="main-button detail-button">
            Связаться с менеджером
          </button>
        </div>
      </section>
    );
  };

  return (
    <div className="app">

      <header className="header">
        <button
          className="logo-button"
          onClick={() => navigate('home')}
        >
          <div className="logo">
            MICOOCAR
          </div>

          <div className="subtitle">
            Автомобили из Китая
          </div>
        </button>

        <button
          className="profile"
          onClick={() => navigate('profile')}
        >
          {user?.first_name?.charAt(0) || '👤'}
        </button>
      </header>

      <main>

        {page === 'home' && renderHome()}

        {page === 'catalog' && renderCatalog()}

        {page === 'favorites' && renderFavorites()}

        {page === 'profile' && renderProfile()}

        {page === 'car' && renderCar()}

      </main>

      <nav className="bottom-nav">

        <button
          className={`nav-item ${
            page === 'home' ? 'active' : ''
          }`}
          onClick={() => navigate('home')}
        >
          <span>⌂</span>
          <small>Главная</small>
        </button>

        <button
          className={`nav-item ${
            page === 'catalog' ? 'active' : ''
          }`}
          onClick={() => navigate('catalog')}
        >
          <span>🚗</span>
          <small>Каталог</small>
        </button>

        <button
          className={`nav-item ${
            page === 'favorites' ? 'active' : ''
          }`}
          onClick={() => navigate('favorites')}
        >
          <span>
            {favorites.length > 0 ? '♥' : '♡'}
          </span>

          <small>Избранное</small>
        </button>

        <button
          className={`nav-item ${
            page === 'profile' ? 'active' : ''
          }`}
          onClick={() => navigate('profile')}
        >
          <span>👤</span>
          <small>Профиль</small>
        </button>

      </nav>

    </div>
  );
}

function CarCard({
  car,
  favorite,
  onFavorite,
  onOpen,
}) {
  return (
    <div
      className="car-card"
      onClick={() => onOpen(car)}
    >
      <div className="car-image">
        <span>
          {car.brand}
        </span>

        <button
          className={`favorite-button ${
            favorite ? 'favorite-active' : ''
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite(car.id);
          }}
        >
          {favorite ? '♥' : '♡'}
        </button>
      </div>

      <div className="car-info">

        <div className="car-brand">
          {car.brand}
        </div>

        <h3>
          {car.model}
        </h3>

        <div className="car-meta">
          {car.year} · {car.mileage}
        </div>

        <div className="car-price">
          {car.price}
        </div>

      </div>
    </div>
  );
}

export default App;