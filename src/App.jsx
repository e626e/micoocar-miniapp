import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = 'https://micoocar-bot.onrender.com/api/cars';
const PHOTO_URL = 'https://micoocar-bot.onrender.com/api/cars';

function parseCar(car) {
  const text = car?.text || '';

  const find = (patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return '';
  };

  const year =
    find([/•\s*(?:19|20)\d{2}\s*год/i, /(\d{4})\s*год/i]) ||
    car.year ||
    '';

  const mileage =
    find([
      /Пробег\s*[—:-]\s*([^\n]+)/i,
      /Пробег\s*([0-9\s]+)\s*км/i,
    ]) ||
    car.mileage ||
    '';

  const price =
    find([
      /💰\s*([^\n]+)/i,
      /Цена\s*[—:-]\s*([^\n]+)/i,
    ]) ||
    car.price ||
    '';

  const vin =
    find([/VIN\s*([A-Za-z0-9-]+)/i]) ||
    car.vin ||
    '';

  const engine =
    find([
      /(?:двигатель|объём|объем)\s*[—:-]\s*([^\n]+)/i,
      /•\s*([0-9.,]+[A-Za-zА-Яа-яЁё]*)\s*(?:Бензин|Дизель|Гибрид|Электро)/i,
    ]) ||
    car.engine ||
    '';

  const power =
    find([/Мощность\s*[—:-]\s*([^\n]+)/i]) ||
    car.power ||
    '';

  const fuel =
    find([
      /([0-9.,]+\s*(?:Т|T|л|L)?)\s*(Бензин|Дизель|Гибрид|Электро)/i,
    ]) ||
    car.fuel ||
    '';

  const transmission =
    find([
      /(?:КПП|Коробка|Трансмиссия)\s*[—:-]\s*([^\n]+)/i,
    ]) ||
    car.transmission ||
    '';

  const drive =
    find([/(?:Привод)\s*[—:-]\s*([^\n]+)/i]) ||
    car.drive ||
    '';

  let title = car.title || '';
  let brand = car.brand || '';
  let model = car.model || '';

  if (!brand || !model) {
    const titleMatch = text.match(
      /(?:В продаже|В ПРОДАЖЕ)[!:\s]*\n+([A-ZА-ЯЁ][^\n]+)/i
    );

    if (titleMatch?.[1]) {
      title = titleMatch[1].replace(/\s+/g, ' ').trim();

      const parts = title.split(' ');
      brand = brand || parts.shift() || '';
      model = model || parts.join(' ');
    }
  }

  if (!title) {
    title = [brand, model].filter(Boolean).join(' ');
  }

  return {
    ...car,
    title,
    brand,
    model,
    year,
    mileage,
    price,
    vin,
    engine,
    power,
    fuel,
    transmission,
    drive,
    photoUrl: car.photo
      ? `${PHOTO_URL}/${car.id}/photo`
      : '',
  };
}

function formatPrice(price) {
  if (!price) return 'Цена по запросу';

  const value = String(price)
    .replace(/₽/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/руб/i.test(value)) {
    return value.replace(/руб/i, '₽');
  }

  return `${value} ₽`;
}

