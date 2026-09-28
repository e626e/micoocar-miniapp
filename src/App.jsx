import { useEffect, useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:3000/api/cars';

function App() {
  const [cars, setCars] = useState([]);
  const [carsLoading, setCarsLoading] = useState(true);
  const [carsError, setCarsError] = useState('');
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [favorites, setFavorites] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);

  const navigate = (nextPage) => {
    setPage(nextPage);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#ffffff');
      tg.setBackgroundColor('#ffffff');
      setUser(tg.initDataUnsafe?.user || null);
    }

    const loadCars = async () => {
      try {
        setCarsLoading(true);
        setCarsError('');

        const response = await fetch('https://' + 'micoocar-bot.onrender.com/api/cars');

        if (!response.ok) {
          throw new Error("Ошибка API: " + response.status);
        }

        const data = await response.json();

        console.log('MICOOCAR API:', data);

        if (!Array.isArray(data)) {
          throw new Error('API вернул данные в неправильном формате');
        }

        const preparedCars = data.map((car) => {
          const text = car.text || '';

          const yearMatch = text.match(/20\d{2}/);

          const mileageMatch = text.match(
            /Пробег\s*[—-]\s*([\d\s]+)\s*км/i
          );

          const priceMatch = text.match(
            /([\d\s]+)\s*₽/
          );

          const vinMatch = text.match(
            /(?:•\s*)?VIN\s*[:\-]?\s*([A-HJ-NPR-Z0-9]{17})\b/i
          );

          const engineMatch = text.match(
            /•?\s*([\d.,]+\s*(?:л\.?\s*)?(?:T|Т)?\s*(?:Бензин|Дизель|Гибрид|Электро|LPG|Газ))/i
          );

          const powerMatch = text.match(
            /Мощность\s*[—-]\s*([\d\s]+)\s*л\.?\s*с\.?/i
          );

          const fuelMatch = text.match(
            /\b(Бензин|Дизель|Гибрид|Электро|LPG|Газ)\b/i
          );

          const transmissionMatch = text.match(
            /\b(CVT|АКПП|МКПП|AT|DCT|DSG|робот|автомат|механика)\b/i
          );

          const driveMatch = text.match(
            /\b(2WD|4WD|AWD|FWD|RWD|передний привод|задний привод|полный привод)\b/i
          );

          const modelLine = text
            .split("\n")
            .map((line) => line.trim())
            .find((line) =>
              /^(MINI|BMW|Mercedes|Audi|BYD|Zeekr|Li Auto|Toyota|Honda|Volkswagen|Kia|Jetta)\b/i.test(line)
            );

          const modelMatch = modelLine
            ? modelLine.replace(
                /^(MINI|BMW|Mercedes|Audi|BYD|Zeekr|Li Auto|Toyota|Honda|Volkswagen|Kia|Jetta)\s*/i,
                ''
              ).replace(/\s+\d+(?:[.,]\d+)?\s*[TТLл]?\s*$/i, '')
            .trim()
            : null;

          const brandMatch = text.match(
            /MINI|BMW|Mercedes|Audi|BYD|Zeekr|Li Auto|Toyota|Honda|Volkswagen|Kia|Jetta/i
          );

          return {
            ...car,
            brand: brandMatch?.[0] || 'Автомобиль',
            model: modelMatch || 'Автомобиль',
            year: yearMatch?.[0] || '—',
            mileage: mileageMatch
              ? mileageMatch[1].trim() + " км"
              : '—',
            vin: vinMatch
              ? vinMatch[1].trim().toUpperCase()
              : '—',
            price: priceMatch
              ? priceMatch[1].trim() + " ₽"
              : 'Цена по запросу',
            engine: engineMatch
              ? engineMatch[1].replace(/\s+/g, ' ').trim()
              : '—',
            power: powerMatch
              ? powerMatch[1].trim() + ' л.с.'
              : '—',
            fuel: engineMatch
              ? (engineMatch[1].match(/(Бензин|Дизель|Гибрид|Электро|LPG|Газ)/i)?.[1] || '—')
              : '—',
            transmission: transmissionMatch
              ? transmissionMatch[1]
              : '—',
            drive: driveMatch
              ? driveMatch[1]
              : '—',
            photoUrl: car.photo
              ? `https://micoocar-bot.onrender.com/api/cars/${car.id}/photo`
            : null,
          };
        });

        console.log('MICOOCAR prepared cars:', preparedCars);

        setCars(preparedCars);
      } catch (error) {
        console.error('Ошибка загрузки автомобилей:', error);

        setCarsError(
          'Не удалось загрузить автомобили. Попробуйте обновить страницу.'
        );

        setCars([]);
      } finally {
        setCarsLoading(false);
      }
    };

    loadCars();
  }, []);

  const openCar = (car) => {
    setSelectedCar(car);
    navigate('car');
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

  const renderCarsState = () => {
    if (carsLoading) {
      return (
        <div className="empty-card">
          <div className="empty-icon">🚗</div>
          <h3>Загружаем автомобили</h3>
          <p>Получаем актуальные предложения MICOOCAR</p>
        </div>
      );
    }

    if (carsError) {
      return (
        <div className="empty-card">
          <div className="empty-icon">!</div>

          <h3>Не удалось загрузить каталог</h3>

          <p>{carsError}</p>

          <button
            className="main-button"
            onClick={() => window.location.reload()}
          >
            Обновить
          </button>
        </div>
      );
    }

    if (cars.length === 0) {
      return (
        <div className="empty-card">
          <div className="empty-icon">🚘</div>

          <h3>Пока нет автомобилей</h3>

          <p>
            Новые автомобили появятся здесь после публикации.
          </p>
        </div>
      );
    }

    return null;
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

        {carsLoading || carsError || cars.length === 0 ? (
          renderCarsState()
        ) : (
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
        )}
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

      {carsLoading || carsError || cars.length === 0 ? (
        renderCarsState()
      ) : (
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
      )}
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
                ? favoriteCars.length + " автомобиля"
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
              в избранное с помощью ♥
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
      return (
        <section className="section page-section">
          <div className="empty-card">
            <h3>Автомобиль не выбран</h3>

            <button
              className="main-button"
              onClick={() => navigate('catalog')}
            >
              Вернуться в каталог
            </button>
          </div>
        </section>
      );
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
            {car.photoUrl ? (
              <img
                src={car.photoUrl}
                alt={`${car.brand} ${car.model}`}
              />
            ) : (
              <span>
                {car.brand}
              </span>
            )}
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
              className={
                "favorite-button " + (isFavorite(car.id) ? "favorite-active" : "")
              }
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
              <span>VIN</span>
              <strong>{car.vin}</strong>
            </div>

            <div>
              <span>Двигатель</span>
              <strong>{car.engine}</strong>
            </div>

            <div>
              <span>Мощность</span>
              <strong>{car.power}</strong>
            </div>

            <div>
              <span>Коробка</span>
              <strong>{car.transmission}</strong>
            </div>

            <div>
              <span>Топливо</span>
              <strong>{car.fuel}</strong>
            </div>

            <div>
              <span>Привод</span>
              <strong>{car.drive}</strong>
            </div>
          </div>

          <button
            className="main-button detail-button"
            onClick={async () => {
              try {
                const tg = window.Telegram?.WebApp;
                const tgUser = tg?.initDataUnsafe?.user || user;

                const response = await fetch(
                  'https://micoocar-bot.onrender.com/api/leads',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      carId: car.id,
                      brand: car.brand,
                      model: car.model,
                      price: car.price,
                      vin: car.vin,
                      userId: tgUser?.id || null,
                      username: tgUser?.username || null,
                      firstName: tgUser?.first_name || null,
                      lastName: tgUser?.last_name || null,
                    }),
                  }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                  throw new Error('Не удалось отправить заявку');
                }

                alert('Заявка отправлена менеджеру 🚗');
              } catch (error) {
                console.error('Ошибка отправки заявки:', error);
                alert('Не удалось отправить заявку. Попробуйте ещё раз.');
              }
            }}
          >
            Оставить заявку
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
        {car.photoUrl ? (
          <img
            src={car.photoUrl}
            alt={`${car.brand} ${car.model}`}
          />
        ) : (
          <span>
            {car.brand}
          </span>
        )}

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

