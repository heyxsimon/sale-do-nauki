(function () {
  'use strict';

  const KLUCZ_PAMIECI = 'sale-do-nauki-rezerwacje';
  const MAKSYMALNIE_GODZIN = 4;
  const MAKSYMALNIE_DNI = 30;
  let OTWARCIE = 8, ZAMKNIECIE = 20;
  let SALE = [];
  let ZAJETE = [];
  let moje = wczytajMoje();

  const tresc = document.getElementById('tresc');
  const okno = document.getElementById('okno');
  const szeroki = window.matchMedia('(min-width: 900px)');
  let poprzedniWidok = '';

  // Narzędzia
  const dwieCyfry = (liczba) => String(liczba).padStart(2, '0');
  const pelnaGodzina = (godzina) => dwieCyfry(godzina) + ':00';
  const dataTekst = (data) => `${data.getFullYear()}-${dwieCyfry(data.getMonth() + 1)}-${dwieCyfry(data.getDate())}`;
  const dodajDni = (data, dni) => { const nowa = new Date(data); nowa.setDate(nowa.getDate() + dni); return nowa; };
  const dataZTekstu = (tekst) => { const [rok, miesiac, dzien] = tekst.split('-').map(Number); return new Date(rok, miesiac - 1, dzien); };
  const dzisiaj = () => dataTekst(new Date());
  const poprawnaData = (tekst) => /^\d{4}-\d{2}-\d{2}$/.test(tekst || '') && !isNaN(dataZTekstu(tekst));
  const DNI_TYGODNIA = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const bezpieczny = (tekst) => String(tekst).replace(/[&<>"']/g, (znak) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[znak]));

  function opisDaty(tekst) {
    if (tekst === dzisiaj()) return 'dziś';
    const data = dataZTekstu(tekst);
    const krotko = `${data.getDate()}.${dwieCyfry(data.getMonth() + 1)}`;
    if (tekst === dataTekst(dodajDni(new Date(), 1))) return 'jutro, ' + krotko;
    return `${DNI_TYGODNIA[data.getDay()]}, ${krotko}`;
  }
  const zakresKrotki = (od, dokad) => `${od}-${dokad}`;
  const zakresPelny = (od, dokad) => `${pelnaGodzina(od)}-${pelnaGodzina(dokad)}`;

  function wczytajMoje() {
    try { return JSON.parse(localStorage.getItem(KLUCZ_PAMIECI)) || []; } catch (blad) { return []; }
  }
  function zapiszMoje() {
    try { localStorage.setItem(KLUCZ_PAMIECI, JSON.stringify(moje)); } catch (blad) { }
  }
  const salaPoId = (id) => SALE.find((sala) => sala.id === id);
  const nazwaSali = (sala) => `Sala ${sala.numer}`;

  // Zajętość sal
  function godzinySali(sala, data) {
    const teraz = new Date();
    const czyDzisiaj = data === dzisiaj();
    const wynik = [];
    for (let godzina = OTWARCIE; godzina < ZAMKNIECIE; godzina++) {
      let stan = 'wolne';
      if (czyDzisiaj && godzina <= teraz.getHours()) stan = 'minelo';
      if (ZAJETE.some((rez) => rez.sala === sala.id && rez.data === data && godzina >= rez.od && godzina < rez.do)) stan = 'zajete';
      if (moje.some((rez) => rez.sala === sala.id && rez.data === data && godzina >= rez.od && godzina < rez.do)) stan = 'twoja';
      wynik.push({ godzina, stan });
    }
    return wynik;
  }
  const czyWolna = (sala, data, od, dokad) =>
    godzinySali(sala, data).filter((pole) => pole.godzina >= od && pole.godzina < dokad).every((pole) => pole.stan === 'wolne');

  function wolneOkna(sala, data) {
    const okna = []; let biezace = null;
    godzinySali(sala, data).forEach((pole) => {
      if (pole.stan === 'wolne') { if (!biezace) biezace = { od: pole.godzina, do: pole.godzina + 1 }; else biezace.do = pole.godzina + 1; }
      else if (biezace) { okna.push(biezace); biezace = null; }
    });
    if (biezace) okna.push(biezace);
    return okna;
  }
  const opisOkien = (okna) => okna.map((okno) => zakresKrotki(okno.od, okno.do)).join(', ');

  // Filtr
  function domyslne() {
    const teraz = new Date();
    let data = dataTekst(teraz), od = teraz.getHours() + 1;
    if (od >= ZAMKNIECIE) { data = dataTekst(dodajDni(teraz, 1)); od = OTWARCIE; }
    if (od < OTWARCIE) od = OTWARCIE;
    return { data, od, do: Math.min(od + 2, ZAMKNIECIE), osoby: 4 };
  }
  function odczytajFiltr(parametry) {
    const wartosci = domyslne();
    let data = parametry.get('data');
    if (!poprawnaData(data) || data < dzisiaj()) data = wartosci.data;
    let od = parseInt(parametry.get('od'), 10), dokad = parseInt(parametry.get('do'), 10), osoby = parseInt(parametry.get('osoby'), 10);
    if (!(od >= OTWARCIE && od < ZAMKNIECIE)) od = wartosci.od;
    if (!(dokad > od && dokad <= ZAMKNIECIE)) dokad = Math.min(od + 1, ZAMKNIECIE);
    if (!(osoby >= 1)) osoby = wartosci.osoby;
    return { data, od, do: dokad, osoby };
  }
  const adresFiltra = (filtr) => `?data=${filtr.data}&od=${filtr.od}&do=${filtr.do}&osoby=${filtr.osoby}`;

  // Nawigacja
  function trasa() {
    const adres = location.hash.slice(1) || '/';
    const [sciezka, zapytanie] = adres.split('?');
    return { czesci: sciezka.split('/').filter(Boolean), parametry: new URLSearchParams(zapytanie || '') };
  }
  function ustawNawigacje(czesci) {
    const pierwsza = czesci[0] || '';
    const ekran = pierwsza === '' ? 'start' : (pierwsza === 'moje' || pierwsza === 'potwierdzenie') ? 'moje' : 'sale';
    document.querySelectorAll('nav a').forEach((link) => {
      if (link.dataset.ekran === ekran) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
  }
  function ustawTytul(tytul) { document.title = tytul + ' - Sale do nauki'; }

  function pokaz() {
    const biezaca = trasa();
    ustawNawigacje(biezaca.czesci);
    const pierwsza = biezaca.czesci[0] || '';
    const widok = (pierwsza === 'sale' || pierwsza === 'sala') && szeroki.matches ? 'sale-szeroki' : pierwsza;
    if (widok === 'sale-szeroki' && poprzedniWidok === 'sale-szeroki' && document.getElementById('wyniki')) {
      pokazWyniki();
      const zaznaczona = document.querySelector('.sala[aria-current="true"]');
      if (zaznaczona) zaznaczona.focus({ preventScroll: true });
      return;
    }
    poprzedniWidok = widok;
    let kod;
    if (pierwsza === '') kod = widokStart();
    else if (pierwsza === 'sale') kod = widokSale(biezaca, null);
    else if (pierwsza === 'sala' && salaPoId(biezaca.czesci[1])) kod = widokSale(biezaca, biezaca.czesci[1]);
    else if (pierwsza === 'rezerwacja') kod = widokFormularz(biezaca);
    else if (pierwsza === 'potwierdzenie') kod = widokPotwierdzenie(biezaca.czesci[1]);
    else if (pierwsza === 'moje') kod = widokMoje();
    else kod = widokBrak();
    tresc.innerHTML = kod;
    window.scrollTo(0, 0);
    if (document.getElementById('filtr')) pokazWyniki();
    if (document.getElementById('formularz-rezerwacji')) przygotujFormularz();
  }

  // Ekran startowy
  function nadchodzace() {
    const dzis = dzisiaj(), godzinaTeraz = new Date().getHours();
    return moje.filter((rez) => rez.data > dzis || (rez.data === dzis && rez.do > godzinaTeraz))
      .sort((pierwsza, druga) => (pierwsza.data + dwieCyfry(pierwsza.od)).localeCompare(druga.data + dwieCyfry(druga.od)));
  }
  function widokStart() {
    ustawTytul('Start');
    const najblizsza = nadchodzace()[0];
    let ramka = '';
    if (najblizsza) {
      const sala = salaPoId(najblizsza.sala);
      ramka = `<section class="ramka" aria-labelledby="najblizsza"><h2 id="najblizsza">Najbliższa rezerwacja</h2>
        <p>${bezpieczny(nazwaSali(sala))} | ${bezpieczny(sala.budynek)}<br>${bezpieczny(opisDaty(najblizsza.data))}, ${zakresPelny(najblizsza.od, najblizsza.do)} | ${najblizsza.osoby} os.</p></section>`;
    }
    return `<h1>Znajdź wolną salę do nauki</h1>
      <p class="przygaszony">Sprawdź, które sale są wolne o danej porze, i zarezerwuj jedną dla swojej grupy.</p>
      <div class="start">
        <a class="przycisk glowny duzy" href="#/sale">Znajdź wolną salę</a>
        <a class="przycisk duzy" href="#/moje">Moje rezerwacje${moje.length ? ` (${nadchodzace().length})` : ''}</a>
        ${ramka}
      </div>`;
  }

  // Plan zajętości
  function budujPlan(sala, data, wybraneOd, wybraneDo) {
    const opis = { wolne: 'wolne', zajete: 'zajęte', minelo: 'minęło', twoja: 'Twoja rezerwacja' };
    const znak = { wolne: '', zajete: 'x', minelo: 'x', twoja: 'R' };
    const pola = godzinySali(sala, data).map((pole) => {
      const wybrane = wybraneOd != null && pole.godzina >= wybraneOd && pole.godzina < wybraneDo ? ' wybrane' : '';
      return `<li class="${pole.stan}${wybrane}"><span class="kwadrat" aria-hidden="true">${znak[pole.stan]}</span>` +
        `<span class="godzina" aria-hidden="true">${pole.godzina}</span><span class="niewidoczny">${pelnaGodzina(pole.godzina)} ${opis[pole.stan]}</span></li>`;
    }).join('');
    return `<ul class="plan" aria-label="Plan zajętości ${bezpieczny(nazwaSali(sala))}, ${bezpieczny(opisDaty(data))}">${pola}</ul>
      <p class="podpowiedz">szare (x) = zajęte, R = Twoja rezerwacja, gruba ramka = wybrane godziny</p>`;
  }

  // Lista i szczegóły
  function opcjeGodzin(od, dokad, wybrana) {
    let kod = '';
    for (let godzina = od; godzina <= dokad; godzina++) kod += `<option value="${godzina}"${godzina === wybrana ? ' selected' : ''}>${pelnaGodzina(godzina)}</option>`;
    return kod;
  }
  function budujFiltr(filtr) {
    return `<form id="filtr" class="filtr" aria-label="Wyszukiwanie sali" novalidate>
      <div class="pole"><label for="filtr-data">Data:</label>
        <input type="date" id="filtr-data" name="data" value="${filtr.data}" min="${dzisiaj()}"></div>
      <div class="wiersz">
        <div class="pole"><label for="filtr-od">Od:</label><select id="filtr-od" name="od">${opcjeGodzin(OTWARCIE, ZAMKNIECIE - 1, filtr.od)}</select></div>
        <div class="pole"><label for="filtr-do">Do:</label><select id="filtr-do" name="do">${opcjeGodzin(OTWARCIE + 1, ZAMKNIECIE, filtr.do)}</select></div>
      </div>
      <div class="pole"><label for="filtr-osoby">Liczba osób:</label>
        <input type="number" id="filtr-osoby" name="osoby" min="1" max="50" inputmode="numeric" value="${filtr.osoby}"></div>
    </form>`;
  }

  function widokSale(biezaca, idSali) {
    const filtr = odczytajFiltr(biezaca.parametry);
    if (!szeroki.matches && idSali) {
      const sala = salaPoId(idSali);
      ustawTytul(nazwaSali(sala));
      return `<div class="pasek"><a class="powrot" href="#/sale${adresFiltra(filtr)}">&lt; Lista sal</a>
          <span aria-hidden="true">|</span><h1>${bezpieczny(nazwaSali(sala))}</h1></div>
        <div class="ramka">${budujSzczegoly(sala, filtr, false)}</div>`;
    }
    ustawTytul('Sale');
    return `<h1>Znajdź salę</h1>
      ${budujFiltr(filtr)}
      <p id="licznik" class="licznik" aria-live="polite"></p>
      <div class="uklad" id="wyniki"></div>`;
  }

  function ocenSale(sala, filtr) {
    if (sala.pojemnosc < filtr.osoby) return { pasuje: false, tekst: '! za mała', klasa: 'mala' };
    if (!czyWolna(sala, filtr.data, filtr.od, filtr.do)) return { pasuje: false, tekst: 'x zajęta', klasa: 'zajeta' };
    return { pasuje: true, tekst: `wolna ${zakresKrotki(filtr.od, filtr.do)}`, klasa: 'wolna' };
  }

  function pokazWyniki() {
    const biezaca = trasa();
    const pojemnik = document.getElementById('wyniki');
    if (!pojemnik) return;
    const filtr = odczytajFiltr(biezaca.parametry);
    const formularz = document.getElementById('filtr');
    if (formularz) { formularz.data.value = filtr.data; formularz.od.value = filtr.od; formularz.do.value = filtr.do; formularz.osoby.value = filtr.osoby; }
    const wiersze = SALE.map((sala) => ({ sala, ocena: ocenSale(sala, filtr) }))
      .sort((pierwszy, drugi) => (drugi.ocena.pasuje - pierwszy.ocena.pasuje) || (pierwszy.sala.pojemnosc - drugi.sala.pojemnosc));
    const pasujace = wiersze.filter((wiersz) => wiersz.ocena.pasuje).length;
    document.getElementById('licznik').textContent = pasujace
      ? `Wolne sale: ${pasujace} z ${SALE.length}`
      : 'Brak wolnych sal w tych godzinach. Zmień godziny, datę lub liczbę osób.';

    let wybrana = biezaca.czesci[0] === 'sala' ? biezaca.czesci[1] : null;
    if (szeroki.matches && !wybrana && wiersze.length) wybrana = (wiersze.find((wiersz) => wiersz.ocena.pasuje) || wiersze[0]).sala.id;

    const pozycje = wiersze.map(({ sala, ocena }) => `
      <li><a class="sala ${ocena.klasa}" href="#/sala/${sala.id}${adresFiltra(filtr)}"${szeroki.matches && sala.id === wybrana ? ' aria-current="true"' : ''}>
        <span class="tekst">
          <span class="nazwa">${bezpieczny(nazwaSali(sala))}<span class="szeroki"> | ${bezpieczny(sala.budynek)}</span></span>
          <span class="opis"><span class="szeroki">do ${sala.pojemnosc} os. | </span>${bezpieczny(ocena.tekst)}</span>
        </span>
        <span class="strzalka" aria-hidden="true">&gt;</span>
      </a></li>`).join('');

    let kod = `<ul class="lista" aria-label="Sale">${pozycje}</ul>`;
    if (szeroki.matches && wybrana) kod += `<section class="szczegoly ramka" aria-label="Szczegóły sali">${budujSzczegoly(salaPoId(wybrana), filtr, true)}</section>`;
    pojemnik.innerHTML = kod;
  }

  function budujSzczegoly(sala, filtr, zTytulem) {
    const adres = `?sala=${sala.id}&data=${filtr.data}&od=${filtr.od}&do=${filtr.do}&osoby=${filtr.osoby}`;
    return `${zTytulem ? `<h2>${bezpieczny(nazwaSali(sala))}</h2>` : ''}
      <p>${bezpieczny(sala.budynek)}, ${bezpieczny(sala.pietro)} | do ${sala.pojemnosc} osób</p>
      <p>${sala.wyposazenie.map(bezpieczny).join(' | ')}</p>
      <h3>Plan zajętości: ${bezpieczny(opisDaty(filtr.data))}</h3>
      ${budujPlan(sala, filtr.data, filtr.od, filtr.do)}
      <div class="przyciski"><a class="przycisk glowny" href="#/rezerwacja${adres}">Zarezerwuj salę</a></div>`;
  }

  function zmianaFiltra() {
    const formularz = document.getElementById('filtr');
    const parametry = new URLSearchParams();
    parametry.set('data', formularz.data.value || '');
    parametry.set('od', formularz.od.value);
    parametry.set('do', formularz.do.value);
    parametry.set('osoby', formularz.osoby.value);
    const filtr = odczytajFiltr(parametry);
    if (filtr.do <= filtr.od) filtr.do = Math.min(filtr.od + 1, ZAMKNIECIE);
    const biezaca = trasa();
    const poczatek = biezaca.czesci[0] === 'sala' ? `#/sala/${biezaca.czesci[1]}` : '#/sale';
    history.replaceState(null, '', poczatek + adresFiltra(filtr));
    pokazWyniki();
  }

  // Formularz rezerwacji
  function widokFormularz(biezaca) {
    ustawTytul('Rezerwacja sali');
    const filtr = odczytajFiltr(biezaca.parametry);
    const idSali = biezaca.parametry.get('sala') || '';
    const budynki = {};
    SALE.forEach((sala) => { (budynki[sala.budynek] = budynki[sala.budynek] || []).push(sala); });
    const opcjeSal = '<option value="">wybierz salę</option>' + Object.keys(budynki).map((budynek) =>
      `<optgroup label="${bezpieczny(budynek)}">${budynki[budynek].map((sala) =>
        `<option value="${sala.id}"${sala.id === idSali ? ' selected' : ''}>${bezpieczny(nazwaSali(sala))} (do ${sala.pojemnosc} os.)</option>`).join('')}</optgroup>`).join('');
    return `<div class="formularz">
      <div class="pasek"><a class="powrot" href="#/sale${adresFiltra(filtr)}">&lt; Lista sal</a>
        <span aria-hidden="true">|</span><h1>Rezerwacja sali</h1></div>
      <form id="formularz-rezerwacji" class="ramka" novalidate>
        <div id="podsumowanie-bledow" tabindex="-1"></div>
        <div class="pole" id="pole-sala"><label for="wybor-sala">Sala</label>
          <select id="wybor-sala" name="sala" required>${opcjeSal}</select><div id="komunikat-sala"></div></div>
        <div class="pole" id="pole-data"><label for="wybor-data">Data</label>
          <input type="date" id="wybor-data" name="data" value="${filtr.data}" min="${dzisiaj()}" required><div id="komunikat-data"></div></div>
        <div class="wiersz">
          <div class="pole" id="pole-od"><label for="wybor-od">Od</label>
            <select id="wybor-od" name="od">${opcjeGodzin(OTWARCIE, ZAMKNIECIE - 1, filtr.od)}</select></div>
          <div class="pole" id="pole-do"><label for="wybor-do">Do</label>
            <select id="wybor-do" name="do">${opcjeGodzin(OTWARCIE + 1, ZAMKNIECIE, filtr.do)}</select></div>
        </div>
        <div id="komunikat-od"></div><div id="komunikat-do"></div>
        <div class="pole" id="pole-osoby"><label for="wybor-osoby">Liczba osób</label>
          <input type="number" id="wybor-osoby" name="osoby" min="1" inputmode="numeric" value="${filtr.osoby}" required>
          <div id="komunikat-osoby"></div><p class="podpowiedz" id="podpowiedz-osoby"></p></div>
        <div class="przyciski">
          <button class="przycisk glowny" type="submit">Zarezerwuj salę</button>
          <a class="przycisk" href="#/sale${adresFiltra(filtr)}">Anuluj</a>
        </div>
      </form></div>`;
  }

  function odczytajFormularz() {
    const formularz = document.getElementById('formularz-rezerwacji');
    return { sala: formularz.sala.value, data: formularz.data.value, od: parseInt(formularz.od.value, 10), do: parseInt(formularz.do.value, 10), osoby: formularz.osoby.value.trim() };
  }

  function sprawdz(wartosci) {
    const bledy = [];
    const sala = salaPoId(wartosci.sala);
    const teraz = new Date();
    if (!sala) bledy.push({ pole: 'sala', tekst: 'Wybierz salę z listy.' });
    if (!poprawnaData(wartosci.data)) bledy.push({ pole: 'data', tekst: 'Wybierz datę rezerwacji.' });
    else if (wartosci.data < dzisiaj()) bledy.push({ pole: 'data', tekst: 'Data nie może być z przeszłości.' });
    else if (wartosci.data > dataTekst(dodajDni(teraz, MAKSYMALNIE_DNI))) bledy.push({ pole: 'data', tekst: `Można rezerwować najwyżej ${MAKSYMALNIE_DNI} dni naprzód.` });

    const godzinyPoprawne = wartosci.do > wartosci.od;
    if (!godzinyPoprawne) bledy.push({ pole: 'do', tekst: 'Godzina "Do" musi być późniejsza niż "Od".' });
    else if (wartosci.do - wartosci.od > MAKSYMALNIE_GODZIN) bledy.push({ pole: 'do', tekst: `Rezerwacja może trwać najwyżej ${MAKSYMALNIE_GODZIN} godziny.` });

    const liczba = Number(wartosci.osoby);
    if (wartosci.osoby === '' || !Number.isInteger(liczba) || liczba < 1) bledy.push({ pole: 'osoby', tekst: 'Wpisz liczbę osób, co najmniej 1.' });
    else if (sala && liczba > sala.pojemnosc) bledy.push({ pole: 'osoby', tekst: `Sala mieści najwyżej ${sala.pojemnosc} osób. Zmniejsz liczbę osób albo wybierz większą salę.` });

    const dataPoprawna = poprawnaData(wartosci.data) && wartosci.data >= dzisiaj();
    if (godzinyPoprawne && dataPoprawna && sala && !bledy.some((blad) => blad.pole === 'do' || blad.pole === 'data')) {
      if (wartosci.data === dzisiaj() && wartosci.od <= teraz.getHours()) {
        const nastepna = teraz.getHours() + 1;
        bledy.push({ pole: 'od', tekst: nastepna >= ZAMKNIECIE ? 'Na dziś nie można już rezerwować. Wybierz inny dzień.' : `Ta godzina już minęła. Najbliższa możliwa: ${pelnaGodzina(nastepna)}.` });
      } else if (!czyWolna(sala, wartosci.data, wartosci.od, wartosci.do)) {
        const twoja = moje.some((rez) => rez.sala === sala.id && rez.data === wartosci.data && rez.od < wartosci.do && rez.do > wartosci.od);
        const okna = wolneOkna(sala, wartosci.data);
        bledy.push({ pole: 'od', tekst: twoja
          ? 'W tych godzinach masz już rezerwację tej sali.'
          : `${nazwaSali(sala)} jest zajęta ${zakresKrotki(wartosci.od, wartosci.do)}. ${okna.length ? 'Wolne: ' + opisOkien(okna) + '.' : 'W tym dniu nie ma już wolnych godzin.'}` });
      }
    }
    return bledy;
  }

  let wyslano = false;
  function pokazBledy(bledy) {
    ['sala', 'data', 'od', 'do', 'osoby'].forEach((nazwa) => {
      const pole = document.getElementById('pole-' + nazwa), miejsce = document.getElementById('komunikat-' + nazwa);
      const kontrolka = document.getElementById('wybor-' + nazwa);
      const blad = bledy.find((wpis) => wpis.pole === nazwa);
      pole.classList.toggle('blad', !!blad);
      miejsce.innerHTML = blad ? `<p class="komunikat" id="blad-${nazwa}">${bezpieczny(blad.tekst)}</p>` : '';
      if (blad) { kontrolka.setAttribute('aria-invalid', 'true'); kontrolka.setAttribute('aria-describedby', 'blad-' + nazwa); }
      else { kontrolka.removeAttribute('aria-invalid'); kontrolka.removeAttribute('aria-describedby'); }
    });
    const podsumowanie = document.getElementById('podsumowanie-bledow');
    podsumowanie.className = bledy.length ? 'bledy' : '';
    podsumowanie.innerHTML = bledy.length
      ? `<h2>Popraw ${bledy.length} ${bledy.length === 1 ? 'pole' : 'pola'}</h2><ul>${bledy.map((blad) =>
        `<li><a href="#" data-przejdz="wybor-${blad.pole}">${bezpieczny(blad.tekst)}</a></li>`).join('')}</ul>`
      : '';
  }

  function pokazPodpowiedz() {
    const sala = salaPoId(odczytajFormularz().sala);
    document.getElementById('podpowiedz-osoby').textContent = sala ? `Sala mieści do ${sala.pojemnosc} osób.` : '';
  }
  function przygotujFormularz() { wyslano = false; pokazPodpowiedz(); }
  function zmianaFormularza() {
    pokazPodpowiedz();
    if (wyslano) pokazBledy(sprawdz(odczytajFormularz()));
  }
  function wyslij(zdarzenie) {
    zdarzenie.preventDefault();
    wyslano = true;
    const wartosci = odczytajFormularz();
    const bledy = sprawdz(wartosci);
    pokazBledy(bledy);
    if (bledy.length) { document.getElementById('podsumowanie-bledow').focus(); return; }
    const rezerwacja = { id: 'r' + Date.now(), sala: wartosci.sala, data: wartosci.data, od: wartosci.od, do: wartosci.do, osoby: Number(wartosci.osoby) };
    moje.push(rezerwacja);
    zapiszMoje();
    location.hash = '#/potwierdzenie/' + rezerwacja.id;
  }

  // Potwierdzenie
  function widokPotwierdzenie(id) {
    const rezerwacja = moje.find((rez) => rez.id === id);
    if (!rezerwacja) return widokBrak();
    ustawTytul('Rezerwacja zapisana');
    const sala = salaPoId(rezerwacja.sala);
    return `<h1>Rezerwacja zapisana</h1>
      <section class="ramka" aria-labelledby="zapisana">
        <h2 id="zapisana">${bezpieczny(nazwaSali(sala))} | ${bezpieczny(sala.budynek)}, ${bezpieczny(sala.pietro)}</h2>
        <p>${bezpieczny(opisDaty(rezerwacja.data))}, ${zakresPelny(rezerwacja.od, rezerwacja.do)} | ${rezerwacja.osoby} os.</p>
        <p class="przygaszony">Rezerwację możesz anulować w zakładce Moje rezerwacje.</p>
        <div class="przyciski">
          <a class="przycisk glowny" href="#/moje">Moje rezerwacje</a>
          <a class="przycisk" href="#/">Wróć na start</a>
        </div>
      </section>`;
  }

  // Moje rezerwacje
  function kartaRezerwacji(rezerwacja, moznaAnulowac) {
    const sala = salaPoId(rezerwacja.sala);
    return `<li class="ramka rezerwacja">
      <div><strong>${bezpieczny(nazwaSali(sala))}</strong> | ${bezpieczny(sala.budynek)}<br>
        ${bezpieczny(opisDaty(rezerwacja.data))}, ${zakresPelny(rezerwacja.od, rezerwacja.do)} | ${rezerwacja.osoby} os.</div>
      ${moznaAnulowac ? `<button class="przycisk anulowanie" type="button" data-anuluj="${rezerwacja.id}">Anuluj rezerwację</button>` : ''}
    </li>`;
  }
  function widokMoje() {
    ustawTytul('Moje rezerwacje');
    const przyszle = nadchodzace();
    const idPrzyszlych = new Set(przyszle.map((rez) => rez.id));
    const minione = moje.filter((rez) => !idPrzyszlych.has(rez.id))
      .sort((pierwsza, druga) => (druga.data + dwieCyfry(druga.od)).localeCompare(pierwsza.data + dwieCyfry(pierwsza.od)));
    if (!moje.length) {
      return `<h1>Moje rezerwacje</h1>
        <div class="ramka"><p>Nie masz jeszcze żadnych rezerwacji.</p>
        <a class="przycisk glowny" href="#/sale">Znajdź wolną salę</a></div>`;
    }
    return `<h1>Moje rezerwacje</h1>
      <h2>Nadchodzące</h2>
      ${przyszle.length ? `<ul class="rezerwacje">${przyszle.map((rez) => kartaRezerwacji(rez, true)).join('')}</ul>` : '<p class="przygaszony">Brak nadchodzących rezerwacji.</p>'}
      <div class="przyciski"><a class="przycisk glowny" href="#/sale">Znajdź wolną salę</a></div>
      ${minione.length ? `<h2 style="margin-top:1.5rem">Zakończone</h2><ul class="rezerwacje">${minione.map((rez) => kartaRezerwacji(rez, false)).join('')}</ul>` : ''}`;
  }

  function zapytajOAnulowanie(id) {
    const rezerwacja = moje.find((rez) => rez.id === id);
    if (!rezerwacja) return;
    const sala = salaPoId(rezerwacja.sala);
    document.getElementById('tekst-okna').textContent =
      `${nazwaSali(sala)}, ${opisDaty(rezerwacja.data)}, ${zakresPelny(rezerwacja.od, rezerwacja.do)}. Sala znów będzie dostępna dla innych.`;
    okno.returnValue = '';
    okno.dataset.id = id;
    okno.showModal();
  }
  okno.addEventListener('close', () => {
    if (okno.returnValue === 'tak') {
      moje = moje.filter((rez) => rez.id !== okno.dataset.id);
      zapiszMoje();
      pokaz();
    }
  });

  function widokBrak() {
    ustawTytul('Nie znaleziono');
    return `<h1>Nie znaleziono strony</h1><p>Tej strony nie ma albo rezerwacja została usunięta.</p>
      <a class="przycisk glowny" href="#/">Wróć na start</a>`;
  }

  // Zdarzenia
  tresc.addEventListener('change', (zdarzenie) => {
    if (zdarzenie.target.closest('#filtr')) zmianaFiltra();
    else if (zdarzenie.target.closest('#formularz-rezerwacji')) zmianaFormularza();
  });
  tresc.addEventListener('input', (zdarzenie) => {
    if (zdarzenie.target.closest('#formularz-rezerwacji') && zdarzenie.target.type === 'number') zmianaFormularza();
  });
  tresc.addEventListener('submit', (zdarzenie) => {
    if (zdarzenie.target.id === 'formularz-rezerwacji') wyslij(zdarzenie);
    else if (zdarzenie.target.id === 'filtr') zdarzenie.preventDefault();
  });
  tresc.addEventListener('click', (zdarzenie) => {
    const anuluj = zdarzenie.target.closest('[data-anuluj]');
    if (anuluj) { zapytajOAnulowanie(anuluj.dataset.anuluj); return; }
    const przejdz = zdarzenie.target.closest('[data-przejdz]');
    if (przejdz) { zdarzenie.preventDefault(); document.getElementById(przejdz.dataset.przejdz).focus(); }
  });
  window.addEventListener('hashchange', pokaz);
  szeroki.addEventListener('change', () => { poprzedniWidok = ''; pokaz(); });

  // Wczytanie danych
  fetch('dane/sale.json?wersja=0.0.1')
    .then((odpowiedz) => { if (!odpowiedz.ok) throw new Error(odpowiedz.status); return odpowiedz.json(); })
    .then((dane) => {
      OTWARCIE = dane.godziny.otwarcie; ZAMKNIECIE = dane.godziny.zamkniecie;
      SALE = dane.sale;
      const dzis = new Date();
      ZAJETE = [];
      SALE.forEach((sala) => sala.rezerwacje.forEach((rez) =>
        ZAJETE.push({ sala: sala.id, data: dataTekst(dodajDni(dzis, rez.dzien)), od: rez.od, do: rez.do })));
      pokaz();
    })
    .catch(() => {
      tresc.innerHTML = `<h1>Nie udało się wczytać danych</h1>
        <p>Aplikacja pobiera dane z pliku dane/sale.json, więc nie działa po otwarciu index.html z dysku.
        Uruchom w folderze prototyp polecenie: python3 -m http.server 8000 i otwórz http://localhost:8000.</p>`;
    });
})();
