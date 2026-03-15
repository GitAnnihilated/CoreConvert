/* ============================================================
   CoreConvert — Main JavaScript
   Mobile nav, smooth scroll, drag-and-drop, mock conversion,
   scroll-reveal animations, active-nav highlighting
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ----- DOM references ----- */
  const hamburger   = document.getElementById('navHamburger');
  const navLinks    = document.getElementById('navLinks');
  const dropZone    = document.getElementById('dropZone');
  const dropContent = document.getElementById('dropZoneContent');
  const fileInfo    = document.getElementById('fileInfo');
  const fileInput   = document.getElementById('fileInput');
  const browseBtn   = document.getElementById('browseBtn');
  const fileName    = document.getElementById('fileName');
  const fileSize    = document.getElementById('fileSize');
  const removeBtn   = document.getElementById('fileRemoveBtn');
  const formatSel   = document.getElementById('formatSelect');
  const convertBtn  = document.getElementById('convertBtn');
  const progressWrap= document.getElementById('progressWrapper');
  const progressFill= document.getElementById('progressFill');
  const progressText= document.getElementById('progressText');
  const toast            = document.getElementById('toast');
  const toastText        = document.getElementById('toastText');
  const toastIconSuccess = document.getElementById('toastIconSuccess');
  const toastIconError   = document.getElementById('toastIconError');
  const downloadBtn      = document.getElementById('downloadBtn');

  /* Track currently loaded file */
  let selectedFile    = null;
  let convertedBlob   = null;
  let convertedName   = null;

  /* ===========================================================
     1. MOBILE NAVIGATION TOGGLE
     =========================================================== */
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  /* Close mobile nav when a link is clicked */
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });

  /* ===========================================================
     2. SMOOTH SCROLL (anchor links)
     =========================================================== */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ===========================================================
     3. SCROLL REVEAL (IntersectionObserver)
     =========================================================== */
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  revealElements.forEach(el => revealObserver.observe(el));

  /* ===========================================================
     4. ACTIVE NAV HIGHLIGHTING ON SCROLL
     =========================================================== */
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-link');

  function highlightNav() {
    const scrollY = window.scrollY + 120; // offset for sticky nav
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollY >= top && scrollY < top + height) {
        navAnchors.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
      }
    });
  }

  window.addEventListener('scroll', highlightNav, { passive: true });
  highlightNav();

  /* ===========================================================
     5. DRAG & DROP
     =========================================================== */

  /**
   * Formats byte count to a human-readable string.
   * @param {number} bytes
   * @returns {string}
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Show the uploaded file info in the drop zone.
   * @param {File} file
   */
  function showFile(file) {
    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    dropContent.style.display = 'none';
    fileInfo.style.display = 'flex';
    // Reset any previous conversion state
    resetConversion();
  }

  /** Reset the drop zone to its initial state. */
  function clearFile() {
    selectedFile = null;
    fileInput.value = '';
    dropContent.style.display = '';
    fileInfo.style.display = 'none';
    resetConversion();
  }

  /* Prevent default browser behaviour for drag events */
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
  });

  /* Visual feedback on drag */
  dropZone.addEventListener('dragenter', () => dropZone.classList.add('dragover'));
  dropZone.addEventListener('dragover',  () => dropZone.classList.add('dragover'));
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) showFile(files[0]);
  });

  /* Browse button opens native file dialog */
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) showFile(fileInput.files[0]);
  });

  /* Remove file button */
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
  });

  /* ===========================================================
     6. REAL CONVERSION FLOW
     =========================================================== */

  /** Hide progress bar and toast, reset all toast state. */
  function resetConversion() {
    progressWrap.style.display = 'none';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    toast.style.display = 'none';
    toast.style.background  = '';
    toast.style.borderColor = '';
    toastIconSuccess.style.display = '';
    toastIconError.style.display   = 'none';
    downloadBtn.style.display = '';
    convertedBlob = null;
    convertedName = null;
  }

  function showSuccessToast(msg) {
    toastIconSuccess.style.display = '';
    toastIconError.style.display   = 'none';
    toast.style.background  = '';
    toast.style.borderColor = '';
    downloadBtn.style.display = '';
    toastText.textContent = msg;
    toast.style.display = 'flex';
  }

  function showErrorToast(msg) {
    toastIconSuccess.style.display = 'none';
    toastIconError.style.display   = '';
    toast.style.background  = '#fef2f2';
    toast.style.borderColor = '#ef4444';
    downloadBtn.style.display = 'none';
    toastText.textContent = msg;
    toast.style.display = 'flex';
  }

  convertBtn.addEventListener('click', async () => {
    /* Validation */
    if (!selectedFile) { shakeElement(dropZone); return; }
    if (!formatSel.value) { shakeElement(formatSel); return; }

    /* Disable button, reset state */
    convertBtn.disabled = true;
    convertBtn.style.opacity = '0.6';
    toast.style.display = 'none';
    convertedBlob = null;
    convertedName = null;

    /* Animated progress bar while waiting for server */
    progressWrap.style.display = 'flex';
    let progress = 0;
    const fakeInterval = setInterval(() => {
      if (progress < 88) {
        progress += Math.random() * 10 + 2;
        const pct = Math.min(progress, 88);
        progressFill.style.width = pct + '%';
        progressText.textContent = Math.round(pct) + '%';
      }
    }, 180);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('format', formatSel.value);

      const response = await fetch('/convert', { method: 'POST', body: formData });

      clearInterval(fakeInterval);

      if (!response.ok) {
        let msg = 'Conversion failed';
        try { msg = (await response.json()).error || msg; } catch (_) {}
        throw new Error(msg);
      }

      /* Store blob + filename for download */
      convertedBlob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const match       = disposition.match(/filename[^;=\n]*=['"]?([^'";\n]+)['"]?/i);
      convertedName     = match ? match[1] : `converted.${formatSel.value}`;

      /* Finish progress */
      progressFill.style.width = '100%';
      progressText.textContent = '100%';

      convertBtn.disabled = false;
      convertBtn.style.opacity = '1';
      showSuccessToast(`Converted to .${formatSel.value.toUpperCase()} — ready to download!`);

    } catch (err) {
      clearInterval(fakeInterval);
      progressWrap.style.display = 'none';
      convertBtn.disabled = false;
      convertBtn.style.opacity = '1';
      showErrorToast(err.message);
    }
  });

  /* ===========================================================
     6b. DOWNLOAD CONVERTED FILE
     =========================================================== */
  downloadBtn.addEventListener('click', () => {
    if (!convertedBlob) return;
    const url = URL.createObjectURL(convertedBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = convertedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  /**
   * Quick shake animation to indicate an error state.
   * @param {HTMLElement} el
   */
  function shakeElement(el) {
    el.classList.add('shake');
    el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });

    /* Inject keyframes once (idempotent) */
    if (!document.getElementById('shakeStyle')) {
      const style = document.createElement('style');
      style.id = 'shakeStyle';
      style.textContent = `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        .shake { animation: shake .4s ease; }
      `;
      document.head.appendChild(style);
    }
  }

  /* ===========================================================
     7. NAVBAR BACKGROUND ON SCROLL
     =========================================================== */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.style.background = 'rgba(255,255,255,.95)';
    } else {
      navbar.style.background = 'rgba(255,255,255,.82)';
    }
  }, { passive: true });
});
