(function() {
  // ===================================================
  // DATA
  // ===================================================
  let data = [];
  const ZOOM_LABEL_THRESHOLD = 16; // Zoom level untuk menampilkan label

  // ===================================================
  // LOAD DATA
  // ===================================================
  async function loadData() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'block';

    try {
      const response = await fetch('data/locations.json');
      if (!response.ok) throw new Error('Gagal memuat data');
      data = await response.json();
    } catch (err) {
      console.error('Error loading data:', err);
      // Fallback hardcoded
      data = [
        {
          nama: "Kantor Desa Gondanglegi Kulon",
          kategori: "Pemerintahan",
          lat: -8.175027,
          lng: 112.632375,
          alamat: "Jl. Raya Desa No. 1, Gondanglegi Kulon",
          deskripsi: "Pusat pelayanan administrasi dan pemerintahan tingkat Desa Gondanglegi Kulon.",
          gambar: "https://placehold.co/600x400/3b82f6/white?text=Kantor+Desa"
        },
        {
          nama: "Balai Pertemuan Warga",
          kategori: "Fasilitas Umum",
          lat: -8.172,
          lng: 112.636,
          alamat: "Dusun Krajan, RT 04 / RW 02",
          deskripsi: "Gedung serbaguna yang digunakan untuk musyawarah warga, posyandu, dan kegiatan kesenian.",
          gambar: "https://placehold.co/600x400/10b981/white?text=Balai+Pertemuan"
        },
        {
          nama: "Lapangan Olahraga Desa",
          kategori: "Wisata & Olahraga",
          lat: -8.178,
          lng: 112.628,
          alamat: "Dusun Kaliwenang",
          deskripsi: "Fasilitas olahraga terbuka untuk sepak bola, voli, dan sering digunakan untuk pasar malam.",
          gambar: "https://placehold.co/600x400/f59e0b/white?text=Lapangan+Desa"
        }
      ];
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }

    initApp();
  }

  // ===================================================
  // DETEKSI PERANGKAT
  // ===================================================
  const isMobile = () => window.innerWidth <= 768;
  const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // ===================================================
  // VARIABEL GLOBAL
  // ===================================================
  let map;
  let listContainer, detailPanel, closePanelBtn, searchInput, categoryButtons, mapContainer, sidebar;
  let currentItem = null;
  let panelOpen = false;
  let currentCategory = "all";
  let currentSearch = "";
  let isAnimating = false;
  let panTimeout = null;
  let resizeTimeout = null;

  // ===================================================
  // INISIALISASI APLIKASI
  // ===================================================
  function initApp() {
    // DOM references
    listContainer = document.getElementById("list");
    detailPanel = document.getElementById("detailPanel");
    closePanelBtn = document.getElementById("closePanel");
    searchInput = document.getElementById("searchInput");
    categoryButtons = document.querySelectorAll(".cat-btn");
    mapContainer = document.getElementById("mapContainer");
    sidebar = document.getElementById("sidebar");

    // Inisialisasi peta
    map = L.map("map", {
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

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // ===================================================
    // FUNGSI OFFSET
    // ===================================================
    function getTargetOffset() {
      const mapSize = map.getSize();
      const mapWidth = mapSize.x;
      const mapHeight = mapSize.y;

      if (isMobile()) {
        const sidebarHeight = sidebar.offsetHeight || 0;
        const panelHeight = panelOpen ? detailPanel.offsetHeight : 0;
        const topOffset = sidebarHeight;
        const bottomOffset = panelHeight;
        const availableHeight = mapHeight - topOffset - bottomOffset;
        const centerY = topOffset + (availableHeight * 0.5);
        const popupOffset = availableHeight * 0.15;
        const desiredY = centerY + popupOffset;
        const mapCenterY = mapHeight / 2;
        const offsetY = desiredY - mapCenterY;
        return { x: 0, y: offsetY };
      } else {
        const mapRect = mapContainer.getBoundingClientRect();
        const sidebarRect = sidebar.getBoundingClientRect();
        const panelRect = detailPanel.getBoundingClientRect();
        const sidebarRight = sidebarRect.right - mapRect.left;
        const panelLeft = panelOpen ? (panelRect.left - mapRect.left) : mapWidth;
        const availableLeft = sidebarRight;
        const availableRight = mapWidth - panelLeft;
        const availableWidth = mapWidth - availableLeft - availableRight;
        const desiredX = availableLeft + (availableWidth / 2);
        const centerX = mapWidth / 2;
        const offsetX = desiredX - centerX;
        return { x: offsetX, y: 0 };
      }
    }

    function getTargetLatLng(lat, lng, zoom) {
      const markerPoint = map.project([lat, lng], zoom);
      const offset = getTargetOffset();
      const targetPoint = markerPoint.subtract([offset.x, offset.y]);
      return map.unproject(targetPoint, zoom);
    }

    function refreshMapSize(delay = 50) {
      return new Promise((resolve) => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            map.invalidateSize();
            resolve();
          });
        }, delay);
      });
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
    // FUNGSI UPDATE VISIBILITY
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

    function getMarkerColor(kategori) {
      switch (kategori) {
        case "Pemerintahan": return "#3b82f6";
        case "Fasilitas Umum": return "#10b981";
        case "Wisata & Olahraga": return "#f59e0b";
        default: return "#64748b";
      }
    }

    // ===================================================
    // FUNGSI UPDATE LABEL (berdasarkan zoom)
    // ===================================================
    function updateLabels() {
      const currentZoom = map.getZoom();
      const showLabels = currentZoom >= ZOOM_LABEL_THRESHOLD;

      data.forEach(item => {
        const isVisible = item.element.style.display !== 'none';
        if (item.labelMarker) {
          if (showLabels && isVisible) {
            map.addLayer(item.labelMarker);
          } else {
            map.removeLayer(item.labelMarker);
          }
        }
      });
    }

    // ===================================================
    // RENDER MARKERS & LIST
    // ===================================================
    data.forEach((item) => {
      // ========== DAFTAR SISI ==========
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

      // ========== MARKER UTAMA (DIAMOND) ==========
      const markerSize = window.innerWidth < 376 ? 20 : window.innerWidth < 601 ? 22 : 24;
      const markerColor = getMarkerColor(item.kategori);

      const diamondIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${markerColor}; width: ${markerSize}px; height: ${markerSize}px; border-radius: 50% 50% 50% 0; border: 2px solid white; transform: rotate(-45deg); box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>`,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize],
        popupAnchor: [0, -markerSize + 2]
      });

      const marker = L.marker([item.lat, item.lng], {
        icon: diamondIcon,
        keyboard: true,
        title: item.nama
      }).addTo(map);

      // ========== LABEL DI BAWAH MARKER (CENTER SEMPURNA) ==========
      const labelHtml = `
        <div style="
          margin-top: ${markerSize + 4}px;
          position: relative;
          left: 50%;
          transform: translateX(-50%);
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          color: #1e293b;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          padding: 2px 10px;
          border-radius: 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
          white-space: nowrap;
          max-width: none;
          width: auto;
          overflow: visible;
          text-overflow: clip;
          text-align: center;
          pointer-events: none;
        ">
          ${item.nama}
        </div>
      `;

      const labelMarker = L.marker([item.lat, item.lng], {
        icon: L.divIcon({
          className: 'marker-label-icon',
          html: labelHtml,
          iconSize: [1, 1],
          iconAnchor: [0, 0]
        }),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000 // label di atas marker
      });

      // Simpan referensi
      item.marker = marker;
      item.labelMarker = labelMarker;

      // Tambahkan label ke peta hanya jika zoom memenuhi syarat
      const currentZoom = map.getZoom();
      if (currentZoom >= ZOOM_LABEL_THRESHOLD) {
        map.addLayer(labelMarker);
      }

      // ========== POPUP ==========
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
        offset: L.point(0, 0),
        className: 'custom-leaflet-popup'
      });

      // ========== EVENT HANDLER ==========
      if (isTouchDevice()) {
        marker.on("click", () => openPanel(item));
      } else {
        marker.on("mouseover", function() {
          this.openPopup();
          const iconEl = this._icon;
          if (iconEl) {
            const diamond = iconEl.querySelector('div');
            if (diamond) {
              diamond.style.transform = 'rotate(-45deg) scale(1.15)';
            }
          }
        });

        marker.on("mouseout", function() {
          if (!panelOpen || currentItem !== item) {
            this.closePopup();
          }
          const iconEl = this._icon;
          if (iconEl) {
            const diamond = iconEl.querySelector('div');
            if (diamond) {
              diamond.style.transform = 'rotate(-45deg) scale(1)';
            }
          }
        });

        marker.on("click", () => openPanel(item));
      }

      // Bounce animasi
      marker.on("click", function() {
        const iconEl = this._icon;
        if (iconEl) {
          const diamond = iconEl.querySelector('div');
          if (diamond) {
            diamond.style.transform = 'rotate(-45deg) scale(1.3)';
            setTimeout(() => {
              diamond.style.transform = 'rotate(-45deg) scale(1)';
            }, 200);
          }
        }
      });

      // Saat marker di-remove (filter), hapus juga label
      marker.on('remove', function() {
        if (item.labelMarker && map.hasLayer(item.labelMarker)) {
          map.removeLayer(item.labelMarker);
        }
      });

      // Saat marker di-add, tambahkan label jika zoom memenuhi
      marker.on('add', function() {
        const currentZoom = map.getZoom();
        if (currentZoom >= ZOOM_LABEL_THRESHOLD && item.element.style.display !== 'none') {
          if (!map.hasLayer(item.labelMarker)) {
            map.addLayer(item.labelMarker);
          }
        }
      });

    });

    // Event zoom untuk update label
    map.on('zoomend', updateLabels);

    // ===================================================
    // PAN & CLOSE FUNCTIONS
    // ===================================================
    function panToLocation(item, zoom) {
      return new Promise((resolve) => {
        if (panTimeout) {
          clearTimeout(panTimeout);
          panTimeout = null;
        }
        map.invalidateSize();
        panTimeout = setTimeout(() => {
          requestAnimationFrame(() => {
            const targetLatLng = getTargetLatLng(item.lat, item.lng, zoom);
            map.flyTo(targetLatLng, zoom, {
              duration: isMobile() ? 0.45 : 0.55,
              easeLinearity: 0.3
            });
            setTimeout(() => {
              if (item.marker) {
                item.marker.openPopup();
              }
              resolve();
            }, isMobile() ? 400 : 550);
            panTimeout = null;
          });
        }, 30);
      });
    }

    // ===================================================
    // OPEN PANEL
    // ===================================================
    function openPanel(item) {
      if (!item || isAnimating) return;
      if (currentItem === item && panelOpen) return;

      isAnimating = true;
      const wasAlreadyOpen = panelOpen;
      currentItem = item;

      // Update konten
      document.getElementById("dTitle").textContent = item.nama;
      document.getElementById("dImg").src = item.gambar;
      document.getElementById("dImg").alt = item.nama;
      document.getElementById("dDesc").textContent = item.deskripsi;
      document.getElementById("dAddr").textContent = item.alamat;
      document.getElementById("dCoord").textContent = `${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}`;
      document.getElementById("dMaps").href = `https://www.google.com/maps?q=${item.lat},${item.lng}`;

      const currentZoom = map.getZoom();

      // Buka panel jika belum terbuka
      if (!panelOpen) {
        panelOpen = true;
        closePanelBtn.setAttribute('tabindex', '0');
        detailPanel.classList.add("open");
        updateControlsPosition();
        setTimeout(() => closePanelBtn.focus(), 150);
        setTimeout(async () => {
          await refreshMapSize(200);
        }, 50);
      }

      let delay = isMobile() ? (wasAlreadyOpen ? 80 : 350) : (wasAlreadyOpen ? 80 : 400);

      setTimeout(async () => {
        await refreshMapSize(50);
        await panToLocation(item, currentZoom);

        if (isMobile() && item.element && listContainer.classList.contains('show')) {
          requestAnimationFrame(() => {
            item.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
        }
        isAnimating = false;
      }, delay);
    }

    // ===================================================
    // CLOSE PANEL
    // ===================================================
    function closePanel() {
      if (!panelOpen || isAnimating) return;

      isAnimating = true;
      panelOpen = false;
      closePanelBtn.setAttribute('tabindex', '-1');
      detailPanel.classList.remove("open");
      updateControlsPosition();

      setTimeout(async () => {
        await refreshMapSize(200);
      }, 50);

      if (currentItem) {
        const currentZoom = map.getZoom();
        map.closePopup();

        setTimeout(async () => {
          await refreshMapSize(50);
          requestAnimationFrame(() => {
            const targetLatLng = getTargetLatLng(currentItem.lat, currentItem.lng, currentZoom);
            map.flyTo(targetLatLng, currentZoom, {
              duration: isMobile() ? 0.35 : 0.5,
              easeLinearity: 0.3
            });
          });
          setTimeout(() => {
            isAnimating = false;
          }, isMobile() ? 400 : 550);
        }, isMobile() ? 80 : 300);
      } else {
        isAnimating = false;
      }

      currentItem = null;
    }

    // Event tombol close
    closePanelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (panelOpen) {
        closePanel();
      }
    });

    // Keyboard Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panelOpen) {
        closePanel();
      }
    });

    // Klik di luar panel (desktop)
    map.on('click', (e) => {
      if (panelOpen && !isMobile() && !isAnimating) {
        const clickedOnMarker = e.originalEvent.target.closest('.custom-div-icon');
        const clickedOnPopup = e.originalEvent.target.closest('.leaflet-popup');
        if (!clickedOnMarker && !clickedOnPopup) {
          closePanel();
        }
      }
    });

    // Swipe down mobile
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
      // Update label setelah filter
      updateLabels();
    }

    let searchTimeout;
    searchInput.addEventListener("input", function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentSearch = this.value.toLowerCase().trim();
        filterData();
      }, 100);
    });

    searchInput.addEventListener("focus", function() {
      if (isMobile()) {
        updateListVisibility();
      }
    });

    searchInput.addEventListener("keydown", function(e) {
      if (e.key === 'Escape') {
        this.value = '';
        currentSearch = '';
        filterData();
        this.blur();
      }
    });

    categoryButtons.forEach(btn => {
      btn.addEventListener("click", function() {
        categoryButtons.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        currentCategory = this.getAttribute("data-cat");
        filterData();
        if (isMobile()) {
          requestAnimationFrame(() => {
            this.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          });
        }
      });
    });

    // ===================================================
    // RESIZE
    // ===================================================
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        requestAnimationFrame(async () => {
          await refreshMapSize(100);
          filterData();
          updateControlsPosition();
          if (panelOpen && currentItem) {
            const currentZoom = map.getZoom();
            setTimeout(() => {
              const targetLatLng = getTargetLatLng(currentItem.lat, currentItem.lng, currentZoom);
              map.setView(targetLatLng, currentZoom, { animate: false });
            }, 50);
          }
        });
      }, 150);
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        requestAnimationFrame(async () => {
          await refreshMapSize(300);
          filterData();
          updateControlsPosition();
          if (panelOpen && currentItem) {
            const currentZoom = map.getZoom();
            setTimeout(() => {
              const targetLatLng = getTargetLatLng(currentItem.lat, currentItem.lng, currentZoom);
              map.setView(targetLatLng, currentZoom, { animate: false });
            }, 100);
          }
        });
      }, 200);
    });

    // ===================================================
    // INISIALISASI
    // ===================================================
    filterData();
    updateControlsPosition();
    if (isMobile()) {
      map.setView([-8.175027, 112.632375], 14.5);
    }
    setTimeout(() => {
      refreshMapSize(100);
      updateLabels(); // Pastikan label awal sesuai zoom
    }, 300);
  }

  // ===================================================
  // JALANKAN APLIKASI
  // ===================================================
  loadData();
})();