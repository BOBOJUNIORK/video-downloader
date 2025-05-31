
// Configuration des plateformes supportées
const PLATFORMS = {
  youtube: {
    name: 'YouTube',
    icon: 'https://img.icons8.com/color/48/youtube-play.png',
    patterns: [/youtube\.com\/watch/, /youtu\.be\//, /youtube\.com\/shorts/]
  },
  facebook: {
    name: 'Facebook',
    icon: 'https://img.icons8.com/color/48/facebook-new.png',
    patterns: [/facebook\.com\/.*\/videos/, /fb\.watch\//]
  },
  twitter: {
    name: 'Twitter',
    icon: 'https://img.icons8.com/color/48/twitter--v1.png',
    patterns: [/twitter\.com\/.*\/status/, /x\.com\/.*\/status/]
  },
  tiktok: {
    name: 'TikTok',
    icon: 'https://img.icons8.com/color/48/tiktok.png',
    patterns: [/tiktok\.com\/@.*\/video/, /vm\.tiktok\.com/]
  },
  instagram: {
    name: 'Instagram',
    icon: 'https://img.icons8.com/color/48/instagram-new.png',
    patterns: [/instagram\.com\/p\//, /instagram\.com\/reel\//]
  },
  pinterest: {
    name: 'Pinterest',
    icon: 'https://img.icons8.com/color/48/pinterest--v1.png',
    patterns: [/pinterest\.com\/pin\//]
  },
  snapchat: {
    name: 'Snapchat',
    icon: 'https://img.icons8.com/color/48/snapchat.png',
    patterns: [/snapchat\.com\/spotlight/]
  },
  vimeo: {
    name: 'Vimeo',
    icon: 'https://img.icons8.com/color/48/vimeo.png',
    patterns: [/vimeo\.com\/\d+/]
  }
};

class VideoDownloader {
  constructor() {
    this.initElements();
    this.downloadHistory = this.loadHistory();
    
    if (this.urlInput) {
      this.initEventListeners();
      this.updateHistoryDisplay();
    }
  }

  initElements() {
    this.urlInput = document.getElementById('videoUrl');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.btnText = document.getElementById('btnText');
    this.loader = document.getElementById('loader');
    this.result = document.getElementById('result');
    this.detectedPlatform = document.getElementById('detectedPlatform');
    this.formatSelect = document.getElementById('formatSelect');
    this.qualitySelect = document.getElementById('qualitySelect');
    this.historyList = document.getElementById('historyList');
    this.historyCount = document.getElementById('historyCount');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
  }

  initEventListeners() {
    if (this.urlInput) {
      this.urlInput.addEventListener('input', () => {
        this.detectPlatform();
      });

      this.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.downloadVideo();
        }
      });
    }

    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => {
        this.downloadVideo();
      });
    }

    if (this.clearHistoryBtn) {
      this.clearHistoryBtn.addEventListener('click', () => {
        this.clearHistory();
      });
    }
  }

  detectPlatform() {
    const url = this.urlInput?.value?.trim() || '';
    
    if (!url) {
      this.updatePlatformBadge('Aucune', false);
      return;
    }

    for (const [key, platform] of Object.entries(PLATFORMS)) {
      if (platform.patterns.some(pattern => pattern.test(url))) {
        this.updatePlatformBadge(platform.name, true);
        return platform;
      }
    }

    this.updatePlatformBadge('Non supportée', false);
    return null;
  }

  updatePlatformBadge(text, isDetected) {
    if (this.detectedPlatform) {
      this.detectedPlatform.textContent = text;
      this.detectedPlatform.className = isDetected ? 'platform-badge detected' : 'platform-badge';
    }
  }

  async downloadVideo() {
    const url = this.urlInput?.value?.trim();
    
    if (!url) {
      this.showResult('Veuillez entrer une URL valide.', 'error');
      return;
    }

    const platform = this.detectPlatform();
    if (!platform) {
      this.showResult('Cette plateforme n\'est pas encore supportée.', 'error');
      return;
    }

    const format = this.formatSelect?.value || 'mp4';
    const quality = this.qualitySelect?.value || '720p';

    this.setLoading(true);

    try {
      // Appel à l'API de téléchargement réelle
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          format: format,
          quality: quality
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Ajouter à l'historique
        this.addToHistory({
          url,
          platform: platform.name,
          format,
          quality,
          date: new Date(),
          downloadUrl: result.downloadUrl,
          filename: result.filename
        });
        
        this.showResult(`
          <h3>✅ Téléchargement réussi !</h3>
          <p><strong>Plateforme:</strong> ${platform.name}</p>
          <p><strong>Format:</strong> ${format.toUpperCase()}</p>
          <p><strong>Qualité:</strong> ${quality}</p>
          <p><strong>Fichier:</strong> ${result.filename}</p>
          <div style="margin-top: 1rem;">
            <a href="${result.downloadUrl}" download="${result.filename}" style="background: #4caf50; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 5px; text-decoration: none; margin-right: 1rem; display: inline-block;">
              📥 Télécharger le fichier
            </a>
            <button onclick="window.open('${url}', '_blank')" style="background: #2196F3; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 5px; cursor: pointer;">
              🔗 Voir l'original
            </button>
          </div>
        `, 'success');
      } else {
        this.showResult(`Erreur: ${result.error}`, 'error');
      }
      
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      this.showResult(`Erreur lors du téléchargement: ${error.message}`, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(isLoading) {
    if (this.downloadBtn) {
      this.downloadBtn.disabled = isLoading;
    }
    
    if (isLoading) {
      if (this.btnText) this.btnText.style.display = 'none';
      if (this.loader) this.loader.classList.remove('hidden');
    } else {
      if (this.btnText) this.btnText.style.display = 'block';
      if (this.loader) this.loader.classList.add('hidden');
    }
  }

  showResult(message, type) {
    if (this.result) {
      this.result.innerHTML = message;
      this.result.className = `result ${type}`;
      this.result.classList.remove('hidden');
      
      this.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  addToHistory(download) {
    this.downloadHistory.unshift(download);
    if (this.downloadHistory.length > 20) {
      this.downloadHistory = this.downloadHistory.slice(0, 20);
    }
    this.saveHistory();
    this.updateHistoryDisplay();
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('downloadHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  saveHistory() {
    try {
      localStorage.setItem('downloadHistory', JSON.stringify(this.downloadHistory));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde de l\'historique:', e);
    }
  }

  updateHistoryDisplay() {
    if (!this.historyCount || !this.historyList) return;
    
    this.historyCount.textContent = `${this.downloadHistory.length} téléchargement${this.downloadHistory.length > 1 ? 's' : ''}`;
    
    if (this.downloadHistory.length === 0) {
      this.historyList.innerHTML = '<p class="no-history">Aucun téléchargement pour le moment</p>';
      return;
    }

    this.historyList.innerHTML = this.downloadHistory.map((item, index) => `
      <div class="history-item">
        <div class="history-info">
          <div class="history-platform">${item.platform}</div>
          <div class="history-url">${item.url}</div>
          <div class="history-format">${item.format.toUpperCase()} - ${item.quality}</div>
          ${item.downloadUrl ? `<a href="${item.downloadUrl}" download="${item.filename}" class="redownload-link">📥 Re-télécharger</a>` : ''}
        </div>
        <div class="history-date">${new Date(item.date).toLocaleDateString('fr-FR')}</div>
        <div class="history-actions">
          <button class="retry-btn" onclick="window.videoDownloader.retryDownload(${index})">↻</button>
          <button class="delete-btn" onclick="window.videoDownloader.deleteFromHistory(${index})">×</button>
        </div>
      </div>
    `).join('');
  }

  retryDownload(index) {
    const item = this.downloadHistory[index];
    if (this.urlInput) this.urlInput.value = item.url;
    if (this.formatSelect) this.formatSelect.value = item.format;
    if (this.qualitySelect) this.qualitySelect.value = item.quality;
    this.detectPlatform();
    if (this.urlInput) this.urlInput.scrollIntoView({ behavior: 'smooth' });
  }

  deleteFromHistory(index) {
    this.downloadHistory.splice(index, 1);
    this.saveHistory();
    this.updateHistoryDisplay();
  }

  clearHistory() {
    if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
      this.downloadHistory = [];
      this.saveHistory();
      this.updateHistoryDisplay();
    }
  }
}

// Initialisation de l'application
let videoDownloader;

document.addEventListener('DOMContentLoaded', () => {
  videoDownloader = new VideoDownloader();
  window.videoDownloader = videoDownloader;
  
  // Animation d'entrée
  const container = document.querySelector('.container');
  if (container) {
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      container.style.transition = 'all 0.6s ease';
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    }, 100);
  }
});

// Fonctions utilitaires
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Gestion des erreurs globales
window.addEventListener('error', (e) => {
  console.error('Erreur globale:', e.error);
});
