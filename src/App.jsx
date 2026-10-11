import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = 'https://micoocar-bot.onrender.com/api/cars';
const PHOTO_URL = 'https://micoocar-bot.onrender.com/api/cars';

function parseCar(car) {
  const rawText = String(car?.text || car?.description || "");
  const normalized = rawText
    .replace(/\r/g, "")
    .replace(/\*/g, "");

  const lines = normalized
    .split("\n")
    .map((line) => line.replace(/[`_]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const brandPattern =
    /\b(Mercedes-Benz|Mercedes|Li\s+Auto|Land\s+Rover|Volkswagen|Toyota|Honda|Nissan|Mazda|Subaru|Mitsubishi|Suzuki|Lexus|Audi|BMW|MINI|BYD|Zeekr|Lixiang|Kia|Hyundai|Genesis|Porsche|Ford|Chevrolet|Chery|Geely|GWM|Haval|Tank|Hongqi|Avatr|NIO|Xiaomi|XPeng|JAC|Jetour|Voyah|Denza|Deepal|Leapmotor|Cadillac|Volvo|Skoda|Renault|Peugeot|Dongfeng|Changan|Wuling|Buick|Infiniti|Acura|Cupra|Opel|Isuzu|MG|Smart)\b/i;

  function extractTitle(line) {
    const match = line.match(brandPattern);
    if (!match) return "";

    return line
      .slice(match.index)
      .split(/\b(?:VIN|Основные характеристики|Пробег|Мощность|Цена|Стоимость|Двигатель|Коробка|Трансмиссия|Привод)\b|(?:19|20)\d{2}\s*год/i)[0]
      .replace(/[|•💰📸📝🆔━]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const saleMatch = normalized.match(/в продаже/i);
  let candidate = "";

  if (saleMatch) {
    const afterSale = normalized.slice(saleMatch.index + saleMatch[0].length);
    candidate = extractTitle(afterSale.split("\n")[0]);
  }

  if (!candidate) {
    for (const line of lines) {
      candidate = extractTitle(line);
      if (candidate) break;
    }
  }

  const isGeneric = (value) =>
    !value ||
    /^(?:автомобиль|новый автомобиль|текст автомобиля отсутствует)$/i.test(
      String(value).trim()
    );

  const oldTitle = isGeneric(car?.title) ? "" : String(car.title).trim();
  const oldBrand = isGeneric(car?.brand) ? "" : String(car.brand).trim();
  const oldModel = isGeneric(car?.model) ? "" : String(car.model).trim();

  let title = candidate || oldTitle || [oldBrand, oldModel].filter(Boolean).join(" ");

  const brandMatch = title.match(
    /^(Mercedes-Benz|Mercedes|Li\s+Auto|Land\s+Rover|Volkswagen|Toyota|Honda|Nissan|Mazda|Subaru|Mitsubishi|Suzuki|Lexus|Audi|BMW|MINI|BYD|Zeekr|Lixiang|Kia|Hyundai|Genesis|Porsche|Ford|Chevrolet|Chery|Geely|GWM|Haval|Tank|Hongqi|Avatr|NIO|Xiaomi|XPeng|JAC|Jetour|Voyah|Denza|Deepal|Leapmotor|Cadillac|Volvo|Skoda|Renault|Peugeot|Dongfeng|Changan|Wuling|Buick|Infiniti|Acura|Cupra|Opel|Isuzu|MG|Smart)\s+(.+)$/i
  );

  const canonical = (value) => {
    const key = value.toLowerCase().replace(/\s+/g, " ").trim();
    const names = {
      "mini": "MINI",
      "bmw": "BMW",
      "byd": "BYD",
      "mg": "MG",
      "nio": "NIO",
      "xpeng": "XPeng",
      "gwm": "GWM",
      "mercedes": "Mercedes-Benz",
      "mercedes-benz": "Mercedes-Benz",
      "li auto": "Li Auto",
      "land rover": "Land Rover",
      "volkswagen": "Volkswagen",
      "zeekr": "Zeekr"
    };
    return names[key] || value;
  };

  const brand = brandMatch ? canonical(brandMatch[1]) : oldBrand;
  const model = brandMatch ? brandMatch[2].trim() : oldModel;

  if (brand && model) {
    title = `${brand} ${model}`;
  }

  const year = normalized.match(/\b((?:19|20)\d{2})\s*год/i)?.[1] || car.year || "";

  const mileageMatch = normalized.match(
    /Пробег\s*[—:–-]?\s*([\d\s.,]+)\s*км/i
  );
  const mileage = mileageMatch
    ? `${mileageMatch[1].trim().replace(/\s+/g, " ")} км`
    : car.mileage || "";

  const priceMatch =
    normalized.match(/💰\s*([^\n]+)/i) ||
    normalized.match(/Цена\s*[—:–-]?\s*([^\n]+)/i);
  const price = priceMatch ? priceMatch[1].trim() : car.price || "";

  const vin =
    normalized.match(/\bVIN\s*[:—-]?\s*([A-Z0-9-]{5,})/i)?.[1] ||
    car.vin ||
    "";

  const engine =
    normalized.match(/(?:двигатель|объём|объем)\s*[—:–-]\s*([^\n]+)/i)?.[1]?.trim() ||
    normalized.match(/(\d+(?:[.,]\d+)?\s*[TТлL]?)\s*(?:Бензин|Дизель|Гибрид|Электро)/i)?.[1] ||
    car.engine ||
    "";

  const power =
    normalized.match(/Мощность\s*[—:–-]\s*([^\n]+)/i)?.[1]?.trim() ||
    car.power ||
    "";

  const fuel =
    normalized.match(/\b(Бензин|Дизель|Гибрид|Электро)\b/i)?.[1] ||
    car.fuel ||
    "";

  const transmission =
    normalized.match(/(?:КПП|Коробка|Трансмиссия)\s*[—:–-]\s*([^\n]+)/i)?.[1]?.trim() ||
    car.transmission ||
    "";

  const drive =
    normalized.match(/Привод\s*[—:–-]\s*([^\n]+)/i)?.[1]?.trim() ||
    car.drive ||
    "";

  const photos = Array.isArray(car.photos) && car.photos.length
    ? car.photos.map((photo) => {
        const value = String(photo);
        return /^https?:\/\//i.test(value)
          ? value
          : new URL(value, API_URL).toString();
      })
    : car.photo
      ? [`${PHOTO_URL}/${car.id}/photo`]
      : [];

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
    photos,
    photoUrl: photos[0] || "",
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
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadPhone, setLeadPhone] = useState('');
  const [leadError, setLeadError] = useState('');


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

      const response = await fetch(API_URL, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const parsedCars = Array.isArray(data)
        ? data
            .filter((car) => car.status === "published")
            .filter((car) => {
              const source = String(car?.text || "").trim();
              return source &&
                !/Текст автомобиля отсутствует/i.test(source) &&
                !/📝\s*Текст:\s*нет/i.test(source);
            })
            .map(parseCar)
            .filter((car) =>
              car.title &&
              !/^(?:автомобиль|новый автомобиль)$/i.test(car.title.trim())
            )
        : [];

      const seen = new Set();
      const uniqueCars = parsedCars.filter((car) => {
        const vin = String(car.vin || "").replace(/\s+/g, "").toUpperCase();
        const fingerprint = vin
          ? `vin:${vin}`
          : `text:${String(car.text || "").replace(/\s+/g, " ").trim().toLowerCase()}`;

        if (seen.has(fingerprint)) return false;
        seen.add(fingerprint);
        return true;
      });

      setCars(uniqueCars);
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

  function openLeadModal() {
    setLeadPhone('');
    setLeadError('');
    setShowLeadModal(true);
  }

  async function sendLead(car, phone) {
    if (sendingLead || !car) return;

    const normalizedPhone = String(phone || '').trim();
    const digits = normalizedPhone.replace(/\D/g, '');

    if (digits.length < 7 || digits.length > 15) {
      setLeadError('Введите корректный номер телефона с кодом страны.');
      return;
    }

    try {
      setSendingLead(true);
      setLeadError('');

      const tg = window.Telegram?.WebApp;
      const tgUser = tg?.initDataUnsafe?.user || user;

      const response = await fetch(
        'https://micoocar-bot.onrender.com/api/leads',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            carId: car.id,
            brand: car.brand,
            model: car.model,
            price: car.price,
            vin: car.vin,
            phone: normalizedPhone,
            userId: tgUser?.id || null,
            username: tgUser?.username || null,
            firstName: tgUser?.first_name || null,
            lastName: tgUser?.last_name || null,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось отправить заявку');
      }

      setShowLeadModal(false);
      setLeadPhone('');

      if (tg?.showPopup) {
        tg.showPopup({
          title: 'Заявка отправлена',
          message: 'Менеджер получил ваши контакты и информацию об автомобиле.',
          buttons: [{ type: 'ok' }],
        });
      } else {
        alert('Заявка отправлена менеджеру');
      }
    } catch (error) {
      console.error('Ошибка отправки заявки:', error);
      setLeadError('Не удалось отправить заявку. Попробуйте ещё раз.');
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
            onLead={openLeadModal}
            sendingLead={sendingLead}
          />
        )}
      </main>
      {showLeadModal && selectedCar && (
        <div
          className="lead-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget && !sendingLead) {
              setShowLeadModal(false);
            }
          }}
        >
          <section className="lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
            <div className="lead-modal-top">
              <span className="section-eyebrow">MICOOR CAR / ЗАЯВКА</span>
              <button
                className="lead-modal-close"
                type="button"
                aria-label="Закрыть"
                disabled={sendingLead}
                onClick={() => setShowLeadModal(false)}
              >×</button>
            </div>

            <h2 id="lead-modal-title">Связаться с менеджером</h2>
            <p className="lead-modal-description">
              Оставьте номер телефона, чтобы менеджер мог связаться с вами.
            </p>

            <div className="lead-car-summary">
              <span>Выбранный автомобиль</span>
              <strong>{[selectedCar.brand, selectedCar.model].filter(Boolean).join(' ') || selectedCar.title || 'Автомобиль'}</strong>
              {selectedCar.price && <span>{selectedCar.price}</span>}
            </div>

            <form
              className="lead-form"
              onSubmit={(event) => {
                event.preventDefault();
                sendLead(selectedCar, leadPhone);
              }}
            >
              <label htmlFor="lead-phone">Номер телефона *</label>
              <input
                id="lead-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 999 123-45-67"
                value={leadPhone}
                onChange={(event) => setLeadPhone(event.target.value)}
                required
                disabled={sendingLead}
              />

              <div className="lead-telegram-data">
                <div>
                  <span>Имя из Telegram</span>
                  <strong>{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Не доступно'}</strong>
                </div>
                <div>
                  <span>Telegram username</span>
                  <strong>{user?.username ? `@${user.username}` : 'Не указан'}</strong>
                </div>
              </div>

              <p className="lead-privacy-note">
                Контакты будут переданы менеджеру для обработки заявки.
              </p>

              {leadError && <p className="lead-form-error" role="alert">{leadError}</p>}

              <button className="lead-submit-button" type="submit" disabled={sendingLead}>
                {sendingLead ? 'Отправляем…' : 'Отправить заявку'}
                {!sendingLead && <span>↗</span>}
              </button>
            </form>
          </section>
        </div>
      )}
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

  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      question: 'Сколько занимает доставка автомобиля?',
      answer: 'Срок зависит от выбранного автомобиля, точки отправления, маршрута и оформления документов. После уточнения деталей мы сообщим ориентировочный срок и обозначим возможные факторы задержки.'
    },
    {
      question: 'Как рассчитывается итоговая стоимость?',
      answer: 'Расчёт может включать стоимость автомобиля, логистику, оформление, применимые обязательные платежи и согласованные услуги. До принятия решения предоставим расчёт по доступным данным. Итоговая сумма зависит от конкретной сделки и действующих требований.'
    },
    {
      question: 'Поможете подобрать автомобиль, если я ещё не определился?',
      answer: 'Да, начнём с ваших пожеланий. Укажите ориентировочный бюджет, тип автомобиля, желаемый год выпуска и важные характеристики. На основе этих данных можно будет искать подходящие предложения.'
    },
    {
      question: 'Можно ли заказать конкретную комплектацию?',
      answer: 'Можно указать модель, комплектацию, цвет, двигатель и другие предпочтения. Наличие и стоимость нужно подтвердить по конкретному предложению — требуемая версия может быть недоступна.'
    },
    {
      question: 'Как проверяется автомобиль перед покупкой?',
      answer: 'До принятия решения согласуем доступную проверку конкретного автомобиля: данные объявления, VIN, документы и дополнительные фото или видео от продавца. Возможности и объём проверки зависят от доступной информации.'
    },
    {
      question: 'Какие гарантии вы предоставляете?',
      answer: 'Условия зависят от автомобиля, продавца и договора. Перед оплатой менеджер должен отдельно объяснить, какие условия подтверждены документами, что входит в услугу и какие обязательства принимаются по сделке.'
    },
    {
      question: 'Какие способы оплаты доступны?',
      answer: 'Способ и этапы оплаты согласовываются до сделки. Перед переводом средств запросите подтверждённую сумму, основание платежа и реквизиты. Все условия должны быть понятны заранее.'
    },
    {
      question: 'Нужно ли приезжать в офис?',
      answer: 'Начать можно дистанционно: изучить каталог и обсудить подходящий автомобиль. Если для оформления конкретной сделки потребуется личное присутствие или оригиналы документов, это следует согласовать заранее.'
    },
    {
      question: 'Что делать, если нужного автомобиля нет в каталоге?',
      answer: 'Отсутствие модели в каталоге не означает, что её нельзя найти. Подготовьте марку, модель, бюджет и желаемую комплектацию — по этим параметрам можно уточнить наличие подходящих предложений.'
    },
    {
      question: 'Вы привозите только автомобили?',
      answer: 'Основное направление MICOOR CAR — автомобили из Китая. По запросам, которые выходят за рамки обычного подбора легкового автомобиля, лучше отдельно уточнить возможность работы с менеджером.'
    }
  ];

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


      <section className="faq-section">
        <div className="faq-heading">
          <div>
            <span className="section-eyebrow">MICOOR CAR / FAQ</span>
            <h2>Частые вопросы</h2>
          </div>
          <p>
            Собрали ответы о подборе, проверке,
            стоимости и доставке автомобиля из Китая.
          </p>
        </div>

        <div className="faq-grid">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;

            return (
              <article
                className={`faq-item ${isOpen ? 'is-open' : ''}`}
                key={faq.question}
              >
                <button
                  className="faq-question"
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => setOpenFaq(isOpen ? -1 : index)}
                >
                  <span>{faq.question}</span>
                  <span className="faq-icon" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                <div
                  className="faq-answer"
                  id={`faq-answer-${index}`}
                  hidden={!isOpen}
                >
                  <p>{faq.answer}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="faq-footer">
          <p>Остались вопросы? Начните с выбора автомобиля.</p>
          <button
            className="faq-cta"
            type="button"
            onClick={onCatalog}
          >
            Перейти в каталог <span>↗</span>
          </button>
        </div>
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
  const galleryPhotos =
    Array.isArray(car.photos) && car.photos.length
      ? car.photos
      : car.photoUrl
        ? [car.photoUrl]
        : [];

  const [activePhoto, setActivePhoto] = useState(0);

  const descriptionText = String(car.description || car.text || "")
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) =>
      !/^\s*━{3,}\s*$/.test(line) &&
      !/^\s*🚗\s*НОВЫЙ\s+АВТОМОБИЛЬ\s*$/i.test(line)
    )
    .join("\n")
    .trim();


  useEffect(() => {
    setActivePhoto(0);
  }, [car.id]);

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
        <div className="detail-gallery-stage">
          {galleryPhotos.length > 0 ? (
            <img
              className="detail-gallery-main"
              src={galleryPhotos[activePhoto] || galleryPhotos[0]}
              alt={`${car.brand || ''} ${car.model || car.title || ''} — фото ${activePhoto + 1}`}
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

          {galleryPhotos.length > 1 && (
            <>
              <button
                className="detail-gallery-arrow detail-gallery-prev"
                type="button"
                aria-label="Предыдущее фото"
                onClick={() => setActivePhoto(
                  (current) => (current - 1 + galleryPhotos.length) % galleryPhotos.length
                )}
              >
                ‹
              </button>

              <button
                className="detail-gallery-arrow detail-gallery-next"
                type="button"
                aria-label="Следующее фото"
                onClick={() => setActivePhoto(
                  (current) => (current + 1) % galleryPhotos.length
                )}
              >
                ›
              </button>

              <span className="detail-gallery-counter">
                {activePhoto + 1} / {galleryPhotos.length}
              </span>
            </>
          )}
        </div>

        {galleryPhotos.length > 1 && (
          <div className="detail-gallery-thumbnails">
            {galleryPhotos.map((photo, index) => (
              <button
                key={`${car.id}-photo-${index}`}
                className={`detail-gallery-thumb ${activePhoto === index ? 'is-active' : ''}`}
                type="button"
                aria-label={`Открыть фото ${index + 1}`}
                aria-pressed={activePhoto === index}
                onClick={() => setActivePhoto(index)}
              >
                <img src={photo} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
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

      {descriptionText && (
        <section className="description-section">
          <div className="description-heading">
            <span className="section-eyebrow">MICOOR CAR / DETAILS</span>
            <h2>Об автомобиле</h2>
          </div>

          <div className="description-copy">
            {descriptionText}
          </div>
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