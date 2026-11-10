import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    normalized.match(/(Бензин|Дизель|Гибрид|Электро)/i)?.[1] ||
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

const API_BASE = 'https://micoocar-bot.onrender.com';
const MANAGER_USERNAME = 'arturexpo';
const LOGO_SRC = '/logo-micoor-dark-bold.svg';

// Силуэты моделей для заставки (морфинг SMIL)
const SPLASH_CARS = { __html: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"26 18 1228 348\"><g fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g class=\"m-morph\"><path class=\"m-top\" d=\"M50 286 C51 277 18 246 58 232 C98 218 221 222 290 204 C359 186 405 141 470 124 C535 107 615 105 680 104 C745 103 805 105 860 118 C915 131 955 169 1010 182 C1065 195 1157 179 1190 196 C1223 213 1203 271 1206 286\"><animate attributeName=\"d\" values=\"M50 286 C51 277 18 246 58 232 C98 218 221 222 290 204 C359 186 405 141 470 124 C535 107 615 105 680 104 C745 103 805 105 860 118 C915 131 955 169 1010 182 C1065 195 1157 179 1190 196 C1223 213 1203 271 1206 286;M50 286 C51 277 18 246 58 232 C98 218 221 222 290 204 C359 186 405 141 470 124 C535 107 615 105 680 104 C745 103 805 105 860 118 C915 131 955 169 1010 182 C1065 195 1157 179 1190 196 C1223 213 1203 271 1206 286;M60 286 C60 270 30 210 62 192 C94 174 210 196 250 178 C290 160 248 99 300 82 C352 65 433 75 560 74 C687 73 962 75 1060 76 C1158 77 1132 66 1150 82 C1168 98 1165 138 1170 172 C1175 206 1177 267 1178 286;M60 286 C60 270 30 210 62 192 C94 174 210 196 250 178 C290 160 248 99 300 82 C352 65 433 75 560 74 C687 73 962 75 1060 76 C1158 77 1132 66 1150 82 C1168 98 1165 138 1170 172 C1175 206 1177 267 1178 286;M55 286 C56 274 26 230 60 214 C94 198 200 207 260 188 C320 169 360 117 420 100 C480 83 553 85 620 84 C687 83 747 85 820 96 C893 107 1000 135 1060 150 C1120 165 1157 161 1180 184 C1203 207 1193 269 1196 286;M55 286 C56 274 26 230 60 214 C94 198 200 207 260 188 C320 169 360 117 420 100 C480 83 553 85 620 84 C687 83 747 85 820 96 C893 107 1000 135 1060 150 C1120 165 1157 161 1180 184 C1203 207 1193 269 1196 286;M40 286 C41 278 -15 249 48 236 C111 223 328 224 420 206 C512 188 543 145 600 130 C657 115 710 117 760 118 C810 119 847 123 900 136 C953 149 1028 184 1080 196 C1132 208 1187 191 1210 206 C1233 221 1217 273 1218 286;M40 286 C41 278 -15 249 48 236 C111 223 328 224 420 206 C512 188 543 145 600 130 C657 115 710 117 760 118 C810 119 847 123 900 136 C953 149 1028 184 1080 196 C1132 208 1187 191 1210 206 C1233 221 1217 273 1218 286;M36 290 C38 285 2 271 46 262 C90 253 221 252 300 236 C379 220 463 180 520 166 C577 152 597 151 640 150 C683 149 720 149 780 160 C840 171 928 204 1000 214 C1072 224 1173 209 1210 222 C1247 235 1220 279 1222 290;M36 290 C38 285 2 271 46 262 C90 253 221 252 300 236 C379 220 463 180 520 166 C577 152 597 151 640 150 C683 149 720 149 780 160 C840 171 928 204 1000 214 C1072 224 1173 209 1210 222 C1247 235 1220 279 1222 290\" keyTimes=\"0;0.1;0.22;0.32;0.44;0.54;0.66;0.76;0.88;1\" calcMode=\"spline\" keySplines=\"0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1\" dur=\"2.6s\" begin=\"indefinite\" fill=\"freeze\"/></path><path class=\"m-low\" d=\"M348 294 C375 294 458 294 510 294 C562 294 610 294 660 294 C710 294 763 294 810 294 C857 294 920 294 942 294\"><animate attributeName=\"d\" values=\"M348 294 C375 294 458 294 510 294 C562 294 610 294 660 294 C710 294 763 294 810 294 C857 294 920 294 942 294;M348 294 C375 294 458 294 510 294 C562 294 610 294 660 294 C710 294 763 294 810 294 C857 294 920 294 942 294;M344 292 C370 292 453 292 500 292 C547 292 582 292 625 292 C668 292 713 292 760 292 C807 292 882 292 906 292;M344 292 C370 292 453 292 500 292 C547 292 582 292 625 292 C668 292 713 292 760 292 C807 292 882 292 906 292;M348 292 C373 292 450 292 500 292 C550 292 600 292 650 292 C700 292 752 292 800 292 C848 292 917 292 940 292;M348 292 C373 292 450 292 500 292 C550 292 600 292 650 292 C700 292 752 292 800 292 C848 292 917 292 940 292;M340 294 C368 294 457 294 510 294 C563 294 610 294 660 294 C710 294 760 294 810 294 C860 294 935 294 960 294;M340 294 C368 294 457 294 510 294 C563 294 610 294 660 294 C710 294 760 294 810 294 C860 294 935 294 960 294;M346 296 C375 296 466 296 520 296 C574 296 620 296 670 296 C720 296 769 296 820 296 C871 296 948 296 974 296;M346 296 C375 296 466 296 520 296 C574 296 620 296 670 296 C720 296 769 296 820 296 C871 296 948 296 974 296\" keyTimes=\"0;0.1;0.22;0.32;0.44;0.54;0.66;0.76;0.88;1\" calcMode=\"spline\" keySplines=\"0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1\" dur=\"2.6s\" begin=\"indefinite\" fill=\"freeze\"/></path><circle class=\"m-wheel\" cx=\"300\" cy=\"300\" r=\"46\"><animate attributeName=\"cx\" values=\"300;300;290;290;298;298;290;290;300;300\" keyTimes=\"0;0.1;0.22;0.32;0.44;0.54;0.66;0.76;0.88;1\" calcMode=\"spline\" keySplines=\"0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1\" dur=\"2.6s\" begin=\"indefinite\" fill=\"freeze\"/><animate attributeName=\"cy\" values=\"300;300;300;300;300;300;300;300;300;300\" keyTimes=\"0;0.1;0.22;0.32;0.44;0.54;0.66;0.76;0.88;1\" calcMode=\"spline\" keySplines=\"0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1\" dur=\"2.6s\" begin=\"indefinite\" fill=\"freeze\"/><animate attributeName=\"r\" values=\"46;46;52;52;50;50;48;48;44;44\" keyTimes=\"0;0.1;0.22;0.32;0.44;0.54;0.66;0.76;0.88;1\" calcMode=\"spline\" keySplines=\"0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1\" dur=\"2.6s\" begin=\"indefinite\" fill=\"freeze\"/></circle><circle class=\"m-wheel\" cx=\"990\" cy=\"300\" r=\"46\"><animate attributeName=\"cx\" values=\"990;990;960;960;990;990;1010;1010;1020;1020\" keyTimes=\"0;0.1;0.22;0.32;0.44;0.54;0.66;0.76;0.88;1\" calcMode=\"spline\" keySplines=\"0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1\" dur=\"2.6s\" begin=\"indefinite\" fill=\"freeze\"/><animate attributeName=\"cy\" values=\"300;300;300;300;300;300;300;300;300;300\" keyTimes=\"0;0.1;0.22;0.32;0.44;0.54;0.66;0.76;0.88;1\" calcMode=\"spline\" keySplines=\"0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1\" dur=\"2.6s\" begin=\"indefinite\" fill=\"freeze\"/><animate attributeName=\"r\" values=\"46;46;52;52;50;50;48;48;44;44\" keyTimes=\"0;0.1;0.22;0.32;0.44;0.54;0.66;0.76;0.88;1\" calcMode=\"spline\" keySplines=\"0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1;0.6 0 0.2 1\" dur=\"2.6s\" begin=\"indefinite\" fill=\"freeze\"/></circle></g></g></svg>" };