function App() {
  const [page, setPage] = useState('home');
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [sendingLead, setSendingLead] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();

      try {
        tg.setHeaderColor('#f6f6f4');
        tg.setBackgroundColor('#f6f6f4');
      } catch {}

      setUser(tg.initDataUnsafe?.user || null);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('micoocar_favorites');

    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'micoocar_favorites',
      JSON.stringify(favorites)
    );
  }, [favorites]);

  useEffect(() => {
    loadCars();
  }, []);

  async function loadCars() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const publishedCars = Array.isArray(data)
        ? data
            .filter((car) => car.status === 'published')
            .map(parseCar)
        : [];

      setCars(publishedCars);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить каталог');
    } finally {
      setLoading(false);
    }
  }

  function toggleFavorite(carId) {
    setFavorites((current) =>
      current.includes(carId)
        ? current.filter((id) => id !== carId)
        : [...current, carId]
    );
  }

  function openCar(car) {
    setSelectedCar(car);
    setPage('car');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goHome() {
    setSelectedCar(null);
    setPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goCatalog() {
    setSelectedCar(null);
    setPage('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function sendLead(car) {
    if (sendingLead) return;

    try {
      setSendingLead(true);

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

      if (tg?.showPopup) {
        tg.showPopup({
          title: 'Заявка отправлена',
          message:
            'Менеджер получил информацию об автомобиле и свяжется с вами.',
          buttons: [{ type: 'ok' }],
        });
      } else {
        alert('Заявка отправлена менеджеру 🚗');
      }
    } catch (err) {
      console.error(err);

      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(
          'Не удалось отправить заявку. Попробуйте ещё раз.'
        );
      } else {
        alert('Не удалось отправить заявку. Попробуйте ещё раз.');
      }
    } finally {
      setSendingLead(false);
    }
  }

  const favoriteCars = useMemo(
    () => cars.filter((car) => favorites.includes(car.id)),
    [cars, favorites]
  );

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="brand-button"
          onClick={goHome}
          type="button"
        >
          <span className="brand-mark">M</span>
          <span className="brand-name">MICOOR CAR</span>
        </button>

        {page === 'car' ? (
          <button
            className="topbar-back"
            onClick={goCatalog}
            type="button"
          >
            ← Каталог
          </button>
        ) : (
          <div className="topbar-status">
            <span className="status-dot" />
            China → Worldwide
          </div>
        )}
      </header>

      <main className="main">
        {page === 'home' && (
          <HomePage
            cars={cars}
            loading={loading}
            onCatalog={goCatalog}
            onCar={openCar}
          />
        )}

        {page === 'catalog' && (
          <CatalogPage
            cars={cars}
            loading={loading}
            error={error}
            favorites={favorites}
            onCar={openCar}
            onFavorite={toggleFavorite}
            onRetry={loadCars}
          />
        )}

        {page === 'favorites' && (
          <FavoritesPage
            cars={favoriteCars}
            favorites={favorites}
            onCar={openCar}
            onFavorite={toggleFavorite}
          />
        )}

        {page === 'car' && selectedCar && (
          <CarDetail
            car={selectedCar}
            isFavorite={favorites.includes(selectedCar.id)}
            onFavorite={() => toggleFavorite(selectedCar.id)}
            onBack={goCatalog}
            onLead={() => sendLead(selectedCar)}
            sendingLead={sendingLead}
          />
        )}
      </main>

      {page !== 'car' && (
        <nav className="bottom-nav">
          <NavButton
            active={page === 'home'}
            icon="⌂"
            label="Главная"
            onClick={goHome}
          />

          <NavButton
            active={page === 'catalog'}
            icon="▦"
            label="Каталог"
            onClick={goCatalog}
          />

          <NavButton
            active={page === 'favorites'}
            icon="♡"
            label="Избранное"
            badge={favoriteCars.length}
            onClick={() => setPage('favorites')}
          />
        </nav>
      )}
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  badge,
  onClick,
}) {
  return (
    <button
      className={`nav-button ${active ? 'active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>

      {badge > 0 && (
        <span className="nav-badge">{badge}</span>
      )}
    </button>
  );
}
function HomePage({
  cars,
  loading,
  onCatalog,
  onCar,
}) {
  const featured = cars.slice(0, 3);

  return (
    <div className="page home-page">

      <section className="hero">
        <div className="hero-top">
          <div className="hero-kicker">MICOOR CAR</div>
          <span className="hero-location">CHINA / WORLDWIDE</span>
        </div>

        <div className="hero-content">
          <div className="hero-small-title">
            АВТОМОБИЛИ ИЗ КИТАЯ
          </div>

          <h1>
            Найди
            <br />
            свой <span>автомобиль.</span>
          </h1>

          <p className="hero-description">
            Подбор, проверка, покупка и доставка
            автомобиля из Китая.
          </p>

          <button
            className="primary-button hero-button"
            onClick={onCatalog}
            type="button"
          >
            <span>Смотреть автомобили</span>
            <span className="button-arrow">↗</span>
          </button>
        </div>

        <div className="hero-bottom">
          <span>01</span>
          <span className="hero-line" />
          <span>YOUR CAR / OUR ROUTE</span>
        </div>
      </section>

      <section className="green-intro">
        <div className="section-eyebrow light">
          О КОМПАНИИ
        </div>

        <h2>
          Мы превращаем
          <br />
          поиск автомобиля
          <br />
          <span>в понятный процесс.</span>
        </h2>

        <p>
          MICOOR CAR помогает найти автомобиль
          в Китае, проверить его перед покупкой
          и организовать доставку.
        </p>

        <div className="green-intro-number">
          <strong>01</strong>
          <span>MICOOR CAR</span>
        </div>
      </section>

      <section className="home-section advantages-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">
              MICOOR CAR
            </span>
            <h2>Почему мы</h2>
          </div>
        </div>

        <div className="advantages-grid">
          <div className="advantage-card green-card">
            <span>01</span>
            <div>
              <h3>Проверяем</h3>
              <p>
                Проверяем автомобиль и основные
                характеристики до покупки.
              </p>
            </div>
          </div>

          <div className="advantage-card">
            <span>02</span>
            <div>
              <h3>Подбираем</h3>
              <p>
                Помогаем найти автомобиль под ваши
                задачи и бюджет.
              </p>
            </div>
          </div>

          <div className="advantage-card">
            <span>03</span>
            <div>
              <h3>Сопровождаем</h3>
              <p>
                Менеджер остаётся на связи
                на протяжении всей сделки.
              </p>
            </div>
          </div>

          <div className="advantage-card">
            <span>04</span>
            <div>
              <h3>Доставляем</h3>
              <p>
                Организуем маршрут автомобиля
                из Китая до места назначения.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="process-section">
        <div className="section-eyebrow light">
          КАК ЭТО РАБОТАЕТ
        </div>

        <h2>
          От выбора
          <br />
          <span>до вашего гаража.</span>
        </h2>

        <div className="process-list">
          <div className="process-item">
            <span>01</span>
            <div>
              <strong>Выбираем автомобиль</strong>
              <p>
                Вы находите подходящий автомобиль
                в каталоге или оставляете заявку.
              </p>
            </div>
          </div>

          <div className="process-item">
            <span>02</span>
            <div>
              <strong>Проверяем</strong>
              <p>
                Согласовываем характеристики,
                состояние и стоимость.
              </p>
            </div>
          </div>

          <div className="process-item">
            <span>03</span>
            <div>
              <strong>Покупаем</strong>
              <p>
                Организуем покупку автомобиля
                и необходимые документы.
              </p>
            </div>
          </div>

          <div className="process-item">
            <span>04</span>
            <div>
              <strong>Доставляем</strong>
              <p>
                Организуем логистику из Китая
                до места назначения.
              </p>
            </div>
          </div>

          <div className="process-item">
            <span>05</span>
            <div>
              <strong>Вы получаете автомобиль</strong>
              <p>
                Финальный этап — автомобиль
                приезжает к вам.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="china-section">
        <div className="china-overlay">
          <div className="section-eyebrow light">
            CHINA
          </div>

          <h2>
            Большой выбор.
            <br />
            <span>Один правильный.</span>
          </h2>

          <p>
            Мы работаем с рынком автомобилей Китая
            и помогаем ориентироваться среди большого
            количества предложений.
          </p>

          <button
            className="outline-button"
            onClick={onCatalog}
            type="button"
          >
            Перейти в каталог
            <span>↗</span>
          </button>
        </div>
      </section>

      <section className="home-section cars-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">
              MICOOR CAR / SELECTION
            </span>
            <h2>Автомобили</h2>
          </div>

          <button
            className="text-button"
            onClick={onCatalog}
            type="button"
          >
            Все →
          </button>
        </div>

        {loading ? (
          <Loading />
        ) : featured.length ? (
          <div className="featured-list">
            {featured.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onClick={() => onCar(car)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Автомобили появятся здесь"
            text="Каталог обновляется по мере поступления новых автомобилей."
          />
        )}
      </section>

      <section className="request-section">
        <div className="section-eyebrow light">
          НЕ НАШЛИ НУЖНЫЙ?
        </div>

        <h2>
          Найдём
          <br />
          <span>для вас.</span>
        </h2>

        <p>
          Если подходящего автомобиля нет
          в каталоге — оставьте заявку.
          Мы поможем подобрать вариант.
        </p>

        <button
          className="request-button"
          onClick={onCatalog}
          type="button"
        >
          Смотреть автомобили
          <span>↗</span>
        </button>
      </section>

      <section className="home-navigation">
        <button
          className="home-navigation-card primary"
          onClick={onCatalog}
          type="button"
        >
          <span>01</span>
          <strong>Каталог</strong>
          <em>Смотреть автомобили ↗</em>
        </button>

        <button
          className="home-navigation-card"
          onClick={onCatalog}
          type="button"
        >
          <span>02</span>
          <strong>Избранное</strong>
          <em>Сохранённые автомобили ♡</em>
        </button>

        <button
          className="home-navigation-card"
          onClick={() => {}}
          type="button"
        >
          <span>03</span>
          <strong>Отзывы</strong>
          <em>Мнение наших клиентов ★</em>
        </button>
      </section>

      <footer className="home-footer">
        <div className="footer-logo">
          MICOOR CAR
        </div>

        <div className="footer-line" />

        <div className="footer-info">
          <span>АВТОМОБИЛИ ИЗ КИТАЯ</span>
          <span>CHINA → WORLDWIDE</span>
        </div>
      </footer>

    </div>
  );
}

function CatalogPage({
  cars,
  loading,
  error,
  favorites,
  onCar,
  onFavorite,
  onRetry,
}) {
  return (
    <div className="page">
      <section className="page-heading">
        <span className="section-eyebrow">
          MICOOR CAR / CATALOG
        </span>

        <h1>Каталог</h1>

        <div className="catalog-count">
          {cars.length} автомобилей
        </div>
      </section>

      {loading && <Loading />}

      {!loading && error && (
        <div className="error-state">
          <strong>Каталог временно недоступен</strong>
          <span>{error}</span>

          <button
            className="secondary-button"
            onClick={onRetry}
            type="button"
          >
            Повторить
          </button>
        </div>
      )}

      {!loading && !error && cars.length === 0 && (
        <EmptyState
          title="Пока пусто"
          text="Новые автомобили появятся здесь совсем скоро."
        />
      )}

      {!loading && !error && cars.length > 0 && (
        <div className="catalog-grid">
          {cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              favorite={favorites.includes(car.id)}
              onClick={() => onCar(car)}
              onFavorite={() => onFavorite(car.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoritesPage({
  cars,
  favorites,
  onCar,
  onFavorite,
}) {
  return (
    <div className="page">
      <section className="page-heading">
        <span className="section-eyebrow">
          MICOOR CAR / SAVED
        </span>

        <h1>Избранное</h1>

        <div className="catalog-count">
          {cars.length} сохранено
        </div>
      </section>

      {cars.length === 0 ? (
        <div className="favorites-empty">
          <div className="empty-icon">♡</div>

          <h2>Здесь будет ваше избранное</h2>

          <p>
            Нажимайте на ♡ возле автомобиля,
            чтобы сохранить интересные варианты.
          </p>
        </div>
      ) : (
        <div className="catalog-grid">
          {cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              favorite={favorites.includes(car.id)}
              onClick={() => onCar(car)}
              onFavorite={() => onFavorite(car.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CarCard({
  car,
  favorite = false,
  onClick,
  onFavorite,
}) {
  return (
    <article className="car-card">
      <button
        className="car-card-main"
        onClick={onClick}
        type="button"
      >
        <div className="car-card-image">
          {car.photoUrl ? (
            <img
              src={car.photoUrl}
              alt={`${car.brand} ${car.model}`}
              loading="lazy"
            />
          ) : (
            <div className="image-placeholder">
              <span>MICOOR CAR</span>
            </div>
          )}

          <div className="image-overlay" />

          <span className="image-label">
            MICOOR CAR
          </span>

          {car.year && (
            <span className="year-badge">
              {car.year}
            </span>
          )}
        </div>

        <div className="car-card-content">
          <div className="car-card-title">
            <span>{car.brand || 'AUTO'}</span>

            <strong>
              {car.model || car.title || 'Автомобиль'}
            </strong>
          </div>

          <div className="car-card-specs">
            {car.mileage && <span>{car.mileage}</span>}
            {car.fuel && <span>{car.fuel}</span>}
            {car.power && <span>{car.power}</span>}
          </div>

          <div className="car-card-footer">
            <strong>{formatPrice(car.price)}</strong>
            <span>Подробнее ↗</span>
          </div>
        </div>
      </button>

      {onFavorite && (
        <button
          className={`card-favorite ${
            favorite ? 'is-favorite' : ''
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
          type="button"
        >
          {favorite ? '♥' : '♡'}
        </button>
      )}
    </article>
  );
}

