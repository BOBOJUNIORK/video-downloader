
import os
import logging
import json
import asyncio
import threading
from urllib.parse import urlparse
from flask import Flask, render_template, request, jsonify, send_file
import yt_dlp
import uuid

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")

DOWNLOADS_DIR = os.path.join(os.getcwd(), 'downloads')
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

download_progress = {}

class ProgressHook:
    def __init__(self, download_id):
        self.download_id = download_id

    def __call__(self, d):
        if d['status'] == 'downloading':
            percent = d.get('_percent_str', '0%').replace('%', '')
            speed = d.get('_speed_str', 'N/A')
            eta = d.get('_eta_str', 'N/A')
            download_progress[self.download_id] = {
                'status': 'downloading',
                'percent': float(percent) if percent != 'N/A' else 0,
                'speed': speed,
                'eta': eta,
                'filename': d.get('filename', 'Unknown')
            }
        elif d['status'] == 'finished':
            download_progress[self.download_id] = {
                'status': 'finished',
                'percent': 100,
                'filename': d.get('filename', 'Unknown'),
                'filepath': d.get('filename', '')
            }

def get_video_info(url):
    try:
        ydl_opts = {'quiet': True, 'no_warnings': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = []
            if 'formats' in info:
                for f in info['formats']:
                    if f.get('vcodec') != 'none' or f.get('acodec') != 'none':
                        formats.append({
                            'format_id': f.get('format_id'),
                            'ext': f.get('ext'),
                            'quality': f.get('format_note', f.get('quality', 'Unknown')),
                            'filesize': f.get('filesize'),
                            'vcodec': f.get('vcodec'),
                            'acodec': f.get('acodec')
                        })
            return {
                'title': info.get('title', 'Unknown'),
                'thumbnail': info.get('thumbnail'),
                'duration': info.get('duration'),
                'uploader': info.get('uploader'),
                'formats': formats,
                'platform': info.get('extractor_key', 'Unknown')
            }
    except Exception as e:
        logger.error(f"Error getting video info: {str(e)}")
        return None

def download_video(url, format_id, quality, download_id):
    try:
        ffmpeg_path = os.getenv("FFMPEG_PATH", "/usr/bin/ffmpeg")
        outtmpl = os.path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s')

        ydl_opts = {
            'outtmpl': outtmpl,
            'progress_hooks': [ProgressHook(download_id)],
            'ffmpeg_location': ffmpeg_path,
        }

        if quality == 'audio':
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        elif format_id:
            ydl_opts['format'] = format_id
        else:
            ydl_opts['format'] = 'best'

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            final_path = ydl.prepare_filename(info)
            download_progress[download_id]['download_url'] = f"/fichiers/{os.path.basename(final_path)}"

    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        download_progress[download_id] = {'status': 'error', 'error': str(e)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_info', methods=['POST'])
def get_info():
    data = request.get_json()
    url = data.get('url', '').strip()
    if not url:
        return jsonify({'error': 'Veuillez fournir une URL'}), 400
    try:
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            return jsonify({'error': 'URL invalide'}), 400
    except Exception:
        return jsonify({'error': 'Format URL non valide'}), 400

    info = get_video_info(url)
    if not info:
        return jsonify({'error': 'Impossible d'extraire les informations'}), 400
    return jsonify(info)

@app.route('/download', methods=['POST'])
def download():
    data = request.get_json()
    url = data.get('url', '').strip()
    format_id = data.get('format_id')
    quality = data.get('quality', 'best')
    if not url:
        return jsonify({'error': 'Veuillez fournir une URL'}), 400
    download_id = str(uuid.uuid4())
    download_progress[download_id] = {'status': 'starting', 'percent': 0}
    thread = threading.Thread(target=download_video, args=(url, format_id, quality, download_id))
    thread.daemon = True
    thread.start()
    return jsonify({'download_id': download_id})

@app.route('/progress/<download_id>')
def get_progress(download_id):
    return jsonify(download_progress.get(download_id, {'status': 'not_found'}))

@app.route('/fichiers/<filename>')
def serve_downloaded_file(filename):
    path = os.path.join(DOWNLOADS_DIR, filename)
    if os.path.isfile(path):
        return send_file(path, as_attachment=True)
    return "Fichier introuvable", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)