const FAQS = [
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

function useReveal(deps = []) {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal:not(.is-visible)');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function getTelegram() {
  return window.Telegram?.WebApp;
}

function inTelegram() {
  return Boolean(getTelegram()?.initData);
}

function haptic(type = 'light') {
  try {
    const feedback = getTelegram()?.HapticFeedback;
    if (!feedback) return;

    if (type === 'selection') {
      feedback.selectionChanged();
    } else if (type === 'success' || type === 'error' || type === 'warning') {
      feedback.notificationOccurred(type);
    } else {
      feedback.impactOccurred(type);
    }
  } catch {
    // вне Telegram вибрации нет
  }
}

function confirmAction(message) {
  const tg = getTelegram();

  return new Promise((resolve) => {
    if (inTelegram() && tg?.showConfirm) {
      tg.showConfirm(message, (ok) => resolve(Boolean(ok)));
    } else {
      resolve(window.confirm(message));
    }
  });
}

function openManager(text = '') {
  const url = `https://t.me/${MANAGER_USERNAME}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  const tg = getTelegram();

  if (inTelegram() && tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

function priceNumber(price) {
  const digits = String(price || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function carName(car) {
  return [car.brand, car.model].filter(Boolean).join(' ') || car.title || 'Автомобиль';
}

function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem('micoocar_favorites') || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function readRecent() {
  try {
    const saved = JSON.parse(localStorage.getItem('micoocar_recent') || '[]');
    return Array.isArray(saved) ? saved.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function prepareCars(data) {
  if (!Array.isArray(data)) return [];

  const parsed = data
    .filter((car) => car.status === 'published' || car.status === 'hidden')
    .filter((car) => {
      const source = String(car?.text || car?.description || '').trim();
      return source &&
        !/Текст автомобиля отсутствует/i.test(source) &&
        !/📝\s*Текст:\s*нет/i.test(source);
    })
    .map(parseCar)
    .filter((car) =>
      car.title &&
      !/^(?:автомобиль|новый автомобиль)$/i.test(car.title.trim())
    );

  const seen = new Set();

  return parsed.filter((car) => {
    const vin = String(car.vin || '').replace(/\s+/g, '').toUpperCase();
    const fingerprint = `${car.status}:${vin
      ? `vin:${vin}`
      : `text:${String(car.text || '').replace(/\s+/g, ' ').trim().toLowerCase()}`}`;

    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  const [page, setPage] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('page');
    const fromTelegram = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (fromUrl === 'wish' || fromTelegram === 'wish') return 'wish';
    if (fromUrl === 'calc' || fromTelegram === 'calc') return 'calc';
    const direct = ['archive', 'favorites', 'catalog', 'profile', 'deals'].find(name => fromUrl === name || fromTelegram === name);
    if (direct) return direct;
    return 'home';
  });
  const [returnPage, setReturnPage] = useState('catalog');
  const [cars, setCars] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [favorites, setFavorites] = useState(readFavorites);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [leadCar, setLeadCar] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [stories, setStories] = useState(null);
  const [calcPreset, setCalcPreset] = useState(null);
  const deepLinkDone = useRef(false);
  const [catalogSearch, setCatalogSearch] = useState({ query: '', filters: EMPTY_FILTERS, sort: 'new' });
  const [toast, setToast] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [recentIds, setRecentIds] = useState(readRecent);
  const [minSplash, setMinSplash] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => {
    const minTimer = setTimeout(() => setMinSplash(false), 4300);
    const slowTimer = setTimeout(() => setSlowLoad(true), 6000);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(slowTimer);
    };
  }, []);

  const initData = useMemo(() => getTelegram()?.initData || '', []);

  useEffect(() => {
    const tg = getTelegram();
    if (!tg) return;

    tg.ready();
    tg.expand();

    try {
      tg.setHeaderColor('#efe9dd');
      tg.setBackgroundColor('#efe9dd');
      tg.setBottomBarColor?.('#efe9dd');
      tg.disableVerticalSwipes?.();
    } catch {
      // старые версии Telegram
    }

    setUser(tg.initDataUnsafe?.user || null);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('micoocar_favorites', JSON.stringify(favorites));
    } catch {
      // приватный режим
    }
  }, [favorites]);

  const loadCars = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const authHeaders = { 'X-Telegram-Init-Data': initData };

      const adminCheck = initData
        ? fetch(`${API_BASE}/api/admin/me`, { headers: authHeaders })
            .then((response) => response.ok)
            .catch(() => false)
        : Promise.resolve(false);

      const publicRequest = fetch(API_URL, { cache: 'no-store' });

      const admin = await adminCheck;
      setIsAdmin(admin);

      const response = admin
        ? await fetch(`${API_BASE}/api/admin/cars`, { cache: 'no-store', headers: authHeaders })
        : await publicRequest;

      if (admin) {
        fetch(`${API_BASE}/api/admin/stats`, { cache: 'no-store', headers: authHeaders })
          .then((result) => (result.ok ? result.json() : null))
          .then((data) => setAdminStats(data?.success ? data : null))
          .catch(() => {});
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setCars(prepareCars(await response.json()));
    } catch (err) {
      console.error(err);
      setError('Сервер просыпается или нет связи. Попробуйте ещё раз через несколько секунд.');
    } finally {
      setLoading(false);
    }
  }, [initData]);

  useEffect(() => {
    loadCars();
  }, [loadCars]);

  const publishedCars = useMemo(
    () => cars.filter((car) => car.status === 'published'),
    [cars]
  );

  const archivedCars = useMemo(
    () => cars.filter((car) => car.status === 'hidden'),
    [cars]
  );

  const favoriteCars = useMemo(
    () => publishedCars.filter((car) => favorites.includes(car.id)),
    [publishedCars, favorites]
  );

  const selectedCar = cars.find((car) => car.id === selectedId) || null;

  // Ссылка из уведомления бота: ?car=<id> открывает карточку
  useEffect(() => {
    if (deepLinkDone.current || loading || !cars.length) return;
    deepLinkDone.current = true;
    const params = new URLSearchParams(window.location.search);
    const fromTelegram = getTelegram()?.initDataUnsafe?.start_param || '';
    const carId = params.get('car') || (fromTelegram.startsWith('car_') ? fromTelegram : '');
    const car = carId && cars.find((item) => item.id === carId);
    if (car) {
      setReturnPage('catalog');
      setSelectedId(car.id);
      setPage('car');
    }
  }, [loading, cars]);

  function openCalc(car) {
    const preset = car
      ? {
          age: Number(car.year) && new Date().getFullYear() - Number(car.year) >= 5 ? '5+' : Number(car.year) && new Date().getFullYear() - Number(car.year) >= 3 ? '3-5' : 'new',
          volume: car.engine ? String(Math.round(parseFloat(String(car.engine).replace(',', '.')) * 1000) || '') : '',
          power: String(String(car.power || '').match(/\d+/)?.[0] || ''),
          fuel: /дизел/i.test(car.fuel || '') ? 'diesel' : /гибрид/i.test(car.fuel || '') ? 'hybrid' : /электр/i.test(car.fuel || '') ? 'electric' : 'petrol',
        }
      : null;
    setCalcPreset(preset);
    navigate('calc');
  }

  function showToast(text, tone = 'default') {
    clearTimeout(toastTimer.current);
    setToast({ text, tone });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  const loadProfile = useCallback(() => {
    if (!initData) return;
    fetch(`${API_BASE}/api/profile`, { headers: { 'X-Telegram-Init-Data': initData } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data?.success) setProfileData(data); })
      .catch(() => {});
  }, [initData]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    fetch(`${API_BASE}/api/reviews`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function navigate(nextPage) {
    haptic('light');
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function trackView(car) {
    if (isAdmin) return;

    try {
      const key = `micoocar_viewed_${car.id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // без sessionStorage просто считаем
    }

    fetch(`${API_BASE}/api/cars/${encodeURIComponent(car.id)}/view`, {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': initData },
      keepalive: true,
    }).catch(() => {});
  }

  function openCar(car) {
    haptic('light');
    trackView(car);
    setRecentIds((current) => {
      const next = [car.id, ...current.filter((id) => id !== car.id)].slice(0, 8);
      try { localStorage.setItem('micoocar_recent', JSON.stringify(next)); } catch { /* без хранилища — только в памяти */ }
      return next;
    });
    setReturnPage(page === 'car' ? returnPage : page);
    setSelectedId(car.id);
    setPage('car');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const goBack = useCallback(() => {
    setPage((current) => (current === 'car' ? returnPage : 'home'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [returnPage]);

  // Системная кнопка «Назад» Telegram
  useEffect(() => {
    const backButton = getTelegram()?.BackButton;
    if (!backButton || !inTelegram()) return undefined;

    if (page === 'home') {
      backButton.hide();
      return undefined;
    }

    backButton.show();
    backButton.onClick(goBack);

    return () => backButton.offClick(goBack);
  }, [page, goBack]);

  function toggleFavorite(carId) {
    haptic('light');
    setFavorites((current) =>
      current.includes(carId)
        ? current.filter((id) => id !== carId)
        : [...current, carId]
    );
  }

  async function adminAction(car, action) {
    if (!isAdmin || busyId) return;

    if (action === 'delete') {
      const ok = await confirmAction(`Удалить «${carName(car)}» навсегда? Вернуть будет нельзя.`);
      if (!ok) return;
    }

    setBusyId(car.id);
    haptic('medium');

    try {
      const id = encodeURIComponent(car.id);
      const url = action === 'delete'
        ? `${API_BASE}/api/admin/cars/${id}`
        : `${API_BASE}/api/admin/cars/${id}/${action}`;

      const response = await fetch(url, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        headers: { 'X-Telegram-Init-Data': initData },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (action === 'delete') {
        setCars((current) => current.filter((item) => item.id !== car.id));
        if (page === 'car' && selectedId === car.id) goBack();
        showToast('Удалено навсегда');
      } else {
        const status = action === 'hide' ? 'hidden' : 'published';
        const soldAt = action === 'hide' ? new Date().toISOString() : undefined;
        setCars((current) =>
          current.map((item) => (item.id === car.id ? { ...item, status, soldAt } : item))
        );
        showToast(action === 'hide' ? 'Продано — перенесено в архив' : 'Снова в продаже', 'success');
      }

      haptic('success');
    } catch (err) {
      console.error(err);
      showToast(`Не получилось: ${err.message}`, 'error');
      haptic('error');
    } finally {
      setBusyId(null);
    }
  }

  const adminProps = {
    isAdmin,
    busyId,
    onAdmin: adminAction,
  };

  return (
    <div className={`app ${page === 'car' || page === 'wish' ? 'is-detail' : ''}`}>
      <Splash hidden={!minSplash && !loading} slow={slowLoad && loading} />

      <header className="topbar">
        <button className="topbar-brand" onClick={() => navigate('home')} type="button" aria-label="На главную">
          <BrandLogo />
        </button>

        <div className="topbar-actions">
          {isAdmin && <span className="admin-pill">ADMIN</span>}
          <button className="topbar-manager" onClick={() => openManager()} type="button">
            <span className="online-dot" />
            Менеджер
          </button>
        </div>
      </header>

      <main className="main" key={page === 'car' ? `car-${selectedId}` : page}>
        {page === 'home' && (
          <HomePage
            cars={publishedCars}
            loading={loading}
            favorites={favorites}
            onFavorite={toggleFavorite}
            onCatalog={() => navigate('catalog')}
            onWish={() => navigate('wish')}
            onCar={openCar}
            soldCars={archivedCars}
            onSold={() => navigate('archive')}
            onStories={(index) => { haptic('light'); setStories(index); }}
            onCalc={() => openCalc(null)}
            reviews={reviews}
          />
        )}

        {page === 'catalog' && (
          <CatalogPage
            cars={publishedCars}
            archivedCount={archivedCars.length}
            loading={loading}
            error={error}
            favorites={favorites}
            onCar={openCar}
            onFavorite={toggleFavorite}
            onRetry={loadCars}
            onArchive={() => navigate('archive')}
            onWish={() => navigate('wish')}
            initData={initData}
            onToast={showToast}
            adminStats={adminStats}
            search={catalogSearch}
            onSearch={setCatalogSearch}
            {...adminProps}
          />
        )}

        {page === 'wish' && (
          <WishPage
            cars={publishedCars}
            user={user}
            onSent={loadProfile}
            onCar={openCar}
            onCatalog={() => navigate('catalog')}
            onExit={() => navigate('home')}
          />
        )}

        {page === 'calc' && (
          <CustomsPage key={JSON.stringify(calcPreset)} preset={calcPreset} onWish={() => navigate('wish')} />
        )}

        {page === 'favorites' && (
          <FavoritesPage
            cars={favoriteCars}
            favorites={favorites}
            onCar={openCar}
            onFavorite={toggleFavorite}
            onCatalog={() => navigate('catalog')}
            initData={initData}
          />
        )}

        {page === 'profile' && (
          <ProfilePage
            user={user}
            initData={initData}
            data={profileData}
            onSaved={(profile) => setProfileData((current) => ({ ...(current || { requests: [], subscriptions: [] }), profile }))}
            onReload={loadProfile}
            favoritesCount={favoriteCars.length}
            recentCars={recentIds.map((id) => cars.find((car) => car.id === id)).filter(Boolean).slice(0, 6)}
            onCar={openCar}
            onFavorites={() => navigate('favorites')}
            onCatalog={() => navigate('catalog')}
            onWish={() => navigate('wish')}
            onToast={showToast}
            isAdmin={isAdmin}
            onDeals={() => navigate('deals')}
          />
        )}

        {page === 'deals' && (
          <DealsPage isAdmin={isAdmin} initData={initData} cars={publishedCars} onToast={showToast} />
        )}

        {page === 'archive' && (
          <ArchivePage cars={archivedCars} stats={adminStats} onCar={openCar} {...adminProps} />
        )}

        {page === 'car' && selectedCar && (
          <CarDetail
            car={selectedCar}
            isFavorite={favorites.includes(selectedCar.id)}
            onFavorite={() => toggleFavorite(selectedCar.id)}
            onLead={() => setLeadCar(selectedCar)}
            onCalc={openCalc}
            {...adminProps}
          />
        )}

        {page === 'car' && !selectedCar && (
          <EmptyState title="Автомобиль не найден" text="Возможно, его уже продали." />
        )}
      </main>

      {page !== 'car' && page !== 'wish' && (
        <nav className="bottom-nav" aria-label="Навигация">
          <NavButton active={page === 'home'} icon={<IconHome />} label="Главная" onClick={() => navigate('home')} />
          <NavButton active={page === 'catalog'} icon={<IconGrid />} label="Каталог" badge={publishedCars.length} onClick={() => navigate('catalog')} />
          <NavButton active={page === 'favorites'} icon={<IconHeart />} label="Избранное" badge={favoriteCars.length} accent onClick={() => navigate('favorites')} />
          {(isAdmin || archivedCars.length > 0) && (
            <NavButton active={page === 'archive'} icon={<IconFlag />} label="Продано" badge={isAdmin ? archivedCars.length : 0} onClick={() => navigate('archive')} />
          )}
          <NavButton active={page === 'profile'} icon={<IconUser />} label="Профиль" onClick={() => navigate('profile')} />
        </nav>
      )}

      {stories !== null && (
        <StoriesViewer
          cars={publishedCars}
          start={stories}
          favorites={favorites}
          onFavorite={toggleFavorite}
          onClose={() => setStories(null)}
          onDetails={(car) => { setStories(null); openCar(car); }}
          onLead={(car) => { setStories(null); setLeadCar(car); }}
        />
      )}

      {leadCar && (
        <LeadModal
          car={leadCar}
          user={user}
          onClose={() => setLeadCar(null)}
          onSent={() => {
            setLeadCar(null);
            loadProfile();
            haptic('success');
            showToast('Заявка отправлена — менеджер скоро свяжется', 'success');
          }}
        />
      )}

      {toast && (
        <div className={`toast toast-${toast.tone}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   LOGO
   ========================================================= */

function BrandLogo() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="brand-text">MICOOR <em>CAR</em></span>;
  }

  return (
    <img className="brand-logo" src={LOGO_SRC} alt="MICOOR CAR" onError={() => setFailed(true)} />
  );
}

// Объёмный логотип: слои маски дают толщину, градиент — хромовый блик
function Logo3D() {
  const ref = useRef(null);
  const layers = 16;

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    let frame = 0;
    let tiltX = 0;
    let tiltY = 0;
    let releaseTimer = 0;

    const apply = () => {
      frame = 0;
      element.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    };

    const setTilt = (x, y) => {
      const clamp = (value) => Math.max(-1, Math.min(1, value));
      tiltY = clamp(x) * 26;
      tiltX = clamp(y) * -16;
      element.classList.add('is-tracking');
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => element.classList.remove('is-tracking'), 2400);
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onPointer = (event) => {
      const rect = element.getBoundingClientRect();
      setTilt(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1
      );
    };

    const onOrientation = (event) => {
      if (event.gamma == null || event.beta == null) return;
      setTilt(event.gamma / 25, (event.beta - 50) / 25);
    };

    element.addEventListener('pointermove', onPointer);
    window.addEventListener('deviceorientation', onOrientation);

    return () => {
      element.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onOrientation);
      cancelAnimationFrame(frame);
      clearTimeout(releaseTimer);
    };
  }, []);

  return (
    <div className="logo3d" ref={ref} role="img" aria-label="MICOOR CAR">
      <div className="logo3d-orbit">
        <div className="logo3d-object">
          {Array.from({ length: layers }, (_, index) => (
            <span key={index} className="logo3d-layer" style={{ '--i': index, '--n': layers }} />
          ))}
          <span className="logo3d-face" />
          <span className="logo3d-shine" />
        </div>
      </div>
      <div className="logo3d-floor" />
    </div>
  );
}

// Заставка: силуэты моделей перетекают друг в друга, последний рассыпается
// на частицы, и они собираются в логотип MICOOR CAR
const MORPH_DURATION = 2600;
const PARTICLE_FLIGHT = 1250;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function sampleSilhouette(svg, count) {
  const shapes = [...svg.querySelectorAll('.m-morph path, .m-morph circle')];
  const lengths = shapes.map((shape) => {
    try {
      return shape.getTotalLength();
    } catch {
      return 0;
    }
  });
  const total = lengths.reduce((sum, value) => sum + value, 0) || 1;
  const points = [];

  shapes.forEach((shape, index) => {
    const matrix = shape.getScreenCTM();
    const length = lengths[index];
    const share = Math.max(1, Math.round((length / total) * count));
    if (!matrix || !length) return;

    for (let i = 0; i < share; i++) {
      const point = shape.getPointAtLength((i / share) * length);
      const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
      points.push([screen.x, screen.y]);
    }
  });

  return points;
}

function sampleLogo(image, rect, count) {
  const width = Math.round(rect.width);
  const height = Math.round((rect.width * 348) / 1228);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);

  const { data } = context.getImageData(0, 0, width, height);
  const pixels = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 90) pixels.push([rect.left + x, rect.top + y]);
    }
  }

  for (let i = pixels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pixels[i], pixels[j]] = [pixels[j], pixels[i]];
  }

  return pixels.slice(0, count);
}

function Splash({ hidden, slow }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('cars');

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const svg = stage?.querySelector('svg');
    if (!stage || !canvas || !svg) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setPhase('logo');
      return undefined;
    }

    stage.querySelectorAll('animate').forEach((animation) => {
      try {
        animation.beginElement();
      } catch {
        // без SMIL просто покажем последний силуэт
      }
    });

    let frame = 0;
    let cancelled = false;

    const logoImage = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = LOGO_SRC;
    });

    const explodeTimer = setTimeout(async () => {
      const image = await logoImage;
      if (cancelled) return;

      if (!image) {
        setPhase('logo');
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const box = canvas.getBoundingClientRect();
      canvas.width = box.width * dpr;
      canvas.height = box.height * dpr;

      const context = canvas.getContext('2d');
      context.setTransform(dpr, 0, 0, dpr, -box.left * dpr, -box.top * dpr);

      const logoRect = stage.getBoundingClientRect();
      const count = window.innerWidth < 500 ? 1100 : 1600;
      const targets = sampleLogo(image, logoRect, count);
      const sources = sampleSilhouette(svg, targets.length);
      if (!targets.length || !sources.length) {
        setPhase('logo');
        return;
      }

      const centerX = logoRect.left + logoRect.width / 2;
      const centerY = logoRect.top + logoRect.height / 2;

      const particles = targets.map((target, index) => {
        const [sx, sy] = sources[index % sources.length];
        const angle = Math.atan2(sy - centerY, sx - centerX) + (Math.random() - 0.5) * 1.6;
        const burst = 40 + Math.random() * 110;
        return {
          sx,
          sy,
          tx: target[0],
          ty: target[1],
          cx: sx + Math.cos(angle) * burst,
          cy: sy + Math.sin(angle) * burst - 30,
          delay: Math.random() * 260,
          size: 0.9 + Math.random() * 1.3,
          hue: Math.random(),
        };
      });

      setPhase('particles');

      const start = performance.now();
      let logoShown = false;

      const draw = (now) => {
        const elapsed = now - start;
        context.clearRect(box.left, box.top, box.width, box.height);

        const fadeOut = Math.max(0, Math.min(1, (elapsed - PARTICLE_FLIGHT - 200) / 450));
        context.globalAlpha = 1 - fadeOut;

        for (const particle of particles) {
          const raw = Math.max(0, Math.min(1, (elapsed - particle.delay) / PARTICLE_FLIGHT));
          const t = easeInOutCubic(raw);
          const inv = 1 - t;
          const x = inv * inv * particle.sx + 2 * inv * t * particle.cx + t * t * particle.tx;
          const y = inv * inv * particle.sy + 2 * inv * t * particle.cy + t * t * particle.ty;

          context.fillStyle = particle.hue > 0.7 ? '#8d9a5c' : particle.hue > 0.35 ? '#5f6d35' : '#3f4828';
          context.fillRect(x, y, particle.size, particle.size);
        }

        if (!logoShown && elapsed > PARTICLE_FLIGHT + 80) {
          logoShown = true;
          setPhase('logo');
        }

        if (fadeOut < 1 && !cancelled) {
          frame = requestAnimationFrame(draw);
        } else {
          context.clearRect(box.left, box.top, box.width, box.height);
        }
      };

      frame = requestAnimationFrame(draw);
    }, MORPH_DURATION);

    return () => {
      cancelled = true;
      clearTimeout(explodeTimer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={`splash phase-${phase} ${hidden ? 'is-hidden' : ''}`} aria-hidden={hidden}>
      <div className="splash-glow" />
      <canvas className="splash-canvas" ref={canvasRef} />
      <div className="splash-stage" ref={stageRef}>
        <div className="splash-cars" dangerouslySetInnerHTML={SPLASH_CARS} />
        <img className="splash-final" src={LOGO_SRC} alt="" />
      </div>
      <div className="splash-bar"><span /></div>
      <p>{slow ? 'Просыпаем сервер — ещё пара секунд…' : 'Прямой экспортёр из Китая'}</p>
    </div>
  );
}

// Полноэкранный просмотр фото: листание и приближение по тапу
function PhotoViewer({ photos, start, title, onClose }) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = start * track.clientWidth;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    if (next !== index) {
      setIndex(next);
      setZoomed(false);
    }
  }

  function toggleZoom(event, slideIndex) {
    if (slideIndex !== index) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--ox', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    event.currentTarget.style.setProperty('--oy', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    setZoomed((value) => !value);
    haptic('light');
  }

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={`Фото: ${title}`}>
      <div className="viewer-top">
        <span>{index + 1} / {photos.length}</span>
        <button className="viewer-close" onClick={onClose} type="button" aria-label="Закрыть">×</button>
      </div>

      <div className={`viewer-track ${zoomed ? 'is-zoomed' : ''}`} ref={trackRef} onScroll={onScroll}>
        {photos.map((photo, slideIndex) => (
          <div className="viewer-slide" key={photo} onClick={(event) => toggleZoom(event, slideIndex)}>
            <img
              src={photo}
              alt={`${title} — фото ${slideIndex + 1}`}
              className={zoomed && slideIndex === index ? 'is-zoomed' : ''}
              draggable="false"
            />
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <div className="viewer-dots" aria-hidden="true">
          {photos.map((photo, dotIndex) => (
            <span key={photo} className={dotIndex === index ? 'active' : ''} />
          ))}
        </div>
      )}

      <div className="viewer-hint">{zoomed ? 'Нажмите ещё раз, чтобы уменьшить' : 'Нажмите на фото, чтобы приблизить'}</div>
    </div>
  );
}

/* =========================================================
   ICONS
   ========================================================= */

function Icon({ children, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const IconHome = () => <Icon><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-5h4v5" /></Icon>;
const IconGrid = () => <Icon><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></Icon>;
const IconHeart = ({ filled = false, size }) => <Icon size={size}><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9Z" fill={filled ? 'currentColor' : 'none'} /></Icon>;
const IconArchive = () => <Icon><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9" /><path d="M10 13h4" /></Icon>;
const IconSearch = () => <Icon size={18}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Icon>;
const IconCamera = () => <Icon size={14}><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></Icon>;
const IconCheck = () => <Icon size={16}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
const IconShield = () => <Icon><path d="M12 3 5 6v5.5c0 4.3 3 7.8 7 9.5 4-1.7 7-5.2 7-9.5V6z" /><path d="m9 12 2 2 4-4" /></Icon>;
const IconTarget = () => <Icon><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></Icon>;
const IconChat = () => <Icon><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></Icon>;
const IconTruck = () => <Icon><path d="M2.5 6h11v10h-11zM13.5 9.5h4l3 3.5V16h-7z" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></Icon>;
const IconEyeOff = () => <Icon size={16}><path d="M3 3l18 18" /><path d="M10.6 6.2A9.6 9.6 0 0 1 12 6c5 0 8.5 4.5 9 6-.3.8-1.3 2.4-2.9 3.8M6.4 7.6C4.4 9 3.3 11 3 12c.5 1.5 4 6 9 6 1.6 0 3-.4 4.2-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Icon>;
const IconRestore = () => <Icon size={16}><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" /><path d="M4 4v4.5h4.5" /></Icon>;
const IconExpand = () => <Icon size={18}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Icon>;
const IconPen = () => <Icon size={18}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></Icon>;
const IconSliders = () => <Icon size={18}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></Icon>;
const IconEye = () => <Icon size={14}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></Icon>;
const IconFlag = () => <Icon size={16}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></Icon>;
const IconUser = ({ size }) => <Icon size={size}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>;
const IconBell = () => <Icon size={22}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></Icon>;
const IconCalc = () => <Icon><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M8.5 7h7M8.5 11h1M12 11h1M15.5 11h0M8.5 14.5h1M12 14.5h1M8.5 18h1M12 18h1M15.5 14.5V18" /></Icon>;
const IconTrash = () => <Icon size={16}><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></Icon>;

/* =========================================================
   NAV
   ========================================================= */

function NavButton({ active, icon, label, badge, accent = false, onClick }) {
  return (
    <button
      className={`nav-button ${active ? 'active' : ''}`}
      onClick={onClick}
      type="button"
      aria-current={active ? 'page' : undefined}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
      {badge > 0 && <span className={`nav-badge ${accent ? 'accent' : ''}`}>{badge}</span>}
    </button>
  );
}

/* =========================================================
   HOME
   ========================================================= */

const ADVANTAGES = [
  { icon: <IconTarget />, title: 'Подбор', text: 'Найдём авто под ваш бюджет и задачи — даже если его нет в каталоге.' },
  { icon: <IconShield />, title: 'Проверка', text: 'VIN, история и состояние — до оплаты, с фото и видео.' },
  { icon: <IconTruck />, title: 'Доставка', text: 'Логистика из Китая до Уссурийска и растаможка под ключ.' },
  { icon: <IconChat />, title: 'На связи', text: 'Личный менеджер сопровождает сделку от выбора до выдачи.' },
];

const STEPS = [
  ['Выбор', 'Авто из каталога или подбор по вашему запросу.'],
  ['Проверка', 'Согласуем состояние, комплектацию и итоговую цену.'],
  ['Покупка', 'Выкупаем автомобиль и готовим документы.'],
  ['Доставка', 'Везём из Китая и проходим таможенное оформление.'],
  ['Выдача', 'Вы забираете автомобиль в Уссурийске.'],
  ['Доставка до дома', 'По желанию привезём автовозом в ваш город — прямо к дому.'],
];

const INCLUDED = [
  'покупка автомобиля',
  'доставка',
  'таможенное оформление',
  'все сопутствующие расходы',
];

function HomePage({ cars, loading, favorites, onFavorite, onCatalog, onWish, onCar, soldCars = [], onSold, onStories, onCalc, reviews = [] }) {
  const latest = cars.slice(0, 8);
  const [openFaq, setOpenFaq] = useState(0);
  const [allFaq, setAllFaq] = useState(false);
  const faqList = allFaq ? FAQS : FAQS.slice(0, 5);

  useReveal([loading, allFaq]);

  return (
    <div className="page home">
      {!loading && <StoriesRow cars={cars} onOpen={onStories} />}

      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />

        <Logo3D />

        <span className="eyebrow">Прямой экспортёр из Китая</span>

        <h1 className="hero-title">
          Автомобили из&nbsp;Китая <span className="chrome-text">под&nbsp;ключ</span>
        </h1>

        <p className="hero-text">
          Подбираем, проверяем и доставляем. Цена в карточке уже включает
          покупку, доставку до Уссурийска и растаможку.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={onCatalog} type="button">
            Каталог авто <span aria-hidden="true">→</span>
          </button>
          <button className="btn btn-ghost" onClick={onWish} type="button">
            Подбор
          </button>
        </div>

        <div className="hero-stats">
          <div>
            <strong>{loading ? '—' : cars.length}</strong>
            <span>авто в каталоге</span>
          </div>
          <div>
            <strong>Под ключ</strong>
            <span>до Уссурийска</span>
          </div>
          <div>
            <strong>Без доплат</strong>
            <span>все расходы в цене</span>
          </div>
        </div>
      </section>

      <section className="section reveal">
        <div className="section-head">
          <div>
            <span className="eyebrow">Новые поступления</span>
            <h2>Сейчас в продаже</h2>
          </div>
          <button className="link-button" onClick={onCatalog} type="button">Все →</button>
        </div>

        {loading ? (
          <div className="rail">
            {[0, 1].map((index) => <div key={index} className="car-card skeleton" />)}
          </div>
        ) : latest.length ? (
          <div className={latest.length > 1 ? 'rail' : 'showcase'}>
            {latest.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                compact
                favorite={favorites.includes(car.id)}
                onFavorite={() => onFavorite(car.id)}
                onClick={() => onCar(car)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Скоро здесь появятся авто" text="Новые автомобили добавляются автоматически из нашего канала." />
        )}
      </section>

      {soldCars.length > 0 && (
        <section className="section reveal">
          <div className="section-head">
            <div>
              <span className="eyebrow">Нам доверяют</span>
              <h2>Недавно продали</h2>
            </div>
            <button className="link-button" onClick={onSold} type="button">Все {soldCars.length} →</button>
          </div>

          <div className="rail">
            {soldCars.slice(0, 8).map((car) => (
              <CarCard key={car.id} car={car} compact archived onClick={() => onCar(car)} />
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="section reveal">
          <div className="section-head">
            <div>
              <span className="eyebrow">Отзывы</span>
              <h2>Клиенты с ключами</h2>
            </div>
          </div>
          <div className="rail reviews-rail">
            {reviews.slice(0, 12).map((review) => (
              <article className="review-card" key={review.id}>
                {review.photos[0] && <img src={`${API_BASE}${review.photos[0]}`} alt={`${review.name} и ${review.carTitle}`} loading="lazy" />}
                <div className="review-body">
                  <span className="review-stars" aria-label={`Оценка ${review.rating} из 5`}>{'★'.repeat(review.rating)}<em>{'★'.repeat(5 - review.rating)}</em></span>
                  <p>{review.text}</p>
                  <strong>{review.name}</strong>
                  <span>{review.carTitle}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="section reveal">
        <span className="eyebrow">Почему Micoor Car</span>
        <h2>Работаем напрямую</h2>

        <div className="advantages">
          {ADVANTAGES.map((item) => (
            <div className="advantage" key={item.title}>
              <span className="advantage-icon">{item.icon}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section included-card reveal">
        <span className="eyebrow">Цена под ключ</span>
        <h2>Что уже входит в&nbsp;стоимость</h2>

        <ul className="check-list">
          {INCLUDED.map((item) => (
            <li key={item}><span><IconCheck /></span>{item}</li>
          ))}
        </ul>

        <p className="muted">Цена в карточке указана до Уссурийска — со всеми расходами.</p>
      </section>

      <section className="section reveal">
        <button className="calc-promo" onClick={onCalc} type="button">
          <span className="calc-promo-icon"><IconCalc /></span>
          <span>
            <strong>Калькулятор растаможки</strong>
            <em>Единая ставка, сбор и утильсбор по курсу ЦБ</em>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <section className="section reveal">
        <span className="eyebrow">Как это работает</span>
        <h2>От выбора до&nbsp;ключей</h2>

        <ol className="steps">
          {STEPS.map(([title, text], index) => (
            <li key={title}>
              <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section request-card reveal">
        <div className="request-bg" aria-hidden="true" />
        <div className="request-logo" aria-hidden="true" />
        <span className="eyebrow">Не нашли нужный?</span>
        <h2>Найдём под ваш&nbsp;бюджет</h2>
        <p>Ответьте на 7 коротких вопросов — менеджер подберёт варианты на рынке Китая под ваши пожелания.</p>
        <button className="btn btn-primary" onClick={onWish} type="button">
          Заполнить анкету <span aria-hidden="true">→</span>
        </button>
        <button className="link-button request-alt" onClick={() => openManager('Здравствуйте! Ищу автомобиль: ')} type="button">
          или написать менеджеру
        </button>
      </section>

      <section className="section reveal">
        <span className="eyebrow">FAQ</span>
        <h2>Частые вопросы</h2>

        <div className="faq">
          {faqList.map((faq, index) => {
            const isOpen = openFaq === index;

            return (
              <div className={`faq-item ${isOpen ? 'is-open' : ''}`} key={faq.question}>
                <button
                  className="faq-question"
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? -1 : index)}
                >
                  <span>{faq.question}</span>
                  <span className="faq-icon" aria-hidden="true" />
                </button>
                <div className="faq-answer">
                  <div><p>{faq.answer}</p></div>
                </div>
              </div>
            );
          })}
        </div>

        {!allFaq && FAQS.length > 5 && (
          <button className="btn btn-ghost faq-more" onClick={() => setAllFaq(true)} type="button">
            Показать все вопросы · {FAQS.length}
          </button>
        )}
      </section>

      <footer className="footer reveal">
        <BrandLogo />
        <p>Прямой экспортёр автомобилей из Китая</p>
        <button className="link-button" onClick={() => openManager()} type="button">
          @{MANAGER_USERNAME}
        </button>
      </footer>
    </div>
  );
}

/* =========================================================
   АНКЕТА ПОЖЕЛАНИЙ
   ========================================================= */

const WISH_STEPS = [
  { id: 'body', placeholder: 'Например: лифтбек или универсал', title: 'Какой кузов нужен?', hint: 'Можно выбрать несколько', multi: true, options: ['Седан', 'Кроссовер', 'Внедорожник', 'Минивэн', 'Купе / спорт', 'Пикап', 'Не важно'] },
  { id: 'budget', placeholder: 'Например: до 3,5 млн ₽', title: 'Бюджет под ключ', hint: 'С доставкой и растаможкой до Уссурийска', options: ['до 2 млн ₽', '2–3 млн ₽', '3–4 млн ₽', '4–6 млн ₽', '6–10 млн ₽', 'от 10 млн ₽'] },
  { id: 'year', placeholder: 'Например: 2022–2024', title: 'Год выпуска', options: ['Новый автомобиль', '2023 и новее', '2020 и новее', 'Не важно'] },
  { id: 'fuel', placeholder: 'Например: подключаемый гибрид', title: 'Тип двигателя', hint: 'Можно выбрать несколько', multi: true, options: ['Бензин', 'Гибрид', 'Электро', 'Дизель', 'Не важно'] },
  { id: 'brands', placeholder: 'Например: BMW X5, Li Auto L9, Zeekr 001', title: 'Есть любимые марки?', hint: 'Выберите или нажмите «Пропустить»', multi: true, chips: true, optional: true, options: ['BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Lexus', 'Toyota', 'Land Rover', 'Volkswagen', 'MINI', 'Zeekr', 'Li Auto', 'BYD', 'Geely', 'Haval', 'Tank', 'Любая'] },
  { id: 'priorities', placeholder: 'Например: панорамная крыша, массаж сидений', title: 'Что для вас важнее всего?', hint: 'Можно выбрать несколько', multi: true, optional: true, options: ['Полный привод', '7 мест', 'Большой багажник', 'Экономичность', 'Динамика', 'Максимальная комплектация', 'Надёжность', 'Минимальный пробег'] },
  { id: 'timing', placeholder: 'Например: к весне', title: 'Когда планируете покупку?', options: ['В ближайший месяц', 'Через 1–3 месяца', 'Через полгода', 'Пока присматриваюсь'] },
  { id: 'contact', title: 'Куда прислать подборку?', type: 'contact' },
];

const BUDGET_RANGES = [[0, 2e6], [2e6, 3e6], [3e6, 4e6], [4e6, 6e6], [6e6, 10e6], [10e6, Infinity]];
const YEAR_MIN = { 'Новый автомобиль': 2025, '2023 и новее': 2023, '2020 и новее': 2020 };

function matchCars(cars, answers) {
  const budgetIndex = WISH_STEPS[1].options.indexOf(answers.budget?.[0]);
  const range = BUDGET_RANGES[budgetIndex];
  const minYear = YEAR_MIN[answers.year?.[0]] || 0;
  const brands = (answers.brands || []).filter((brand) => brand !== 'Любая');

  return cars.filter((car) => {
    const price = priceNumber(car.price);
    if (range && price && (price < range[0] * 0.9 || price > range[1] * 1.1)) return false;
    if (minYear && Number(car.year) && Number(car.year) < minYear) return false;
    if (brands.length && !brands.some((brand) => String(car.brand).toLowerCase() === brand.toLowerCase())) return false;
    return true;
  });
}

function WishPage({ cars, user, onSent, onCar, onCatalog, onExit }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [customs, setCustoms] = useState({});
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const advanceTimer = useRef(null);

  const current = WISH_STEPS[step];
  const selected = answers[current.id] || [];
  const customValue = customs[current.id] || '';
  const hasCustom = customValue.trim().length > 0;

  // Ответы вместе со «своим вариантом», который клиент вписал сам
  const fullAnswers = useMemo(() => {
    const result = {};
    WISH_STEPS.slice(0, -1).forEach((item) => {
      const own = (customs[item.id] || '').trim();
      const list = [...(answers[item.id] || []), ...(own ? [`✍️ ${own}`] : [])];
      if (list.length) result[item.id] = list;
    });
    return result;
  }, [answers, customs]);
  const progress = done ? 100 : Math.round((step / (WISH_STEPS.length - 1)) * 100);
  const matches = useMemo(() => matchCars(cars, answers), [cars, answers]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step, done]);

  function next() {
    haptic('light');
    setStep((value) => Math.min(value + 1, WISH_STEPS.length - 1));
  }

  function back() {
    haptic('light');
    if (step === 0) onExit();
    else setStep((value) => value - 1);
  }

  function choose(option) {
    haptic('selection');

    if (!current.multi) {
      setAnswers((value) => ({ ...value, [current.id]: [option] }));
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(next, 260);
      return;
    }

    const exclusive = option === 'Не важно' || option === 'Любая';

    setAnswers((value) => {
      const list = value[current.id] || [];
      let updated;

      if (list.includes(option)) {
        updated = list.filter((item) => item !== option);
      } else if (exclusive) {
        updated = [option];
      } else {
        updated = [...list.filter((item) => item !== 'Не важно' && item !== 'Любая'), option];
      }

      return { ...value, [current.id]: updated };
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (sending) return;

    const value = phone.trim();
    const digits = value.replace(/\D/g, '');

    if (digits.length < 7 || digits.length > 15) {
      setError('Введите номер с кодом страны, например +7 999 123-45-67.');
      haptic('error');
      return;
    }

    try {
      setSending(true);
      setError('');

      const tgUser = getTelegram()?.initDataUnsafe?.user || user;
      const client = {
        phone: value,
        userId: tgUser?.id || null,
        username: tgUser?.username || null,
        firstName: tgUser?.first_name || null,
        lastName: tgUser?.last_name || null,
      };

      let response = await fetch(`${API_BASE}/api/wishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': getTelegram()?.initData || '' },
        body: JSON.stringify({
          ...client,
          answers: fullAnswers,
          comment: comment.trim(),
          matches: matches.length,
        }),
      });

      // Старая версия сервера ещё не знает анкет — отправляем через заявки в ту же группу
      if (response.status === 404) {
        const summary = WISH_STEPS.slice(0, -1)
          .map((item) => (fullAnswers[item.id]?.length ? `${item.title} ${fullAnswers[item.id].join(', ')}` : null))
          .filter(Boolean)
          .join(' | ');

        response = await fetch(`${API_BASE}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...client,
            carId: 'анкета подбора',
            brand: '📝 АНКЕТА ПОДБОРА:',
            model: `${summary}${comment.trim() ? ` | Пожелания: ${comment.trim()}` : ''}`,
            price: answers.budget?.[0] || 'не указан',
            vin: '—',
          }),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось отправить анкету');
      }

      haptic('success');
      setDone(true);
      onSent?.();
    } catch (err) {
      console.error('Ошибка отправки анкеты:', err);
      setError('Не удалось отправить анкету. Проверьте интернет и попробуйте ещё раз.');
      haptic('error');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="page wish">
        <div className="wish-progress"><span style={{ width: '100%' }} /></div>

        <section className="wish-done">
          <span className="wish-done-icon"><IconCheck /></span>
          <h1>Анкета отправлена</h1>
          <p className="muted">
            Мы получили ваши пожелания, подберём варианты и свяжемся с вами в ближайшее время.
          </p>
        </section>

        {matches.length > 0 ? (
          <section className="section">
            <span className="eyebrow">Уже есть в каталоге</span>
            <h2>Подходят прямо сейчас · {matches.length}</h2>
            <div className="grid">
              {matches.slice(0, 6).map((car) => (
                <CarCard key={car.id} car={car} onClick={() => onCar(car)} />
              ))}
            </div>
          </section>
        ) : (
          <section className="section wish-empty">
            <p className="muted">
              В каталоге пока нет точных совпадений — менеджер найдёт варианты на рынке Китая специально под вас.
            </p>
          </section>
        )}

        <button className="btn btn-ghost wish-wide" onClick={onCatalog} type="button">
          Смотреть весь каталог
        </button>
      </div>
    );
  }

  return (
    <div className="page wish">
      <div className="wish-progress" aria-hidden="true"><span style={{ width: `${Math.max(progress, 6)}%` }} /></div>

      <div className="wish-head" key={step}>
        <span className="eyebrow">Анкета подбора · {step + 1} из {WISH_STEPS.length}</span>
        <h1>{current.title}</h1>
        {current.hint && <p className="muted">{current.hint}</p>}
      </div>

      {current.type === 'contact' ? (
        <form className="lead-form wish-contact" onSubmit={submit} id="wish-form">
          <div className="wish-summary">
            {WISH_STEPS.slice(0, -1).map((item) =>
              fullAnswers[item.id]?.length ? (
                <button key={item.id} type="button" onClick={() => setStep(WISH_STEPS.indexOf(item))}>
                  {fullAnswers[item.id].join(', ')}
                </button>
              ) : null
            )}
          </div>

          <label htmlFor="wish-phone">Номер телефона</label>
          <input
            id="wish-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 999 123-45-67"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={sending}
          />

          <label htmlFor="wish-comment">Пожелания своими словами</label>
          <textarea
            id="wish-comment"
            rows={3}
            maxLength={600}
            placeholder="Например: белый цвет, панорамная крыша, не старше 3 лет"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={sending}
          />

          {user && (
            <p className="lead-user">
              Telegram: {[user.first_name, user.last_name].filter(Boolean).join(' ')}
              {user.username ? ` · @${user.username}` : ''}
            </p>
          )}

          <p className="consent-note">Отправляя заявку, вы соглашаетесь на обработку номера телефона и имени в Telegram, чтобы менеджер MICOOR CAR мог связаться с вами.</p>

          {matches.length > 0 && (
            <p className="wish-hint">Под ваши ответы уже подходит авто в каталоге: {matches.length}</p>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      ) : (
        <div className={current.chips ? 'wish-chips' : 'wish-options'}>
          {current.options.map((option) => (
            <button
              key={option}
              className={`wish-option ${selected.includes(option) ? 'active' : ''}`}
              onClick={() => choose(option)}
              type="button"
              aria-pressed={selected.includes(option)}
            >
              <span>{option}</span>
              {!current.chips && <i className="wish-check"><IconCheck /></i>}
            </button>
          ))}
        </div>
      )}

      {current.type !== 'contact' && (
        <label className={`wish-custom ${hasCustom ? 'filled' : ''}`}>
          <span className="wish-custom-label">Свой вариант</span>
          <span className="wish-custom-field">
            <IconPen />
            <input
              type="text"
              maxLength={80}
              placeholder={current.placeholder || 'Впишите свой вариант'}
              value={customValue}
              onChange={(event) => setCustoms((value) => ({ ...value, [current.id]: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && hasCustom) {
                  event.preventDefault();
                  event.currentTarget.blur();
                  next();
                }
              }}
            />
          </span>
        </label>
      )}

      <div className="cta-bar wish-bar">
        <button className="btn btn-ghost" onClick={back} type="button">
          {step === 0 ? 'Выйти' : 'Назад'}
        </button>

        {current.type === 'contact' ? (
          <button className="btn btn-primary cta-main" type="submit" form="wish-form" disabled={sending}>
            {sending ? <span className="spinner" /> : 'Отправить анкету'}
          </button>
        ) : current.multi ? (
          <button
            className="btn btn-primary cta-main"
            onClick={next}
            type="button"
            disabled={!selected.length && !hasCustom && !current.optional}
          >
            {!selected.length && !hasCustom && current.optional ? 'Пропустить' : 'Далее'}
          </button>
        ) : (
          <button className="btn btn-primary cta-main" onClick={next} type="button" disabled={!selected.length && !hasCustom}>
            Далее
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CATALOG
   ========================================================= */

const SORTS = [
  ['new', 'Сначала новые объявления'],
  ['cheap', 'Сначала дешевле'],
  ['expensive', 'Сначала дороже'],
  ['year', 'Год: новее'],
  ['mileage', 'Пробег: меньше'],
];

const EMPTY_FILTERS = {
  brand: '',
  model: '',
  priceFrom: '',
  priceTo: '',
  yearFrom: '',
  yearTo: '',
  mileageTo: '',
  volumeFrom: '',
  volumeTo: '',
  powerFrom: '',
  powerTo: '',
  fuel: [],
  transmission: [],
  drive: [],
};

const FUELS = ['Бензин', 'Дизель', 'Гибрид', 'Электро'];
const TRANSMISSIONS = ['Автомат', 'Робот', 'Вариатор', 'Механика'];
const DRIVES = ['Передний', 'Задний', 'Полный'];
const VOLUMES = ['1.0', '1.2', '1.4', '1.5', '1.6', '1.8', '2.0', '2.5', '3.0', '3.5', '4.0', '5.0'];
const YEARS = Array.from({ length: 22 }, (_, index) => String(2026 - index));

function digitsOnly(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function formatThousands(value) {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString('ru-RU') : '';
}

function carNumbers(car) {
  return {
    price: priceNumber(car.price),
    year: Number(car.year) || 0,
    mileage: Number(digitsOnly(car.mileage)) || 0,
    volume: parseFloat(String(car.engine || '').replace(',', '.')) || 0,
    power: Number(String(car.power || '').match(/\d+/)?.[0]) || 0,
  };
}

function modelFamily(car) {
  const words = String(car.model || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words[1] && /^(series|class|klasse|серии|класс)$/i.test(words[1])) return `${words[0]} ${words[1]}`;
  if (words[1] && /^[A-ZА-Я]{3,}$/.test(words[0]) && /^[A-ZА-Я]{3,}$/.test(words[1])) return `${words[0]} ${words[1]}`;
  return words[0];
}

function textHas(value, needle) {
  return String(value || '').toLowerCase().includes(needle.toLowerCase());
}

function applyFilters(cars, filters, query) {
  const search = query.trim().toLowerCase();
  const num = (value) => Number(digitsOnly(value)) || 0;

  return cars.filter((car) => {
    const n = carNumbers(car);

    if (filters.brand && car.brand !== filters.brand) return false;
    if (filters.model && modelFamily(car) !== filters.model) return false;
    if (filters.priceFrom && n.price < num(filters.priceFrom)) return false;
    if (filters.priceTo && (!n.price || n.price > num(filters.priceTo))) return false;
    if (filters.yearFrom && n.year < Number(filters.yearFrom)) return false;
    if (filters.yearTo && (!n.year || n.year > Number(filters.yearTo))) return false;
    if (filters.mileageTo && n.mileage > num(filters.mileageTo)) return false;
    if (filters.volumeFrom && n.volume < Number(filters.volumeFrom)) return false;
    if (filters.volumeTo && (!n.volume || n.volume > Number(filters.volumeTo))) return false;
    if (filters.powerFrom && n.power < num(filters.powerFrom)) return false;
    if (filters.powerTo && (!n.power || n.power > num(filters.powerTo))) return false;
    if (filters.fuel.length && !filters.fuel.some((fuel) => textHas(car.fuel || car.text, fuel))) return false;
    if (filters.transmission.length && !filters.transmission.some((item) => textHas(car.transmission || car.text, item))) return false;
    if (filters.drive.length && !filters.drive.some((item) => textHas(car.drive || car.text, item))) return false;

    if (search) {
      const haystack = [car.title, car.brand, car.model, car.year, car.vin].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

function sortCars(cars, sort) {
  const list = [...cars];
  const n = (car) => carNumbers(car);

  if (sort === 'cheap') return list.sort((a, b) => (n(a).price || Infinity) - (n(b).price || Infinity));
  if (sort === 'expensive') return list.sort((a, b) => n(b).price - n(a).price);
  if (sort === 'year') return list.sort((a, b) => n(b).year - n(a).year);
  if (sort === 'mileage') return list.sort((a, b) => (n(a).mileage || Infinity) - (n(b).mileage || Infinity));
  return list;
}

function rangeLabel(from, to, unit, format = (value) => value) {
  if (from && to) return `${format(from)}–${format(to)} ${unit}`;
  if (from) return `от ${format(from)} ${unit}`;
  return `до ${format(to)} ${unit}`;
}

function activeChips(filters) {
  const chips = [];
  if (filters.brand) chips.push({ label: filters.brand, clear: { brand: '', model: '' } });
  if (filters.model) chips.push({ label: filters.model, clear: { model: '' } });
  if (filters.priceFrom || filters.priceTo) chips.push({ label: rangeLabel(filters.priceFrom, filters.priceTo, '₽', formatThousands), clear: { priceFrom: '', priceTo: '' } });
  if (filters.yearFrom || filters.yearTo) chips.push({ label: rangeLabel(filters.yearFrom, filters.yearTo, 'г.'), clear: { yearFrom: '', yearTo: '' } });
  if (filters.mileageTo) chips.push({ label: `пробег до ${formatThousands(filters.mileageTo)} км`, clear: { mileageTo: '' } });
  if (filters.volumeFrom || filters.volumeTo) chips.push({ label: rangeLabel(filters.volumeFrom, filters.volumeTo, 'л'), clear: { volumeFrom: '', volumeTo: '' } });
  if (filters.powerFrom || filters.powerTo) chips.push({ label: rangeLabel(filters.powerFrom, filters.powerTo, 'л.с.'), clear: { powerFrom: '', powerTo: '' } });
  filters.fuel.forEach((item) => chips.push({ label: item, clear: { fuel: filters.fuel.filter((value) => value !== item) } }));
  filters.transmission.forEach((item) => chips.push({ label: item, clear: { transmission: filters.transmission.filter((value) => value !== item) } }));
  filters.drive.forEach((item) => chips.push({ label: `${item} привод`, clear: { drive: filters.drive.filter((value) => value !== item) } }));
  return chips;
}

function RangeRow({ label, from, to, onFrom, onTo, unit, numeric = true, options }) {
  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <div className="range-row">
        {options ? (
          <>
            <select value={from} onChange={(event) => onFrom(event.target.value)} aria-label={`${label} от`}>
              <option value="">от</option>
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={to} onChange={(event) => onTo(event.target.value)} aria-label={`${label} до`}>
              <option value="">до</option>
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </>
        ) : (
          <>
            <label className="range-input">
              <input
                inputMode="numeric"
                placeholder="от"
                value={numeric ? formatThousands(from) : from}
                onChange={(event) => onFrom(digitsOnly(event.target.value))}
              />
              {unit && <span>{unit}</span>}
            </label>
            <label className="range-input">
              <input
                inputMode="numeric"
                placeholder="до"
                value={numeric ? formatThousands(to) : to}
                onChange={(event) => onTo(digitsOnly(event.target.value))}
              />
              {unit && <span>{unit}</span>}
            </label>
          </>
        )}
      </div>
    </div>
  );
}

function ToggleChips({ label, options, value, onChange }) {
  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <div className="filter-chips">
        {options.map((option) => {
          const active = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={`chip ${active ? 'active' : ''}`}
              onClick={() => {
                haptic('selection');
                onChange(active ? value.filter((item) => item !== option) : [...value, option]);
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterSheet({ cars, filters, query, onApply, onClose }) {
  const [draft, setDraft] = useState(filters);
  const set = (patch) => setDraft((value) => ({ ...value, ...patch }));

  const brands = useMemo(
    () => [...new Set(cars.map((car) => car.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [cars]
  );

  const models = useMemo(
    () => [...new Set(cars.filter((car) => !draft.brand || car.brand === draft.brand).map(modelFamily).filter(Boolean))].sort(),
    [cars, draft.brand]
  );

  const count = useMemo(() => applyFilters(cars, draft, query).length, [cars, draft, query]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title">
        <div className="modal-handle" />

        <div className="filter-head">
          <h2 id="filter-title">Параметры</h2>
          <button className="link-button" type="button" onClick={() => setDraft(EMPTY_FILTERS)}>Сбросить</button>
        </div>

        <div className="filter-body">
          <div className="filter-group">
            <span className="filter-label">Марка и модель</span>
            <div className="range-row">
              <select value={draft.brand} onChange={(event) => set({ brand: event.target.value, model: '' })} aria-label="Марка">
                <option value="">Любая марка</option>
                {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
              <select value={draft.model} onChange={(event) => set({ model: event.target.value })} aria-label="Модель" disabled={!models.length}>
                <option value="">Любая модель</option>
                {models.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </div>
          </div>

          <RangeRow label="Цена под ключ, ₽" from={draft.priceFrom} to={draft.priceTo} onFrom={(value) => set({ priceFrom: value })} onTo={(value) => set({ priceTo: value })} unit="₽" />
          <RangeRow label="Год выпуска" from={draft.yearFrom} to={draft.yearTo} onFrom={(value) => set({ yearFrom: value })} onTo={(value) => set({ yearTo: value })} options={YEARS} />

          <div className="filter-group">
            <span className="filter-label">Пробег</span>
            <label className="range-input wide">
              <input
                inputMode="numeric"
                placeholder="до"
                value={formatThousands(draft.mileageTo)}
                onChange={(event) => set({ mileageTo: digitsOnly(event.target.value) })}
              />
              <span>км</span>
            </label>
          </div>

          <RangeRow label="Объём двигателя, л" from={draft.volumeFrom} to={draft.volumeTo} onFrom={(value) => set({ volumeFrom: value })} onTo={(value) => set({ volumeTo: value })} options={VOLUMES} />
          <RangeRow label="Мощность" from={draft.powerFrom} to={draft.powerTo} onFrom={(value) => set({ powerFrom: value })} onTo={(value) => set({ powerTo: value })} unit="л.с." numeric={false} />

          <ToggleChips label="Топливо" options={FUELS} value={draft.fuel} onChange={(value) => set({ fuel: value })} />
          <ToggleChips label="Коробка" options={TRANSMISSIONS} value={draft.transmission} onChange={(value) => set({ transmission: value })} />
          <ToggleChips label="Привод" options={DRIVES} value={draft.drive} onChange={(value) => set({ drive: value })} />
        </div>

        <div className="filter-footer">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              haptic('light');
              onApply(draft);
            }}
          >
            {count ? `Показать ${count} авто` : 'Ничего не найдено'}
          </button>
        </div>
      </section>
    </div>
  );
}

function CatalogPage({
  cars,
  archivedCount,
  loading,
  error,
  favorites,
  onCar,
  onFavorite,
  onRetry,
  onArchive,
  onWish,
  initData,
  onToast,
  adminStats,
  search,
  onSearch,
  isAdmin,
  busyId,
  onAdmin,
}) {
  const { query, filters, sort } = search;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const brands = useMemo(() => {
    const counts = new Map();
    cars.forEach((car) => {
      if (car.brand) counts.set(car.brand, (counts.get(car.brand) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cars]);

  const visible = useMemo(() => sortCars(applyFilters(cars, filters, query), sort), [cars, filters, query, sort]);
  const chips = activeChips(filters);

  const update = (patch) => onSearch({ ...search, ...patch });
  const updateFilters = (patch) => update({ filters: { ...filters, ...patch } });

  return (
    <div className="page">
      <section className="page-head">
        <span className="eyebrow">Micoor Car</span>
        <h1>Каталог</h1>
        <div className="catalog-tabs">
          <span className="active">В продаже · {loading ? '…' : cars.length}</span>
          {archivedCount > 0 && (
            <button type="button" onClick={onArchive}>Продано · {archivedCount}</button>
          )}
        </div>
      </section>

      {isAdmin && (
        <section className="admin-dash">
          <div className="admin-dash-head">
            <strong>Режим администратора</strong>
            <button className="link-button" onClick={onArchive} type="button">Архив проданных · {archivedCount} →</button>
          </div>
          <div className="admin-metrics">
            <div><b>{adminStats?.todayViews ?? '—'}</b><span>просмотров сегодня</span></div>
            <div><b>{adminStats?.weekViews ?? '—'}</b><span>за 7 дней</span></div>
            <div><b>{adminStats?.weekLeads ?? '—'}</b><span>заявок за 7 дней</span></div>
          </div>
          <p>Продали машину — нажмите «Продано» на её карточке.</p>
        </section>
      )}

      <div className="toolbar">
        <div className="search-row">
          <label className="search">
            <IconSearch />
            <input
              type="search"
              placeholder="Марка, модель, год…"
              value={query}
              onChange={(event) => update({ query: event.target.value })}
            />
          </label>

          <button className={`filter-button ${chips.length ? 'has-active' : ''}`} onClick={() => setSheetOpen(true)} type="button">
            <IconSliders />
            <span>Фильтры</span>
            {chips.length > 0 && <em>{chips.length}</em>}
          </button>
        </div>

        {brands.length > 1 && (
          <div className="chips" aria-label="Марка">
            <button className={`chip ${!filters.brand ? 'active' : ''}`} onClick={() => updateFilters({ brand: '', model: '' })} type="button">
              Все <span>{cars.length}</span>
            </button>
            {brands.map(([name, count]) => (
              <button
                key={name}
                className={`chip ${filters.brand === name ? 'active' : ''}`}
                onClick={() => { haptic('selection'); updateFilters({ brand: filters.brand === name ? '' : name, model: '' }); }}
                type="button"
              >
                {name} <span>{count}</span>
              </button>
            ))}
          </div>
        )}

        {chips.length > 0 && (
          <div className="active-filters">
            {chips.map((chip) => (
              <button key={chip.label} className="active-chip" type="button" onClick={() => updateFilters(chip.clear)}>
                {chip.label} <span aria-hidden="true">×</span>
              </button>
            ))}
            <button className="link-button" type="button" onClick={() => update({ filters: EMPTY_FILTERS, query: '' })}>
              Сбросить всё
            </button>
          </div>
        )}

        {chips.length > 0 && (
          <button className="subscribe-button" onClick={() => setSubscribeOpen(true)} type="button">
            <IconBell /> Сообщить о новых по этому поиску
          </button>
        )}

        <div className="results-row">
          <span>{loading ? '' : `Найдено: ${visible.length}`}</span>
          <label className="sort-select">
            <select value={sort} onChange={(event) => update({ sort: event.target.value })} aria-label="Сортировка">
              {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {loading && (
        <div className="grid">
          {[0, 1, 2].map((index) => <div key={index} className="car-card skeleton" />)}
        </div>
      )}

      {!loading && error && (
        <div className="error-state">
          <strong>Каталог временно недоступен</strong>
          <span>{error}</span>
          <button className="btn btn-ghost" onClick={onRetry} type="button">Повторить</button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon"><IconSearch /></span>
          <h2>{cars.length ? 'Под эти параметры авто пока нет' : 'Пока пусто'}</h2>
          <p>{cars.length ? 'Оставьте анкету — подберём такую машину на рынке Китая.' : 'Новые автомобили появятся здесь совсем скоро.'}</p>
          {cars.length > 0 && <button className="btn btn-primary" onClick={onWish} type="button">Заполнить анкету</button>}
          {cars.length > 0 && chips.length > 0 && (
            <button className="btn btn-ghost" onClick={() => setSubscribeOpen(true)} type="button">Сообщить, когда появится</button>
          )}
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="grid">
          {visible.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              favorite={favorites.includes(car.id)}
              onClick={() => onCar(car)}
              onFavorite={() => onFavorite(car.id)}
              isAdmin={isAdmin}
              busy={busyId === car.id}
              onAdmin={onAdmin}
            />
          ))}
        </div>
      )}

      {subscribeOpen && (
        <SubscribeSheet
          filters={filters}
          chips={chips}
          initData={initData}
          onClose={() => setSubscribeOpen(false)}
          onDone={(data) => {
            setSubscribeOpen(false);
            onToast(data.matching ? `Подписка оформлена · уже подходит: ${data.matching}` : 'Подписка оформлена — бот напишет о новых авто', 'success');
          }}
        />
      )}

      {sheetOpen && (
        <FilterSheet
          cars={cars}
          filters={filters}
          query={query}
          onClose={() => setSheetOpen(false)}
          onApply={(next) => {
            update({ filters: next });
            setSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
   УМНЫЕ МЕТКИ
   ========================================================= */

function carLabels(car) {
  const price = priceNumber(car.price);
  const oldPrice = Number(car.oldPrice) || 0;
  const published = Date.parse(car.publishedAt || car.createdAt || '') || 0;
  const sold = car.status === 'hidden';

  return {
    isNew: !sold && published && Date.now() - published < 3 * 86400e3,
    drop: !sold && oldPrice && price && price < oldPrice ? oldPrice - price : 0,
    oldPrice,
    hot: !sold && (Number(car.viewsToday) || 0) >= 3 ? Number(car.viewsToday) : 0,
  };
}

/* =========================================================
   ПОДПИСКА НА ПОИСК
   ========================================================= */

function SubscribeSheet({ filters, chips, initData, onClose, onDone }) {
  const [priceDrops, setPriceDrops] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function subscribe() {
    if (sending) return;

    if (!initData) {
      setError('Подписка работает, когда каталог открыт через Telegram-бота @micoocarbot.');
      return;
    }

    try {
      setSending(true);
      setError('');

      const response = await fetch(`${API_BASE}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
        body: JSON.stringify({ filters, priceDrops, label: chips.map((chip) => chip.label).join(' · ') }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'Не удалось оформить подписку');

      haptic('success');
      onDone(data);
    } catch (err) {
      setError(err.message);
      haptic('error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && !sending && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="sub-title">
        <div className="modal-handle" />

        <div className="sub-head">
          <span className="sub-icon"><IconBell /></span>
          <div>
            <h2 id="sub-title">Сообщить о новых</h2>
            <p className="muted">Бот напишет в Telegram, как только появится подходящее авто</p>
          </div>
        </div>

        <span className="filter-label">Ваш поиск</span>
        <div className="active-filters sub-chips">
          {chips.length ? chips.map((chip) => (
            <span key={chip.label} className="active-chip">{chip.label}</span>
          )) : <span className="active-chip">Все автомобили</span>}
        </div>

        <label className="switch-row">
          <span>Также сообщать о снижении цены</span>
          <input type="checkbox" checked={priceDrops} onChange={(event) => setPriceDrops(event.target.checked)} />
          <i aria-hidden="true" />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="btn btn-primary sub-submit" onClick={subscribe} type="button" disabled={sending}>
          {sending ? <span className="spinner" /> : 'Подписаться на поиск'}
        </button>
      </section>
    </div>
  );
}

function MySubscriptions({ initData }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!initData) return;
    fetch(`${API_BASE}/api/subscriptions`, { headers: { 'X-Telegram-Init-Data': initData } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setItems(data?.items || []))
      .catch(() => setItems([]));
  }, [initData]);

  async function remove(id) {
    haptic('medium');
    setItems((current) => current.filter((item) => item.id !== id));
    await fetch(`${API_BASE}/api/subscriptions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Telegram-Init-Data': initData },
    }).catch(() => {});
  }

  if (!initData || !items || !items.length) return null;

  return (
    <section className="section my-subs">
      <span className="eyebrow">Уведомления</span>
      <h2>Мои подписки</h2>
      {items.map((item) => (
        <div className="sub-row" key={item.id}>
          <span className="sub-icon small"><IconBell /></span>
          <div>
            <strong>{item.label || 'Все автомобили'}</strong>
            <span>{item.priceDrops ? 'Новые авто и снижение цены' : 'Только новые авто'}</span>
          </div>
          <button className="sub-remove" onClick={() => remove(item.id)} type="button" aria-label="Удалить подписку">×</button>
        </div>
      ))}
    </section>
  );
}

/* =========================================================
   СТОРИС-ЛЕНТА
   ========================================================= */

function StoriesRow({ cars, onOpen }) {
  if (!cars.length) return null;

  return (
    <div className="stories-row" aria-label="Сторис">
      {cars.slice(0, 12).map((car, index) => (
        <button key={car.id} className="story-bubble" onClick={() => onOpen(index)} type="button">
          <span className="story-ring">
            <CarImage src={car.photoUrl} alt="" />
          </span>
          <em>{car.brand || 'Авто'}</em>
        </button>
      ))}
    </div>
  );
}

function StoriesViewer({ cars, start, favorites, onFavorite, onClose, onDetails, onLead }) {
  const feedRef = useRef(null);
  const [index, setIndex] = useState(start);
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = start * feed.clientHeight;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScroll() {
    const feed = feedRef.current;
    if (!feed) return;
    const next = Math.round(feed.scrollTop / feed.clientHeight);
    if (next !== index) {
      setIndex(next);
      setPhoto(0);
      haptic('selection');
    }
  }

  function tapPhoto(event, car) {
    const photos = car.photos?.length ? car.photos : [car.photoUrl];
    const rect = event.currentTarget.getBoundingClientRect();
    const forward = event.clientX - rect.left > rect.width * 0.35;
    setPhoto((value) => Math.max(0, Math.min(photos.length - 1, value + (forward ? 1 : -1))));
  }

  return (
    <div className="stories" role="dialog" aria-modal="true" aria-label="Сторис автомобилей">
      <div className="stories-progress" aria-hidden="true">
        {cars.map((car, carIndex) => (
          <span key={car.id} className={carIndex < index ? 'done' : carIndex === index ? 'active' : ''} />
        ))}
      </div>

      <div className="stories-top">
        <span className="stories-count">{index + 1} из {cars.length}</span>
        <button className="viewer-close" onClick={onClose} type="button" aria-label="Закрыть">×</button>
      </div>

      <div className="stories-feed" ref={feedRef} onScroll={onScroll}>
        {cars.map((car, carIndex) => {
          const photos = car.photos?.length ? car.photos : [car.photoUrl];
          const shown = carIndex === index ? photos[Math.min(photo, photos.length - 1)] : photos[0];
          const labels = carLabels(car);
          const specs = [car.year, car.mileage, car.engine || car.fuel, car.power].filter(Boolean);
          const isFavorite = favorites.includes(car.id);

          return (
            <section className="story" key={car.id}>
              <div className="story-photo" onClick={(event) => tapPhoto(event, car)}>
                {Math.abs(carIndex - index) <= 1 ? <CarImage src={shown} alt={carName(car)} eager={carIndex === index} /> : null}
              </div>

              {carIndex === index && photos.length > 1 && (
                <div className="story-photos" aria-hidden="true">
                  {photos.map((item, photoIndex) => <span key={item} className={photoIndex === photo ? 'active' : ''} />)}
                </div>
              )}

              <div className="story-info">
                <div className="story-badges">
                  {labels.isNew && <span className="label label-new">Новинка</span>}
                  {labels.drop > 0 && <span className="label label-drop">Цена снижена</span>}
                </div>
                <span className="story-brand">{car.brand}</span>
                <h2>{car.model || car.title}</h2>
                <div className="story-specs">
                  {specs.map((spec) => <span key={spec}>{spec}</span>)}
                </div>
                <div className="story-price">
                  {formatPrice(car.price)} <em>под ключ</em>
                </div>

                <div className="story-actions">
                  <button
                    className={`story-fav ${isFavorite ? 'is-favorite' : ''}`}
                    onClick={() => onFavorite(car.id)}
                    type="button"
                    aria-label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
                  >
                    <IconHeart filled={isFavorite} />
                  </button>
                  <button className="btn story-more" onClick={() => onDetails(car)} type="button">Подробнее</button>
                  <button className="btn story-want" onClick={() => onLead(car)} type="button">Хочу это авто</button>
                </div>

                {carIndex < cars.length - 1 && (
                  <div className="story-hint" aria-hidden="true">Свайп вверх — следующее авто</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   КАЛЬКУЛЯТОР РАСТАМОЖКИ
   ========================================================= */

const CURRENCIES = [['CNY', '¥ юань'], ['USD', '$ доллар'], ['EUR', '€ евро'], ['RUB', '₽ рубль']];
const AGES = [['new', 'До 3 лет'], ['3-5', '3–5 лет'], ['5+', 'Старше 5']];
const ENGINE_TYPES = [['petrol', 'Бензин'], ['diesel', 'Дизель'], ['hybrid', 'Гибрид'], ['electric', 'Электро']];

function rub(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('ru-RU')} ₽`;
}

function CustomsPage({ preset, onWish }) {
  const [form, setForm] = useState(() => ({
    price: '',
    currency: 'CNY',
    age: 'new',
    volume: '',
    power: '',
    fuel: 'petrol',
    ...(preset || {}),
  }));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (patch) => setForm((value) => ({ ...value, ...patch }));

  useEffect(() => {
    const ready = form.fuel === 'electric' || (Number(form.price) && Number(form.volume) && Number(form.power));
    if (!ready) {
      setResult(null);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');
        const query = new URLSearchParams(form).toString();
        const response = await fetch(`${API_BASE}/api/customs?${query}`, { signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || 'Расчёт временно недоступен');
        setResult(data);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form]);

  return (
    <div className="page calc">
      <section className="page-head">
        <span className="eyebrow">Для физических лиц</span>
        <h1>Калькулятор растаможки</h1>
        <p className="muted">Единая ставка, таможенный сбор и утильсбор для авто из Китая по курсу ЦБ на сегодня.</p>
      </section>

      <div className="calc-card">
        <div className="filter-group">
          <span className="filter-label">Стоимость авто в Китае</span>
          <label className="range-input wide">
            <input
              inputMode="numeric"
              placeholder="Например, 200 000"
              value={formatThousands(form.price)}
              onChange={(event) => set({ price: digitsOnly(event.target.value) })}
            />
          </label>
          <div className="filter-chips">
            {CURRENCIES.map(([value, label]) => (
              <button key={value} type="button" className={`chip ${form.currency === value ? 'active' : ''}`} onClick={() => set({ currency: value })}>{label}</button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">Возраст автомобиля</span>
          <div className="segmented">
            {AGES.map(([value, label]) => (
              <button key={value} type="button" className={form.age === value ? 'active' : ''} onClick={() => set({ age: value })}>{label}</button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">Двигатель</span>
          <div className="filter-chips">
            {ENGINE_TYPES.map(([value, label]) => (
              <button key={value} type="button" className={`chip ${form.fuel === value ? 'active' : ''}`} onClick={() => set({ fuel: value })}>{label}</button>
            ))}
          </div>
        </div>

        {form.fuel !== 'electric' && (
          <div className="range-row">
            <label className="range-input">
              <input inputMode="numeric" placeholder="Объём" value={form.volume} onChange={(event) => set({ volume: digitsOnly(event.target.value) })} />
              <span>см³</span>
            </label>
            <label className="range-input">
              <input inputMode="numeric" placeholder="Мощность" value={form.power} onChange={(event) => set({ power: digitsOnly(event.target.value) })} />
              <span>л.с.</span>
            </label>
          </div>
        )}
      </div>

      <section className={`calc-result ${loading ? 'is-loading' : ''}`} aria-live="polite">
        {!result && !error && (
          <p className="muted">Заполните стоимость, объём и мощность — расчёт появится здесь.</p>
        )}

        {error && <p className="form-error">{error}</p>}

        {result && !result.supported && <p className="muted">{result.reason}</p>}

        {result?.supported && (
          <>
            <div className="calc-total">
              <span>Таможенные платежи</span>
              <strong>{rub(result.total)}</strong>
            </div>

            <div className="calc-lines">
              <div><span>Таможенная стоимость</span><b>{rub(result.customsValueRub)}</b></div>
              <div><span>Единая ставка <em>{result.dutyRule}</em></span><b>{rub(result.duty)}</b></div>
              <div><span>Таможенный сбор</span><b>{rub(result.fee)}</b></div>
              <div><span>Утильсбор <em>{result.utilPreferential ? 'льготный' : 'по таблице мощности'}</em></span><b>{rub(result.util)}</b></div>
            </div>

            {!result.utilPreferential && (
              <p className="calc-warn">Мощность больше 160 л.с. или объём больше 3 л — утильсбор считается по повышенной таблице.</p>
            )}

            {result.hybridNote && (
              <p className="calc-warn">Для гибридов итог зависит от типа установки — менеджер уточнит расчёт.</p>
            )}
          </>
        )}

        {result?.rates && (
          <p className="calc-rates">
            Курс ЦБ на {new Date(result.rates.date || Date.now()).toLocaleDateString('ru-RU')}: € {result.rates.EUR.toFixed(2)} · ¥ {result.rates.CNY.toFixed(2)} · $ {result.rates.USD.toFixed(2)}
          </p>
        )}
      </section>

      <p className="calc-note">
        Расчёт для личного пользования по ставкам 2026 года: единая таможенная пошлина (Решение ЕЭК № 107), таможенный сбор (ПП № 1638) и утильсбор (ПП № 1291). Курс евро — по ЦБ на сегодня. Доставка и услуги в сумму не входят — итог под ключ посчитает менеджер.
      </p>

      <button className="btn btn-primary wish-wide" onClick={onWish} type="button">
        Получить расчёт под ключ
      </button>
    </div>
  );
}

/* =========================================================
   ПРОФИЛЬ КЛИЕНТА
   ========================================================= */

const REQUEST_STATUS_LABEL = {
  new: { text: 'Отправлена', tone: 'new' },
  work: { text: 'В работе', tone: 'work' },
  done: { text: 'Завершена', tone: 'done' },
};

function formatShortDate(value) {
  try {
    return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function monthGenitive(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${MONTHS_GEN[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTHS_GEN[date.getMonth()]}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function DealTimeline({ deal, stages }) {
  const currentIndex = Math.max(0, stages.findIndex((stage) => stage.id === deal.stage));
  return (
    <ol className="deal-timeline">
      {stages.map((stage, index) => (
        <li key={stage.id} className={index < currentIndex ? 'done' : index === currentIndex ? 'current' : ''}>
          <span className="deal-dot">{index < currentIndex ? '✓' : index + 1}</span>
          <span>{stage.title}</span>
        </li>
      ))}
    </ol>
  );
}

function DealHistory({ deal, stages, limit = 4 }) {
  const titles = Object.fromEntries(stages.map((stage) => [stage.id, stage.title]));
  const items = [...(deal.history || [])].reverse().filter((item) => item.note || item.stage).slice(0, limit);
  if (!items.length) return null;
  return (
    <ul className="deal-history">
      {items.map((item, index) => (
        <li key={`${item.at}-${index}`}>
          <time>{formatDateTime(item.at)}</time>
          {item.stage && <strong>{titles[item.stage] || item.stage}</strong>}
          {item.note && <p>{item.note}</p>}
        </li>
      ))}
    </ul>
  );
}

function DealTracker({ deal, stages, initData, onReload, onToast }) {
  const arrived = deal.stage === 'arrived';
  return (
    <section className={`deal-card ${arrived ? 'arrived' : ''}`}>
      <span className="eyebrow">{arrived ? 'Авто приехал' : 'Ваш автомобиль в пути'}</span>
      <h2>{deal.title}</h2>
      <DealTimeline deal={deal} stages={stages} />
      <DealHistory deal={deal} stages={stages} />
      {arrived && !deal.reviewStatus && (
        <ReviewForm deal={deal} initData={initData} onDone={() => { onReload(); onToast('Спасибо за отзыв!', 'success'); }} />
      )}
      {deal.reviewStatus && (
        <p className="deal-thanks">⭐ Спасибо за отзыв! {deal.reviewStatus === 'published' ? 'Он уже на главной.' : 'Опубликуем после проверки.'}</p>
      )}
    </section>
  );
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('bad image'));
    };
    image.src = url;
  });
}

function ReviewForm({ deal, initData, onDone }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function addPhotos(event) {
    const files = [...(event.target.files || [])].slice(0, 3 - photos.length);
    event.target.value = '';
    try {
      const prepared = await Promise.all(files.map(compressImage));
      setPhotos((current) => [...current, ...prepared].slice(0, 3));
      setError('');
    } catch {
      setError('Не получилось открыть фото. Попробуйте другое.');
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    if (text.trim().length < 3) {
      setError('Напишите пару слов о покупке');
      haptic('error');
      return;
    }
    try {
      setSending(true);
      setError('');
      const response = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
        body: JSON.stringify({ dealId: deal.id, rating, text: text.trim(), photos }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'Не удалось отправить отзыв');
      haptic('success');
      onDone();
    } catch (err) {
      setError(err.message || 'Не удалось отправить отзыв. Попробуйте ещё раз.');
      haptic('error');
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="review-form" onSubmit={submit} noValidate>
      <strong>Поздравляем с покупкой! Оставьте отзыв и фото с автомобилем</strong>
      <div className="star-input" role="radiogroup" aria-label="Оценка">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} из 5`}
            className={value <= rating ? 'on' : ''} onClick={() => { haptic('light'); setRating(value); }}>★</button>
        ))}
      </div>
      <textarea placeholder="Как прошла покупка и доставка? Довольны автомобилем?" value={text}
        onChange={(event) => { setText(event.target.value); setError(''); }} maxLength={1500} disabled={sending} />
      <div className="review-photos">
        {photos.map((photo, index) => (
          <span className="review-thumb" key={index}>
            <img src={photo} alt="" />
            <button type="button" aria-label="Убрать фото" onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}>×</button>
          </span>
        ))}
        {photos.length < 3 && (
          <label className="review-add">
            <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={sending} />
            <span>📸</span>
            <em>{photos.length ? 'Ещё фото' : 'Фото с авто'}</em>
          </label>
        )}
      </div>
      <p className="consent-note">Отправляя отзыв, вы соглашаетесь, что его текст, ваше имя из Telegram и фото будут опубликованы в мини‑приложении MICOOR CAR. Снять отзыв с публикации можно по запросу менеджеру.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={sending}>
        {sending ? <span className="spinner" /> : 'Отправить отзыв'}
      </button>
    </form>
  );
}

/* =========================================================
   СДЕЛКИ — ДЛЯ АДМИНА
   ========================================================= */

function DealsPage({ isAdmin, initData, cars, onToast }) {
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    if (!initData) return;
    fetch(`${API_BASE}/api/admin/deals`, { headers: { 'X-Telegram-Init-Data': initData } })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => setData(result?.success ? result : { deals: [], clients: [], stages: [] }))
      .catch(() => setData({ deals: [], clients: [], stages: [] }));
  }, [initData]);

  useEffect(() => { load(); }, [load]);

  if (!isAdmin) {
    return <EmptyState title="Раздел для администратора" text="Здесь менеджеры ведут покупки клиентов." />;
  }

  const active = (data?.deals || []).filter((deal) => deal.stage !== 'arrived');
  const finished = (data?.deals || []).filter((deal) => deal.stage === 'arrived');

  return (
    <div className="page deals-page">
      <section className="page-head">
        <span className="eyebrow">Администратор</span>
        <h1>Сделки</h1>
        <p className="muted">Отметьте покупку клиента и ведите авто по этапам — клиент получает каждое обновление в боте и видит его в профиле.</p>
      </section>

      {creating ? (
        <NewDealForm data={data} cars={cars} initData={initData} onCancel={() => setCreating(false)}
          onCreated={() => { setCreating(false); load(); onToast('Покупка оформлена, клиент получил уведомление', 'success'); }} />
      ) : (
        <button className="btn btn-primary deals-new" type="button" onClick={() => { haptic('light'); setCreating(true); }}>＋ Отметить покупку клиента</button>
      )}

      {!data && <p className="muted">Загружаем…</p>}

      {data && !data.deals.length && !creating && (
        <div className="profile-empty">
          <p className="muted">Сделок пока нет. Отметить покупку можно здесь или кнопкой «🤝 Клиент купил» под заявкой в группе.</p>
        </div>
      )}

      {active.length > 0 && <h2 className="deals-group">В пути · {active.length}</h2>}
      {active.map((deal) => (
        <AdminDealCard key={deal.id} deal={deal} stages={data.stages} initData={initData} open={openId === deal.id}
          onToggle={() => setOpenId(openId === deal.id ? null : deal.id)} onSaved={load} onToast={onToast} />
      ))}

      {finished.length > 0 && <h2 className="deals-group">Выданы · {finished.length}</h2>}
      {finished.map((deal) => (
        <AdminDealCard key={deal.id} deal={deal} stages={data.stages} initData={initData} open={openId === deal.id}
          onToggle={() => setOpenId(openId === deal.id ? null : deal.id)} onSaved={load} onToast={onToast} />
      ))}
    </div>
  );
}

function AdminDealCard({ deal, stages, initData, open, onToggle, onSaved, onToast }) {
  const [stage, setStage] = useState(deal.stage);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const current = stages.find((item) => item.id === deal.stage);

  useEffect(() => { setStage(deal.stage); }, [deal.stage]);

  async function save() {
    if (saving) return;
    if (stage === deal.stage && !note.trim()) {
      setError('Выберите новый этап или напишите комментарий');
      haptic('error');
      return;
    }
    const goingArrived = stage === 'arrived' && deal.stage !== 'arrived';
    if (goingArrived && !(await confirmAction('Отметить, что авто приехал? Клиент получит уведомление и просьбу оставить отзыв с фото.'))) return;

    try {
      setSaving(true);
      setError('');
      const response = await fetch(`${API_BASE}/api/admin/deals/${encodeURIComponent(deal.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
        body: JSON.stringify({ stage, note: note.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Не удалось сохранить');
      setNote('');
      haptic('success');
      onToast(result.notified ? 'Сохранено, клиент получил уведомление' : 'Сохранено (клиент не получил сообщение — возможно, бот заблокирован)', result.notified ? 'success' : 'default');
      onSaved();
    } catch (err) {
      setError(err.message);
      haptic('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`admin-deal ${open ? 'open' : ''}`}>
      <button className="admin-deal-head" type="button" onClick={onToggle} aria-expanded={open}>
        <div>
          <strong>{deal.title}</strong>
          <span>{deal.client}</span>
        </div>
        <em className={`deal-stage-pill ${deal.stage}`}>{current ? `${current.emoji} ${current.title}` : deal.stage}</em>
      </button>

      {open && (
        <div className="admin-deal-body">
          <DealTimeline deal={deal} stages={stages} />

          <label className="deal-label">Этап</label>
          <div className="stage-picker">
            {stages.map((item) => (
              <button key={item.id} type="button" className={stage === item.id ? 'active' : ''} onClick={() => { haptic('light'); setStage(item.id); setError(''); }}>
                {item.emoji} {item.title}
              </button>
            ))}
          </div>

          <label className="deal-label" htmlFor={`note-${deal.id}`}>Комментарий для клиента</label>
          <textarea id={`note-${deal.id}`} placeholder="Например: прошли границу, ориентир прибытия 12 ноября" value={note}
            onChange={(event) => { setNote(event.target.value); setError(''); }} maxLength={500} />

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary" type="button" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Сохранить и уведомить клиента'}
          </button>

          <h3 className="deal-label">История</h3>
          <DealHistory deal={deal} stages={stages} limit={20} />
          {deal.reviewStatus && <p className="muted">⭐ Отзыв: {deal.reviewStatus === 'published' ? 'опубликован' : deal.reviewStatus === 'pending' ? 'ждёт проверки в группе заявок' : 'не опубликован'}</p>}
        </div>
      )}
    </article>
  );
}

function NewDealForm({ data, cars, initData, onCancel, onCreated }) {
  const [userId, setUserId] = useState('');
  const [carId, setCarId] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [markSold, setMarkSold] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const clients = data?.clients || [];

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    if (!userId) return setError('Выберите клиента');
    if (!carId && !title.trim()) return setError('Выберите авто из каталога или впишите название');
    try {
      setSaving(true);
      setError('');
      const response = await fetch(`${API_BASE}/api/admin/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
        body: JSON.stringify({ userId: Number(userId), carId: carId || null, title: title.trim(), note: note.trim(), markSold }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Не удалось сохранить');
      haptic('success');
      onCreated();
    } catch (err) {
      setError(err.message);
      haptic('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="new-deal" onSubmit={submit} noValidate>
      <h2>Покупка клиента</h2>

      <label className="deal-label" htmlFor="nd-client">Клиент</label>
      <select id="nd-client" value={userId} onChange={(event) => { setUserId(event.target.value); setError(''); }}>
        <option value="">Выберите клиента</option>
        {clients.map((client) => (
          <option key={client.userId} value={client.userId}>{client.name}{client.last ? ` — ${client.last}` : ''}</option>
        ))}
      </select>
      {!clients.length && <p className="muted">Клиенты появятся здесь после первой заявки или заполнения профиля в мини‑аппе.</p>}

      <label className="deal-label" htmlFor="nd-car">Автомобиль</label>
      <select id="nd-car" value={carId} onChange={(event) => { setCarId(event.target.value); setError(''); }}>
        <option value="">Не из каталога — впишу вручную</option>
        {cars.map((car) => (
          <option key={car.id} value={car.id}>{carName(car)} · {formatPrice(car.price)}</option>
        ))}
      </select>
      {!carId && (
        <input type="text" placeholder="Например: Zeekr 001 YOU 2024, белый" value={title} onChange={(event) => { setTitle(event.target.value); setError(''); }} />
      )}
      {carId && (
        <label className="switch-row">
          <span>Перевести авто в «Продано»</span>
          <input type="checkbox" checked={markSold} onChange={(event) => setMarkSold(event.target.checked)} />
          <i aria-hidden="true" />
        </label>
      )}

      <label className="deal-label" htmlFor="nd-note">Комментарий для клиента (необязательно)</label>
      <textarea id="nd-note" placeholder="Например: оплата получена, авто выкуплен у дилера" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="new-deal-actions">
        <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={saving}>Отмена</button>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? <span className="spinner" /> : 'Оформить'}</button>
      </div>
    </form>
  );
}

function ProfilePage({ user, initData, data, onSaved, onReload, favoritesCount, recentCars, onCar, onFavorites, onCatalog, onWish, onToast, isAdmin, onDeals }) {
  const profile = data?.profile;
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setNotifications(profile.notifications);
  }, [profile]);

  useEffect(() => { onReload?.(); }, [onReload]);

  if (!initData) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="empty-icon"><IconUser size={28} /></span>
          <h2>Профиль доступен в Telegram</h2>
          <p>Откройте мини‑приложение через бота @micoocarbot, чтобы видеть свои заявки и подписки.</p>
          <button className="btn btn-primary" onClick={onCatalog} type="button">Открыть каталог</button>
        </div>
      </div>
    );
  }

  async function toggleNotifications(value) {
    if (saving) return;
    const previous = notifications;
    setNotifications(value);
    haptic('light');
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
        body: JSON.stringify({ notifications: value }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error('save failed');
      onSaved(result.profile);
    } catch {
      setNotifications(previous);
      onToast('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  }

  async function removeSub(id) {
    haptic('medium');
    await fetch(`${API_BASE}/api/subscriptions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Telegram-Init-Data': initData },
    }).catch(() => {});
    onReload();
  }

  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Клиент';
  const initial = name.trim().charAt(0).toUpperCase();
  const requests = data?.requests || [];
  const subs = data?.subscriptions || [];
  const since = profile?.createdAt ? monthGenitive(profile.createdAt) : null;

  return (
    <div className="page profile-page">
      <section className="profile-head">
        <span className="profile-avatar">
          {user?.photo_url ? <img src={user.photo_url} alt="" /> : initial}
        </span>
        <div>
          <h1>{name}</h1>
          <p className="muted">
            {user?.username ? `@${user.username}` : 'Telegram'}
            {since ? ` · с нами с ${since}` : ''}
          </p>
        </div>
      </section>

      <div className="profile-stats">
        <button type="button" onClick={onFavorites}>
          <span>Избранное</span>
          <strong>{favoritesCount}</strong>
        </button>
        <button type="button" onClick={() => document.getElementById('profile-subs')?.scrollIntoView({ behavior: 'smooth' })}>
          <span>Подписки</span>
          <strong>{subs.length}</strong>
        </button>
      </div>

      {isAdmin && (
        <button className="admin-deals-link" type="button" onClick={onDeals}>
          <span>🚚</span>
          <div>
            <strong>Сделки клиентов</strong>
            <em>Отмечайте покупки и ведите авто до выдачи</em>
          </div>
          <b aria-hidden="true">→</b>
        </button>
      )}

      {(data?.deals || []).map((deal) => (
        <DealTracker key={deal.id} deal={deal} stages={data.stages || []} initData={initData} onReload={onReload} onToast={onToast} />
      ))}

      <section className="profile-block">
        <h2>Мои заявки</h2>
        {!data && <p className="muted">Загружаем…</p>}
        {data && requests.length === 0 && (
          <div className="profile-empty">
            <p className="muted">Заявок пока нет. Выберите авто в каталоге или заполните анкету — менеджер подберёт варианты.</p>
            <button className="btn btn-ghost" type="button" onClick={onWish}>Заполнить анкету</button>
          </div>
        )}
        {requests.map((item) => {
          const status = REQUEST_STATUS_LABEL[item.status] || REQUEST_STATUS_LABEL.new;
          return (
            <div className="request-row" key={item.id}>
              <div className="request-top">
                <strong>{item.type === 'wish' ? 'Анкета подбора' : item.title}</strong>
                <span className={`request-status ${status.tone}`}>{status.text}</span>
              </div>
              <span className="request-meta">
                {formatShortDate(item.createdAt)}
                {item.summary ? ` · ${item.summary}` : ''}
              </span>
            </div>
          );
        })}
      </section>

      <section className="profile-block" id="profile-subs">
        <h2>Мои подписки</h2>
        {subs.length === 0 ? (
          <div className="profile-empty">
            <p className="muted">Задайте фильтры в каталоге и нажмите «Сообщить о новых» — бот напишет, как только появится подходящее авто.</p>
            <button className="btn btn-ghost" type="button" onClick={onCatalog}>Настроить в каталоге</button>
          </div>
        ) : (
          subs.map((item) => (
            <div className="sub-row" key={item.id}>
              <span className="sub-icon small"><IconBell /></span>
              <div>
                <strong>{item.label || 'Все автомобили'}</strong>
                <span>{item.priceDrops ? 'Новые авто и снижение цены' : 'Только новые авто'}</span>
              </div>
              <button className="sub-remove" onClick={() => removeSub(item.id)} type="button" aria-label="Удалить подписку">×</button>
            </div>
          ))
        )}
      </section>

      {recentCars.length > 0 && (
        <section className="profile-block">
          <h2>Недавно смотрели</h2>
          <div className="recent-row">
            {recentCars.map((car) => (
              <button className="recent-card" key={car.id} type="button" onClick={() => onCar(car)}>
                <CarImage src={car.photoUrl} alt="" />
                <strong>{carName(car)}</strong>
                <span>{car.status === 'hidden' ? 'Продано' : formatPrice(car.price)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="profile-block">
        <h2>Уведомления</h2>
        <label className="switch-row">
          <span>Сообщать о новых авто и снижении цен</span>
          <input type="checkbox" checked={notifications} disabled={saving} onChange={(event) => toggleNotifications(event.target.checked)} />
          <i aria-hidden="true" />
        </label>
        <p className="muted">Сообщения о ваших заявках и купленном авто приходят всегда.</p>
      </section>
    </div>
  );
}

function FavoritesPage({ cars, favorites, onCar, onFavorite, onCatalog, initData }) {
  return (
    <div className="page">
      <section className="page-head">
        <span className="eyebrow">Сохранённые</span>
        <h1>Избранное</h1>
        <p className="muted">{cars.length ? `${cars.length} авто` : 'Пока ничего'}</p>
      </section>

      {cars.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><IconHeart size={28} /></span>
          <h2>Здесь будет ваше избранное</h2>
          <p>Нажимайте на сердечко у авто, чтобы сравнить варианты позже.</p>
          <button className="btn btn-primary" onClick={onCatalog} type="button">Открыть каталог</button>
        </div>
      ) : (
        <div className="grid">
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

      <MySubscriptions initData={initData} />
    </div>
  );
}

function ArchivePage({ cars, stats, onCar, isAdmin, busyId, onAdmin }) {
  return (
    <div className="page">
      <section className="page-head">
        <span className="eyebrow">{isAdmin ? 'Архив проданных · управление' : 'История продаж'}</span>
        <h1>Продано</h1>
        <p className="muted">
          {isAdmin
            ? 'Клиенты видят эти авто с пометкой «Продано». Если сделка сорвалась — верните машину в продажу в один тап.'
            : 'Автомобили, которые мы уже привезли клиентам. Понравился какой-то — подберём такой же.'}
        </p>
      </section>

      {isAdmin && stats?.top?.length > 0 && (
        <section className="admin-top">
          <span className="eyebrow">Самые просматриваемые в продаже</span>
          {stats.top.map((item, index) => (
            <div className="admin-top-row" key={item.id}>
              <span>{index + 1}</span>
              <strong>{item.title}</strong>
              <em><IconEye /> {item.views}</em>
              <em>заявок {item.leads}</em>
            </div>
          ))}
        </section>
      )}

      {cars.length === 0 ? (
        <EmptyState
          title="Проданных пока нет"
          text={isAdmin ? 'Нажмите «Продано» на карточке авто — и оно появится здесь.' : 'Скоро здесь появятся автомобили, которые мы уже продали.'}
        />
      ) : (
        <div className="grid">
          {cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              archived
              onClick={() => onCar(car)}
              isAdmin={isAdmin}
              busy={busyId === car.id}
              onAdmin={onAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CAR CARD
   ========================================================= */

function CarImage({ src, alt, className = '', eager = false }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`image-placeholder ${className}`}>
        <BrandLogo />
      </div>
    );
  }

  return (
    <img
      className={`${className} ${loaded ? 'is-loaded' : ''}`}
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}

function AdminActions({ car, archived, busy, onAdmin, large = false }) {
  return (
    <div className={`admin-actions ${large ? 'large' : ''}`}>
      {archived ? (
        <>
          <button className="admin-btn restore" disabled={busy} onClick={() => onAdmin(car, 'restore')} type="button">
            <IconRestore /> {busy ? '…' : 'Вернуть в продажу'}
          </button>
          <button className="admin-btn danger" disabled={busy} onClick={() => onAdmin(car, 'delete')} type="button">
            <IconTrash /> Удалить
          </button>
        </>
      ) : (
        <button className="admin-btn" disabled={busy} onClick={() => onAdmin(car, 'hide')} type="button">
          <IconFlag /> {busy ? 'Переносим…' : 'Продано → в архив'}
        </button>
      )}
    </div>
  );
}

function CarCard({
  car,
  compact = false,
  archived = false,
  favorite = false,
  onClick,
  onFavorite,
  isAdmin = false,
  busy = false,
  onAdmin,
}) {
  const specs = [car.mileage, car.engine || car.fuel, car.power].filter(Boolean).slice(0, 3);
  const labels = carLabels(car);

  return (
    <article className={`car-card ${compact ? 'compact' : ''} ${archived ? 'archived' : ''} ${busy ? 'is-busy' : ''}`}>
      <button className="car-card-main" onClick={onClick} type="button">
        <div className="car-card-media">
          <CarImage src={car.photoUrl} alt={carName(car)} />
          <div className="media-shade" />
          {archived && <span className="sold-stamp">Продано</span>}

          <div className="media-badges">
            {labels.isNew && <span className="label label-new">Новинка</span>}
            {labels.drop > 0 && <span className="label label-drop">Цена снижена</span>}
            {car.year && <span className="badge">{car.year}</span>}
            {car.photos?.length > 1 && (
              <span className="badge"><IconCamera /> {car.photos.length}</span>
            )}
            {archived && (
              <span className="badge badge-muted">
                Продано{car.soldAt || car.hiddenAt ? ` ${new Date(car.soldAt || car.hiddenAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}` : ''}
              </span>
            )}
          </div>

          {!isAdmin && labels.hot > 0 && (
            <div className="views-badge">Смотрели сегодня: {labels.hot}</div>
          )}

          {isAdmin && car.stats && (
            <div className="views-badge">
              <IconEye /> {car.stats.views}
              {car.stats.leads > 0 && <span>· заявок {car.stats.leads}</span>}
            </div>
          )}
        </div>

        <div className="car-card-body">
          <span className="car-brand">{car.brand || 'Auto'}</span>
          <strong className="car-model">{car.model || car.title}</strong>

          {specs.length > 0 && (
            <div className="car-specs">
              {specs.map((spec) => <span key={spec}>{spec}</span>)}
            </div>
          )}

          <div className="car-card-footer">
            <span className="car-price-wrap">
              {labels.drop > 0 && <s className="old-price">{rub(labels.oldPrice)}</s>}
              <span className={`car-price ${labels.drop > 0 ? 'is-drop' : ''}`}>{formatPrice(car.price)}</span>
            </span>
            {labels.drop > 0 && <span className="drop-chip">−{rub(labels.drop)}</span>}
            <span className="car-more" aria-hidden="true">→</span>
          </div>
        </div>
      </button>

      {onFavorite && !archived && (
        <button
          className={`card-favorite ${favorite ? 'is-favorite' : ''}`}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
          type="button"
          aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
          aria-pressed={favorite}
        >
          <IconHeart filled={favorite} size={18} />
        </button>
      )}

      {isAdmin && onAdmin && (
        <AdminActions car={car} archived={archived} busy={busy} onAdmin={onAdmin} />
      )}
    </article>
  );
}

/* =========================================================
   CAR DETAIL
   ========================================================= */

function CarDetail({ car, isFavorite, onFavorite, onLead, onCalc, isAdmin, busyId, onAdmin }) {
  const photos = Array.isArray(car.photos) && car.photos.length
    ? car.photos
    : car.photoUrl
      ? [car.photoUrl]
      : [];

  const trackRef = useRef(null);
  const thumbsRef = useRef(null);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [viewer, setViewer] = useState(null);
  const archived = car.status === 'hidden';

  const descriptionText = String(car.description || car.text || '')
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) =>
      !/^\s*━{3,}\s*$/.test(line) &&
      !/^\s*🚗\s*НОВЫЙ\s+АВТОМОБИЛЬ\s*$/i.test(line)
    )
    .join('\n')
    .trim();

  const lowerText = descriptionText.toLowerCase();
  const deliveredTo = /усс?ури/i.test(descriptionText) ? 'под ключ до Уссурийска' : 'под ключ';
  const includes = INCLUDED.filter((item, index) =>
    lowerText.includes(['покуп', 'доставк', 'таможен', 'сопутств'][index])
  );

  const engineValue = car.engine && car.fuel && !String(car.engine).toLowerCase().includes(car.fuel.toLowerCase())
    ? `${car.engine} ${car.fuel}`
    : car.engine || car.fuel;

  const meta = [car.year, car.mileage, engineValue].filter(Boolean).join(' · ');

  function goTo(index) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (index !== active) setActive(index);
  }

  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children?.[active];
    if (!strip || !thumb) return;
    strip.scrollTo({
      left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [active]);

  return (
    <div className="page detail">
      <section className="gallery">
        {photos.length > 0 ? (
          <div className="gallery-track" ref={trackRef} onScroll={onScroll}>
            {photos.map((photo, index) => (
              <div
                className="gallery-slide"
                key={photo}
                onClick={() => { haptic('light'); setViewer(index); }}
              >
                <CarImage src={photo} alt={`${carName(car)} — фото ${index + 1}`} eager={index === 0} />
              </div>
            ))}
          </div>
        ) : (
          <div className="image-placeholder gallery-empty"><BrandLogo /></div>
        )}

        {photos.length > 1 && (
          <>
            <span className="gallery-counter">{active + 1} / {photos.length}</span>
            <div className="gallery-dots" aria-hidden="true">
              {photos.map((photo, index) => (
                <span key={photo} className={index === active ? 'active' : ''} />
              ))}
            </div>
          </>
        )}

        {archived && <span className="gallery-archived">Продано</span>}

        {photos.length > 0 && (
          <button className="gallery-expand" onClick={() => setViewer(active)} type="button" aria-label="Открыть фото на весь экран">
            <IconExpand />
          </button>
        )}
      </section>

      {viewer !== null && (
        <PhotoViewer photos={photos} start={viewer} title={carName(car)} onClose={() => setViewer(null)} />
      )}

      {photos.length > 1 && (
        <div className="thumbs" ref={thumbsRef}>
          {photos.map((photo, index) => (
            <button
              key={photo}
              className={`thumb ${index === active ? 'active' : ''}`}
              onClick={() => goTo(index)}
              type="button"
              aria-label={`Фото ${index + 1}`}
            >
              <CarImage src={photo} alt="" />
            </button>
          ))}
        </div>
      )}

      <section className="detail-head">
        <span className="eyebrow">{car.brand || 'Автомобиль'}</span>
        <h1>{car.model || car.title}</h1>
        {meta && <p className="detail-meta">{meta}</p>}
      </section>

      {archived && (
        <section className="sold-banner">
          <IconFlag />
          <div>
            <strong>Этот автомобиль уже продан</strong>
            <span>Подберём такой же или похожий — с теми же характеристиками и под ваш бюджет.</span>
          </div>
        </section>
      )}

      <section className="price-card">
        <span className="price-label">{archived ? 'Продан за — цена' : 'Цена'} {deliveredTo}</span>
        {carLabels(car).drop > 0 && (
          <span className="price-old">
            <s>{rub(carLabels(car).oldPrice)}</s> <em>−{rub(carLabels(car).drop)}</em>
          </span>
        )}
        <strong className="price-value">{formatPrice(car.price)}</strong>

        {includes.length > 0 && (
          <ul className="check-list compact">
            {includes.map((item) => (
              <li key={item}><span><IconCheck /></span>{item}</li>
            ))}
          </ul>
        )}
      </section>

      {!archived && (
        <button className="calc-link" onClick={() => onCalc(car)} type="button">
          <IconCalc /> Как считается растаможка для такого авто →
        </button>
      )}

      {isAdmin && (
        <section className="admin-panel">
          <div>
            <strong>Управление</strong>
            <span>{archived ? 'Продано — авто в архиве, покупатели не видят' : 'Авто в продаже, видно покупателям'}</span>
          </div>
          {car.stats && (
            <div className="admin-metrics compact">
              <div><b>{car.stats.views}</b><span>просмотров</span></div>
              <div><b>{car.stats.uniqueViews}</b><span>уникальных</span></div>
              <div><b>{car.stats.leads}</b><span>заявок</span></div>
            </div>
          )}
          <AdminActions car={car} archived={archived} busy={busyId === car.id} onAdmin={onAdmin} large />
        </section>
      )}

      <section className="specs">
        <SpecItem label="Год" value={car.year} />
        <SpecItem label="Пробег" value={car.mileage} />
        <SpecItem label="Двигатель" value={engineValue} />
        <SpecItem label="Мощность" value={car.power} />
        <SpecItem label="Коробка" value={car.transmission} />
        <SpecItem label="Привод" value={car.drive} />
        <SpecItem label="VIN" value={car.vin} mono />
      </section>

      {descriptionText && (
        <section className={`description ${expanded ? 'is-expanded' : ''}`}>
          <h2>Описание</h2>
          <div className="description-text">{descriptionText}</div>
          {descriptionText.length > 280 && (
            <button className="link-button" onClick={() => setExpanded((value) => !value)} type="button">
              {expanded ? 'Свернуть' : 'Показать полностью'}
            </button>
          )}
        </section>
      )}

      {archived && (
        <div className="cta-bar">
          <button className="btn btn-primary cta-main" onClick={onLead} type="button">
            Хочу такой же
          </button>
        </div>
      )}

      {!archived && (
        <div className="cta-bar">
          <button
            className={`cta-favorite ${isFavorite ? 'is-favorite' : ''}`}
            onClick={onFavorite}
            type="button"
            aria-label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
            aria-pressed={isFavorite}
          >
            <IconHeart filled={isFavorite} />
          </button>
          <button className="btn btn-primary cta-main" onClick={onLead} type="button">
            Связаться с менеджером
          </button>
        </div>
      )}
    </div>
  );
}

function SpecItem({ label, value, mono = false }) {
  if (!value) return null;

  return (
    <div className="spec">
      <span>{label}</span>
      <strong className={mono ? 'mono' : ''}>{value}</strong>
    </div>
  );
}

/* =========================================================
   LEAD MODAL
   ========================================================= */

function LeadModal({ car, user, onClose, onSent }) {
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const sold = car.status === 'hidden';

  async function submit(event) {
    event.preventDefault();
    if (sending) return;

    const value = phone.trim();
    const digits = value.replace(/\D/g, '');

    if (digits.length < 7 || digits.length > 15) {
      setError('Введите номер с кодом страны, например +7 999 123-45-67.');
      haptic('error');
      return;
    }

    try {
      setSending(true);
      setError('');

      const tgUser = getTelegram()?.initDataUnsafe?.user || user;

      const response = await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': getTelegram()?.initData || '' },
        body: JSON.stringify({
          carId: car.id,
          brand: sold ? `🔁 ХОЧЕТ ТАКОЙ ЖЕ (проданный): ${car.brand || ''}` : car.brand,
          model: car.model,
          price: car.price,
          vin: car.vin,
          phone: value,
          userId: tgUser?.id || null,
          username: tgUser?.username || null,
          firstName: tgUser?.first_name || null,
          lastName: tgUser?.last_name || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось отправить заявку');
      }

      onSent();
    } catch (err) {
      console.error('Ошибка отправки заявки:', err);
      setError('Не удалось отправить заявку. Попробуйте ещё раз или напишите менеджеру в Telegram.');
      haptic('error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !sending) onClose();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="lead-title">
        <div className="modal-handle" />

        <div className="modal-car">
          <CarImage src={car.photoUrl} alt="" />
          <div>
            <span>{car.brand}</span>
            <strong>{car.model || car.title}</strong>
            <em>{formatPrice(car.price)}</em>
          </div>
        </div>

        <h2 id="lead-title">{sold ? 'Подобрать такой же' : 'Связаться с менеджером'}</h2>
        <p className="muted">
          {sold
            ? 'Этот автомобиль уже продан. Оставьте номер — подберём такой же или похожий на рынке Китая.'
            : 'Оставьте номер — менеджер перезвонит и ответит на вопросы по этому авто.'}
        </p>

        <form className="lead-form" onSubmit={submit}>
          <label htmlFor="lead-phone">Номер телефона</label>
          <input
            id="lead-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 999 123-45-67"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={sending}
          />

          {user && (
            <p className="lead-user">
              Telegram: {[user.first_name, user.last_name].filter(Boolean).join(' ')}
              {user.username ? ` · @${user.username}` : ''}
            </p>
          )}

          <p className="consent-note">Отправляя заявку, вы соглашаетесь на обработку номера телефона и имени в Telegram, чтобы менеджер MICOOR CAR мог связаться с вами.</p>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={sending}>
            {sending ? <span className="spinner" /> : 'Отправить заявку'}
          </button>

          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => openManager(`Здравствуйте! Интересует ${carName(car)}${car.vin ? ` (VIN ${car.vin})` : ''}.`)}
          >
            Написать в Telegram
          </button>
        </form>
      </section>
    </div>
  );
}

/* =========================================================
   STATES
   ========================================================= */

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><BrandLogo /></span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

export default App;