function CarDetail({
  car,
  isFavorite,
  onFavorite,
  onBack,
  onLead,
  sendingLead,
}) {
  return (
    <div className="page car-detail-page">
      <button
        className="detail-back"
        onClick={onBack}
        type="button"
      >
        ← Назад к каталогу
      </button>

      <section className="detail-image">
        {car.photoUrl ? (
          <img
            src={car.photoUrl}
            alt={`${car.brand} ${car.model}`}
          />
        ) : (
          <div className="image-placeholder large">
            <span>MICOOR CAR</span>
          </div>
        )}

        <div className="detail-image-gradient" />

        <span className="detail-image-label">
          MICOOR CAR / SELECTED
        </span>
      </section>

      <section className="detail-head">
        <div>
          <span className="detail-brand">
            {car.brand || 'AUTOMOBILE'}
          </span>

          <h1>
            {car.model || car.title || 'Автомобиль'}
          </h1>

          {car.year && (
            <div className="detail-year">
              {car.year} · Китай
            </div>
          )}
        </div>

        <button
          className={`detail-favorite ${
            isFavorite ? 'is-favorite' : ''
          }`}
          onClick={onFavorite}
          type="button"
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      </section>

      <div className="detail-price">
        {formatPrice(car.price)}
      </div>

      <section className="spec-section">
        <div className="section-eyebrow">
          SPECIFICATIONS
        </div>

        <div className="spec-grid">
          <SpecItem label="Год" value={car.year} />
          <SpecItem label="Пробег" value={car.mileage} />
          <SpecItem
            label="Двигатель"
            value={car.engine || car.fuel}
          />
          <SpecItem label="Мощность" value={car.power} />
          <SpecItem
            label="Коробка"
            value={car.transmission}
          />
          <SpecItem label="Привод" value={car.drive} />
        </div>
      </section>

      {car.vin && (
        <section className="vin-block">
          <span>VIN</span>
          <strong>{car.vin}</strong>
        </section>
      )}

      <section className="lead-block">
        <div>
          <span className="section-eyebrow">
            INTERESTED?
          </span>

          <h2>
            Хотите этот
            <br />
            автомобиль?
          </h2>

          <p>
            Оставьте заявку — менеджер свяжется
            с вами и расскажет подробности.
          </p>
        </div>

        <button
          className="primary-button lead-button"
          onClick={onLead}
          disabled={sendingLead}
          type="button"
        >
          {sendingLead ? (
            <>
              <span className="button-spinner" />
              Отправляем
            </>
          ) : (
            <>
              Оставить заявку
              <span className="button-arrow">↗</span>
            </>
          )}
        </button>
      </section>

      <div className="detail-footnote">
        MICOOR CAR · Автомобили из Китая
      </div>
    </div>
  );
}

function SpecItem({ label, value }) {
  if (!value) return null;

  return (
    <div className="spec-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">M</div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function Loading() {
  return (
    <div className="loading-row">
      <div className="spinner" />
      <span>Загружаем каталог</span>
    </div>
  );
}

export default App;