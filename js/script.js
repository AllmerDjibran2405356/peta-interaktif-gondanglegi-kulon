const kategoriList = ["Semua", "Pemerintahan", "Pendidikan", "Kesehatan", "Ekonomi", "Ibadah", "Wisata & Olahraga"];

const data = [
    {
        nama: "Kantor Desa Gondanglegi Kulon",
        kategori: "Pemerintahan", // Diisi kategori
        lat: -8.175027,
        lng: 112.632375,
        alamat: "Jl. Raya Desa No. 1, Gondanglegi Kulon",
        deskripsi: "Pusat pelayanan administrasi dan pemerintahan tingkat Desa Gondanglegi Kulon.",
        gambar: "https://placehold.co/600x300?text=Kantor+Desa"
    },
    {
        nama: "Balai Pertemuan Warga",
        kategori: "Fasilitas Umum", // Diisi kategori
        lat: -8.172,
        lng: 112.636,
        alamat: "Dusun Krajan, RT 04 / RW 02",
        deskripsi: "Gedung serbaguna yang digunakan untuk musyawarah warga, posyandu, dan kegiatan kesenian.",
        gambar: "https://placehold.co/600x300?text=Balai+Pertemuan"
    },
    {
        nama: "Lapangan Olahraga Desa",
        kategori: "Wisata & Olahraga", // Diisi kategori
        lat: -8.178,
        lng: 112.628,
        alamat: "Dusun Kaliwenang",
        deskripsi: "Fasilitas olahraga terbuka untuk sepak bola, voli, dan sering digunakan untuk pasar malam.",
        gambar: "https://placehold.co/600x300?text=Lapangan+Desa"
    }
];

// Inisialisasi Peta
const map = L.map("map", {
    zoomControl: true
}).setView([-8.175027, 112.632375], 15);

// Set Posisi Zoom Control ke Kanan Bawah
map.zoomControl.setPosition('bottomright');

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const list = document.getElementById("list");
const detailPanel = document.getElementById("detailPanel");

let currentItem = null;
let panelOpen = false;

/* ===================================================
   FUNGSI PANEL DETAIL (DINAMIS OFFSET WIDTH/HEIGHT)
=================================================== */
function openPanel(item) {
    currentItem = item;

    // 1. Isi konten detail panel
    document.getElementById("dTitle").textContent = item.nama;
    document.getElementById("dImg").src = item.gambar;
    document.getElementById("dDesc").textContent = item.deskripsi;
    document.getElementById("dAddr").textContent = item.alamat;
    document.getElementById("dCoord").textContent = `${item.lat}, ${item.lng}`;
    document.getElementById("dMaps").href = `http://googleusercontent.com/maps.google.com/?q=${item.lat},${item.lng}`;

    const currentZoom = map.getZoom();
    let finalLatLng = [item.lat, item.lng];

    // 2. Kalkulasi dimensi pixel asli panel dari CSS secara real-time
    const panelDOM = document.getElementById("detailPanel");
    const dynamicWidth = panelDOM.offsetWidth;
    const dynamicHeight = panelDOM.offsetHeight;

    if (window.innerWidth > 768) {
        // DESKTOP: Geser center peta ke kanan agar marker pas di tengah sisa area kosong
        const targetPoint = map.project([item.lat, item.lng], currentZoom);
        const offsetPoint = targetPoint.add([dynamicWidth / 2, 0]); 
        finalLatLng = map.unproject(offsetPoint, currentZoom);
    } else {
        // MOBILE: Geser center peta ke bawah agar marker berada di sisa area peta atas
        const targetPoint = map.project([item.lat, item.lng], currentZoom);
        const offsetPoint = targetPoint.add([0, dynamicHeight / 2]); 
        finalLatLng = map.unproject(offsetPoint, currentZoom);
    }

    // 3. Tampilkan Panel
    if (!panelOpen) {
        panelOpen = true;
        panelDOM.classList.add("open");
    }

    map.flyTo(finalLatLng, currentZoom, {
        duration: 0.5,
        easeLinearity: 0.25
    });

    // 4. Otomatis pemicu popup overview di atas penanda saat list diklik
    item.marker.openPopup();
}

/* ===================================================
   TUTUP PANEL DETAIL (SINKRON TOTAL FADE OUT)
=================================================== */
document.getElementById("closePanel").onclick = function() {
    if (!panelOpen) return;

    panelOpen = false;
    document.getElementById("detailPanel").classList.remove("open");

    if (currentItem) {
        const currentZoom = map.getZoom();
        let finalLatLngClose = [currentItem.lat, currentItem.lng];
        
        const dynamicWidth = document.getElementById("detailPanel").offsetWidth;

        // Kembalikan sumbu peta secara proporsional ke kiri saat panel ditutup (hanya desktop)
        if (window.innerWidth > 768) {
            const targetPoint = map.project([currentItem.lat, currentItem.lng], currentZoom);
            const offsetPointClose = targetPoint.add([dynamicWidth / 2.5, 0]); 
            finalLatLngClose = map.unproject(offsetPointClose, currentZoom);
        }

        // SOLUSI: Tambahkan kelas khusus pada seluruh kontainer luar Leaflet agar memudar bersamaan
        const entirePopup = document.querySelector(".custom-leaflet-popup");
        if (entirePopup) {
            entirePopup.classList.add("popup-closing-fade");
        }

        // 1. Bersihkan sisa event listener 'moveend' lama
        map.off("moveend");

        // 2. Setelah gerakan bergeser selesai, tutup popup sepenuhnya dari sistem Leaflet
        map.once("moveend", function() {
            map.closePopup(); 
        });

        // 3. Terbangkan peta kembali secara proporsional
        map.flyTo(finalLatLngClose, currentZoom, {
            duration: 0.5,
            easeLinearity: 0.25
        });
    }
};

