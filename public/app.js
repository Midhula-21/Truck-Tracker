const TRUCK_COLORS = {
  '1': '#f5c518',
  '2': '#f97316',
  '3': '#a855f7',
  '4': '#22c55e',
};

let map;

initApp();

function initApp() {
  map = L.map('map').setView([37.0902, -95.7129], 4);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  bindEntry(document.querySelector('.entry-card'));
  document.getElementById('addEntryBtn').addEventListener('click', addEntry);
}

function addEntry() {
  const list = document.getElementById('entry-list');

  const card = document.createElement('div');
  card.className = 'entry-card';

  card.innerHTML = `
    <div class="entry-num">${list.children.length + 1}</div>
    <div class="entry-fields">
      <input type="date" class="field-date"/>
      <select class="field-truck">
        <option value="">Truck no.</option>
        <option value="1">Truck 1</option>
        <option value="2">Truck 2</option>
        <option value="3">Truck 3</option>
        <option value="4">Truck 4</option>
      </select>
      <input type="text" class="field-address" placeholder="Enter address"/>
      <div class="radius-row">
        <input type="number" class="field-radius" value="50"/>
        <button class="btn-ok">Plot</button>
      </div>
      <div class="entry-status"></div>
    </div>
    <button class="btn-remove">&times;</button>
  `;

  list.appendChild(card);
  bindEntry(card);
}

function bindEntry(card) {
  const plotBtn = card.querySelector('.btn-ok');
  const removeBtn = card.querySelector('.btn-remove');
  const addressInput = card.querySelector('.field-address');

  plotBtn.addEventListener('click', () => plotEntry(card));

  // Auto update when editing address
  addressInput.addEventListener('change', () => plotEntry(card));

  removeBtn.addEventListener('click', () => {
    if (card._marker) map.removeLayer(card._marker);
    if (card._circle) map.removeLayer(card._circle);
    card.remove();
    renumberEntries();
  });
}

function renumberEntries() {
  document.querySelectorAll('.entry-card').forEach((c, i) => {
    c.querySelector('.entry-num').textContent = i + 1;
  });
}

async function plotEntry(card) {
  const address = card.querySelector('.field-address').value.trim();
  const truck = card.querySelector('.field-truck').value;
  const radius = parseFloat(card.querySelector('.field-radius').value) || 50;
  const date = card.querySelector('.field-date').value;
  const status = card.querySelector('.entry-status');

  if (!address || !truck) {
    showStatus(status, 'Fill all fields', 'error');
    return;
  }

  // ✅ Remove old marker (important fix)
  if (card._marker) {
    map.removeLayer(card._marker);
    card._marker = null;
  }

  if (card._circle) {
    map.removeLayer(card._circle);
    card._circle = null;
  }

  showStatus(status, 'Searching...', 'loading');

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    );

    const data = await res.json();

    if (!data.length) {
      showStatus(status, 'Address not found', 'error');
      return;
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    addPin(card, lat, lng, address, truck, radius, date);
    showStatus(status, 'Plotted!', 'success');

  } catch {
    showStatus(status, 'Error fetching location', 'error');
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'No date';

  const [y, m, d] = dateStr.split('-');
  const day = parseInt(d);

  const suffix = (day % 10 === 1 && day !== 11) ? 'st' :
                 (day % 10 === 2 && day !== 12) ? 'nd' :
                 (day % 10 === 3 && day !== 13) ? 'rd' : 'th';

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return `Date: ${day}${suffix} ${months[m-1]} ${y}`;
}

function addPin(card, lat, lng, address, truck, radius, date) {
  const color = TRUCK_COLORS[truck];
  const formattedDate = formatDate(date);

  const marker = L.marker([lat, lng]).addTo(map);

  const circle = L.circle([lat, lng], {
    radius: radius * 1000,
    color,
    fillColor: color,
    fillOpacity: 0.15
  }).addTo(map);

  // Hover → Date
  marker.bindTooltip(formattedDate);

  // Click → Full info
  marker.bindPopup(`
    <div class="custom-popup">
      <div class="truck-name">
        <span class="truck-badge" style="background:${color}"></span>
        Truck ${truck}
      </div>
      <table>
        <tr><td>Address</td><td>${address}</td></tr>
        <tr><td>Radius</td><td>${radius} km</td></tr>
        <tr><td>Date</td><td>${formattedDate.replace('Date: ', '')}</td></tr>
      </table>
    </div>
  `);

  card._marker = marker;
  card._circle = circle;

  map.setView([lat, lng], 10);
}

function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = 'entry-status ' + type;
}