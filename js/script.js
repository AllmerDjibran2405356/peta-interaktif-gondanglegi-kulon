(function() {
  // Data lokasi
  const data = [
    {
      nama: "Kantor Desa Gondanglegi Kulon",
      kategori: "Pemerintahan",
      lat: -8.175027,
      lng: 112.632375,
      alamat: "Jl. Raya Desa No. 1, Gondanglegi Kulon",
      deskripsi: "Pusat pelayanan administrasi dan pemerintahan tingkat Desa Gondanglegi Kulon.",
      gambar: "images/kantor-desa.jpg"
    },
    {
      nama: "Balai Pertemuan Warga",
      kategori: "Fasilitas Umum",
      lat: -8.172,
      lng: 112.636,
      alamat: "Dusun Krajan, RT 04 / RW 02",
      deskripsi: "Gedung serbaguna yang digunakan untuk musyawarah warga, posyandu, dan kegiatan kesenian.",
      gambar: "images/balai-pertemuan.jpg"
    },
    {
      nama: "Lapangan Olahraga Desa",
      kategori: "Wisata & Olahraga",
      lat: -8.178,
      lng: 112.628,
      alamat: "Dusun Kaliwenang",
      deskripsi: "Fasilitas olahraga terbuka untuk sepak bola, voli, dan sering digunakan untuk pasar malam.",
      gambar: "images/lapangan-desa.jpg"
    }
  ];

  // Deteksi perangkat
  const isMobile = () => window.innerWidth <= 768;
  const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Inisialisasi peta
  const map = L.map("map", {
    zoomControl: false,
    attributionControl: true,
    dragging: true,
    touchZoom: true,
    scrollWheelZoom: !isMobile(),
    doubleClickZoom: true,
    boxZoom: !isMobile(),
    tap: isTouchDevice(),
    tapTolerance: 15
  }).setView([-8.175027, 112.632375], 15);

  // Tile layer
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const listContainer = document.getElementById("list");
  const detailPanel = document.getElementById("detailPanel");
  const closePanelBtn = document.getElementById("closePanel");
  const searchInput = document.getElementById("searchInput");
  const categoryButtons = document.querySelectorAll(".cat-btn");
  const mapContainer = document.getElementById("mapContainer");
  const sidebar = document.getElementById("sidebar");

  let currentItem = null;
  let panelOpen = false;
  let currentCategory = "all";
  let currentSearch = "";
  let isAnimating = false;

  // ===================================================
  // FUNGSI MENGHITUNG OFFSET - DIPERBAIKI TANDA
  // ===================================================
  function getTargetOffset() {
    const mapSize = map.getSize();
    const mapWidth = mapSize.x;
    const mapHeight = mapSize.y;

    if (isMobile()) {
      // MOBILE: Perhitungan vertikal
      const sidebarHeight = sidebar.offsetHeight || 0;
      const panelHeight = panelOpen ? detailPanel.offsetHeight : 0;
      
      const topOffset = sidebarHeight;
      const bottomOffset = panelHeight;
      const availableHeight = mapHeight - topOffset - bottomOffset;
      
      const centerY = topOffset + (availableHeight * 0.5);
      const popupOffset = availableHeight * 0.15;
      const desiredY = centerY + popupOffset;
      const mapCenterY = mapHeight / 2;
      
      // ✅ Perbaiki tanda: offset = desiredY - mapCenterY
      const offsetY = desiredY - mapCenterY;
      
      return { x: 0, y: offsetY };
      
    } else {
      // ============================================
      // DESKTOP: Perhitungan horizontal DIPERBAIKI
      // ============================================
      
      const mapRect = mapContainer.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      const panelRect = detailPanel.getBoundingClientRect();
      
      const sidebarWidth = sidebarRect.width;
      let panelWidth = 0;
      if (panelOpen) {
        panelWidth = panelRect.width;
      }
      
      const sidebarRight = sidebarRect.right - mapRect.left;
      const panelLeft = panelOpen ? (panelRect.left - mapRect.left) : mapWidth;
      
      const availableLeft = sidebarRight;
      const availableRight = mapWidth - panelLeft;
      const availableWidth = mapWidth - availableLeft - availableRight;
      
      const desiredX = availableLeft + (availableWidth / 2);
      const centerX = mapWidth / 2;
      
      // ✅ Perbaiki tanda: offset = desiredX - centerX
      const offsetX = desiredX - centerX;
      
      console.log('📍 DESKTOP OFFSET (AKURAT):', {
        mapWidth,
        sidebarWidth: sidebarWidth.toFixed(0),
        panelWidth: panelWidth.toFixed(0),
        sidebarRight: sidebarRight.toFixed(0),
        panelLeft: panelLeft.toFixed(0),
        availableLeft: availableLeft.toFixed(0),
        availableRight: availableRight.toFixed(0),
        availableWidth: availableWidth.toFixed(0),
        desiredX: desiredX.toFixed(0),
        centerX: centerX.toFixed(0),
        offsetX: offsetX.toFixed(0),
        panelOpen
      });
      
      return {
        x: offsetX,
        y: 0
      };
    }
  }

  // ===================================================
  // FUNGSI MENDAPATKAN TARGET LATLNG
  // ===================================================
  function getTargetLatLng(lat, lng, zoom) {
    const markerPoint = map.project([lat, lng], zoom);
    const offset = getTargetOffset();
    const targetPoint = markerPoint.subtract([offset.x, offset.y]);
    return map.unproject(targetPoint, zoom);
  }

  // ===================================================
  // FUNGSI INVALIDATE SIZE
  // ===================================================
  function refreshMapSize(delay = 50) {
    setTimeout(() => {
      map.invalidateSize();
    }, delay);
  }

  // ===================================================
  // CUSTOM CONTROLS
  // ===================================================
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'custom-controls-container';
  mapContainer.appendChild(controlsContainer);

  const zoomControl = document.createElement('div');
  zoomControl.className = 'zoom-control';
  zoomControl.innerHTML = `
    <button class="zoom-btn zoom-in" title="Zoom In" aria-label="Zoom In">+</button>
    <button class="zoom-btn zoom-out" title="Zoom Out" aria-label="Zoom Out">−</button>
  `;
  controlsContainer.appendChild(zoomControl);

  const legendContainer = document.createElement('div');
  legendContainer.className = 'legend-container';
  legendContainer.innerHTML = `
    <strong>Legenda</strong>
    <div class="legend-item">
      <div class="legend-dot" style="background: #3b82f6"></div>
      Pemerintahan
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background: #10b981"></div>
      Fasilitas Umum
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background: #f59e0b"></div>
      Wisata & Olahraga
    </div>
  `;
  controlsContainer.appendChild(legendContainer);

  zoomControl.querySelector('.zoom-in').addEventListener('click', (e) => {
    e.preventDefault();
    map.zoomIn();
  });

  zoomControl.querySelector('.zoom-out').addEventListener('click', (e) => {
    e.preventDefault();
    map.zoomOut();
  });

  L.DomEvent.disableClickPropagation(legendContainer);
  L.DomEvent.disableClickPropagation(zoomControl);

  // ===================================================
  // FUNGSI UPDATE LIST VISIBILITY (MOBILE)
  // ===================================================
  function updateListVisibility() {
    if (!isMobile()) {
      listContainer.classList.add('show');
      return;
    }

    const hasSearch = currentSearch.length > 0;
    const hasCategoryFilter = currentCategory !== 'all';
    
    if (hasSearch || hasCategoryFilter) {
      listContainer.classList.add('show');
    } else {
      listContainer.classList.remove('show');
    }
  }

  // ===================================================
  // FUNGSI UPDATE CONTROLS POSITION
  // ===================================================
  function updateControlsPosition() {
    if (panelOpen && !isMobile()) {
      controlsContainer.classList.add('panel-open');
    } else {
      controlsContainer.classList.remove('panel-open');
    }
    
    if (isMobile()) {
      map.scrollWheelZoom.disable();
    } else {
      map.scrollWheelZoom.enable();
    }
  }

  // ===================================================
  // FUNGSI WARNA MARKER
  // ===================================================
  function getMarkerColor(kategori) {
    switch (kategori) {
      case "Pemerintahan": return "#3b82f6";
      case "Fasilitas Umum": return "#10b981";
      case "Wisata & Olahraga": return "#f59e0b";
      default: return "#64748b";
    }
  }

  // ===================================================
  // RENDER MARKERS DAN LIST
  // ===================================================
  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "location";
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', `Lihat detail ${item.nama}`);
    div.innerHTML = `<h4>${item.nama}</h4><p>📍 ${item.alamat}</p>`;
    
    div.onclick = () => openPanel(item);
    div.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPanel(item);
      }
    };
    
    listContainer.appendChild(div);
    item.element = div;

    const markerSize = window.innerWidth < 376 ? 20 : window.innerWidth < 601 ? 22 : 24;
    const markerColor = getMarkerColor(item.kategori);
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${markerColor}; width: ${markerSize}px; height: ${markerSize}px; border-radius: 50% 50% 50% 0; border: 2px solid white; transform: rotate(-45deg); box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [markerSize, markerSize],
      iconAnchor: [markerSize/2, markerSize],
      popupAnchor: [0, -markerSize - 4]
    });

    const marker = L.marker([item.lat, item.lng], { 
      icon: customIcon,
      keyboard: true,
      title: item.nama
    }).addTo(map);

    const popupContent = `
      <div class="map-popup-overview">
        <div class="popup-img-inside"><img src="${item.gambar}" alt="${item.nama}" loading="lazy"></div>
        <div class="popup-text-inside">
          <h5>${item.nama}</h5>
          <p>📍 ${item.alamat}</p>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, {
      closeButton: false,
      offset: L.point(0, -markerSize + 1),
      className: 'custom-leaflet-popup'
    });

    if (isTouchDevice()) {
      marker.on("click", () => openPanel(item));
    } else {
      marker.on("mouseover", function() {
        this.openPopup();
      });

      marker.on("mouseout", function() {
        if (!panelOpen || currentItem !== item) {
          this.closePopup();
        }
      });

      marker.on("click", () => openPanel(item));
    }

    item.marker = marker;
  });

  // ===================================================
  // FUNGSI PAN KE LOKASI
  // ===================================================
  function panToLocation(item, zoom) {
    console.log('🎯 panToLocation - panelOpen:', panelOpen);
    
    // Pastikan peta sudah di-invalidate
    map.invalidateSize();
    
    // Tunggu sebentar agar DOM update
    setTimeout(() => {
      // Hitung target dengan offset yang benar
      const targetLatLng = getTargetLatLng(item.lat, item.lng, zoom);
      
      console.log('🗺️ Target LatLng:', targetLatLng);
      
      // Gunakan flyTo untuk animasi yang smooth
      map.flyTo(targetLatLng, zoom, {
        duration: isMobile() ? 0.4 : 0.5,
        easeLinearity: 0.25
      });

      // Buka popup setelah animasi selesai
      setTimeout(() => {
        if (item.marker) {
          item.marker.openPopup();
        }
      }, isMobile() ? 350 : 500);
    }, 50);
  }

  // ===================================================
  // FUNGSI BUKA PANEL DETAIL
  // ===================================================
  function openPanel(item) {
    if (!item || isAnimating) return;
    
    if (currentItem === item && panelOpen) {
      console.log('⚠️ Same item, already open');
      return;
    }
    
    console.log('🚀 openPanel called for:', item.nama);
    
    isAnimating = true;
    const wasAlreadyOpen = panelOpen;
    currentItem = item;

    // Update konten panel
    document.getElementById("dTitle").textContent = item.nama;
    document.getElementById("dImg").src = item.gambar;
    document.getElementById("dImg").alt = item.nama;
    document.getElementById("dDesc").textContent = item.deskripsi;
    document.getElementById("dAddr").textContent = item.alamat;
    document.getElementById("dCoord").textContent = `${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}`;
    document.getElementById("dMaps").href = `https://www.google.com/maps?q=${item.lat},${item.lng}`;

    const currentZoom = map.getZoom();

    if (!panelOpen) {
      console.log('📂 Opening panel...');
      panelOpen = true;
      detailPanel.classList.add("open");
      updateControlsPosition();
      
      // Tunggu animasi panel selesai
      setTimeout(() => {
        refreshMapSize(200);
      }, 300);
    }

    // Delay lebih panjang untuk desktop agar panel benar-benar terbuka
    let delay = isMobile() ? (wasAlreadyOpen ? 100 : 400) : (wasAlreadyOpen ? 100 : 500);
    
    console.log('⏰ Delay before pan:', delay);
    
    setTimeout(() => {
      console.log('🔄 Executing pan after delay...');
      // Invalidate size untuk memastikan ukuran terbaru
      map.invalidateSize();
      
      // Pan ke lokasi
      panToLocation(item, currentZoom);

      setTimeout(() => {
        isAnimating = false;
      }, isMobile() ? 500 : 700);

      if (isMobile() && item.element && listContainer.classList.contains('show')) {
        setTimeout(() => {
          item.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }, delay);
  }

  // ===================================================
  // FUNGSI TUTUP PANEL
  // ===================================================
  function closePanel() {
    if (!panelOpen) return;

    console.log('❌ closePanel called');
    
    isAnimating = true;
    panelOpen = false;
    detailPanel.classList.remove("open");
    updateControlsPosition();
    
    setTimeout(() => {
      refreshMapSize(200);
    }, 400);

    if (currentItem) {
      const currentZoom = map.getZoom();
      map.closePopup();

      setTimeout(() => {
        if (currentItem) {
          console.log('🔄 Pan after close...');
          map.invalidateSize();
          
          setTimeout(() => {
            const targetLatLng = getTargetLatLng(currentItem.lat, currentItem.lng, currentZoom);
            map.flyTo(targetLatLng, currentZoom, {
              duration: isMobile() ? 0.3 : 0.5,
              easeLinearity: 0.25
            });
          }, 50);
        }

        setTimeout(() => {
          isAnimating = false;
        }, isMobile() ? 400 : 600);
      }, isMobile() ? 100 : 350);
    } else {
      isAnimating = false;
    }

    currentItem = null;
  }

  // Event listener tombol close
  closePanelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    closePanel();
  });

  // Close panel dengan Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelOpen) {
      closePanel();
    }
  });

  // Klik di luar panel untuk close (desktop/tablet)
  map.on('click', (e) => {
    if (panelOpen && !isMobile() && !isAnimating) {
      const clickedOnMarker = e.originalEvent.target.closest('.custom-div-icon');
      const clickedOnPopup = e.originalEvent.target.closest('.leaflet-popup');
      
      if (!clickedOnMarker && !clickedOnPopup) {
        closePanel();
      }
    }
  });

  // Swipe down untuk close panel di mobile
  let touchStartY = 0;
  let touchCurrentY = 0;
  
  detailPanel.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchCurrentY = touchStartY;
  }, { passive: true });

  detailPanel.addEventListener('touchmove', (e) => {
    touchCurrentY = e.touches[0].clientY;
  }, { passive: true });

  detailPanel.addEventListener('touchend', () => {
    const diff = touchCurrentY - touchStartY;
    
    if (diff > 50 && detailPanel.scrollTop <= 5) {
      closePanel();
    }
  });

  // ===================================================
  // FILTER DATA
  // ===================================================
  function filterData() {
    data.forEach(item => {
      const matchesSearch = item.nama.toLowerCase().includes(currentSearch) || 
                            item.alamat.toLowerCase().includes(currentSearch);
      const matchesCategory = currentCategory === "all" || item.kategori === currentCategory;

      if (matchesSearch && matchesCategory) {
        item.element.style.display = "block";
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
    
    updateListVisibility();
  }

  // Event search dengan debounce
  let searchTimeout;
  searchInput.addEventListener("input", function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = this.value.toLowerCase().trim();
      filterData();
    }, 150);
  });

  // Fokus search input: tampilkan list di mobile
  searchInput.addEventListener("focus", function() {
    if (isMobile()) {
      updateListVisibility();
    }
  });

  // Clear search dengan tombol Escape
  searchInput.addEventListener("keydown", function(e) {
    if (e.key === 'Escape') {
      this.value = '';
      currentSearch = '';
      filterData();
      this.blur();
    }
  });

  // Event kategori
  categoryButtons.forEach(btn => {
    btn.addEventListener("click", function() {
      categoryButtons.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      currentCategory = this.getAttribute("data-cat");
      filterData();
      
      if (isMobile()) {
        this.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  });

  // ===================================================
  // HANDLE RESIZE
  // ===================================================
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      refreshMapSize(100);
      filterData();
      updateControlsPosition();
      
      if (panelOpen && currentItem) {
        const currentZoom = map.getZoom();
        setTimeout(() => {
          const targetLatLng = getTargetLatLng(currentItem.lat, currentItem.lng, currentZoom);
          map.setView(targetLatLng, currentZoom, { animate: false });
        }, 100);
      }
    }, 250);
  });

  // Handle orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      refreshMapSize(300);
      filterData();
      updateControlsPosition();
      
      if (panelOpen && currentItem) {
        const currentZoom = map.getZoom();
        setTimeout(() => {
          const targetLatLng = getTargetLatLng(currentItem.lat, currentItem.lng, currentZoom);
          map.setView(targetLatLng, currentZoom, { animate: false });
        }, 100);
      }
    }, 400);
  });

  // ===================================================
  // INISIALISASI AWAL
  // ===================================================
  filterData();
  updateControlsPosition();
  
  if (isMobile()) {
    map.setView([-8.175027, 112.632375], 14.5);
  }
  
  setTimeout(() => {
    refreshMapSize(100);
  }, 300);
})();