/* ===================================================
   FUNGSI WARNA MARKER (TAMBAHKAN INI)
=================================================== */
function getMarkerColor(kategori) {
    switch (kategori) {
        case "Pemerintahan": return "#3b82f6"; // Biru
        case "Fasilitas Umum": return "#10b981"; // Hijau
        case "Wisata & Olahraga": return "#f59e0b"; // Oranye
        default: return "#64748b"; // Abu-abu
    }
}

/* ===================================================
   RENDER LIST & MARKER (GUNAKAN INI)
=================================================== */
data.forEach(item => {
    // 1. Buat Elemen List Sidebar
    const div = document.createElement("div");
    div.className = "location";
    div.innerHTML = `<h4>${item.nama}</h4><p>📍 ${item.alamat}</p>`;
    div.onclick = () => openPanel(item);
    list.appendChild(div);
    item.element = div;

    // 2. Buat Marker Custom dengan Warna Dinamis
    const markerColor = getMarkerColor(item.kategori);
    const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${markerColor}; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; border: 2px solid white; transform: rotate(-45deg); box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24]
    });

    // 3. Pasang Marker & Ikat fungsi Popup
    const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(map);
    
    const popupContent = `
        <div class="map-popup-overview">
            <div class="popup-img-inside"><img src="${item.gambar}" alt="${item.nama}"></div>
            <div class="popup-text-inside">
                <h5>${item.nama}</h5>
                <p>📍 ${item.alamat}</p>
            </div>
        </div>
    `;

    marker.bindPopup(popupContent, {
        closeButton: false,
        offset: L.point(0, -25), // Sesuaikan offset karena icon baru
        className: 'custom-leaflet-popup'
    });

    // Event Hover & Click
    marker.on("mouseover", function() {
        this.openPopup();
        const entirePopup = document.querySelector(".custom-leaflet-popup");
        if (entirePopup) entirePopup.classList.remove("popup-closing-fade");
    });

    marker.on("mouseout", function() {
        if (currentItem !== item || !panelOpen) this.closePopup();
    });

    marker.on("click", () => openPanel(item));
    
    item.marker = marker;
});

/* ===================================================
   PENCARIAN LOKASI PINTAR
=================================================== */
document.getElementById("searchInput").onkeyup = function() {
    const keyword = this.value.toLowerCase();

    data.forEach(item => {
        const isMatch = item.nama.toLowerCase().includes(keyword) || 
                        item.alamat.toLowerCase().includes(keyword);

        if (isMatch) {
            // Sesuai CSS: Desktop memakai block biasa, Mobile menggunakan flex untuk scroll-x horizontal
            item.element.style.display = window.innerWidth > 768 ? "block" : "flex";
            if (!map.hasLayer(item.marker)) {
                map.addLayer(item.marker);
            }
        } else {
            item.element.style.display = "none";
            if (map.hasLayer(item.marker)) {
                map.removeLayer(item.marker);
            }
        }
    });
};

let currentCategory = "all";
let currentSearch = "";

function filterData() {
    data.forEach(item => {
        const matchesSearch = item.nama.toLowerCase().includes(currentSearch) || 
                              item.alamat.toLowerCase().includes(currentSearch);
        const matchesCategory = currentCategory === "all" || item.kategori === currentCategory;

        if (matchesSearch && matchesCategory) {
            item.element.style.display = window.innerWidth > 768 ? "block" : "flex";
            if (!map.hasLayer(item.marker)) map.addLayer(item.marker);
        } else {
            item.element.style.display = "none";
            if (map.hasLayer(item.marker)) map.removeLayer(item.marker);
        }
    });
}

// Event Listener Search
document.getElementById("searchInput").onkeyup = function() {
    currentSearch = this.value.toLowerCase();
    filterData();
};

// Event Listener Kategori
document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.onclick = function() {
        document.querySelector(".cat-btn.active").classList.remove("active");
        this.classList.add("active");
        
        currentCategory = this.getAttribute("data-cat");
        filterData();
    };
});

/* ===================================================
   LEGENDA DINAMIS (LEAFLET CONTROL)
=================================================== */
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'legend-container');
    const categories = [
        { name: "Pemerintahan", color: "#3b82f6" },
        { name: "Fasilitas Umum", color: "#10b981" },
        { name: "Wisata & Olahraga", color: "#f59e0b" }
    ];

    div.innerHTML = '<strong>Legenda</strong>';
    categories.forEach(cat => {
        div.innerHTML += `
            <div class="legend-item">
                <div class="legend-dot" style="background: ${cat.color}"></div>
                ${cat.name}
            </div>
        `;
    });
    return div;
};

legend.addTo(map);

// Mencegah klik legenda agar tidak menggeser peta
L.DomEvent.disableClickPropagation(legend.getContainer());

