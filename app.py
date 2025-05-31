
from flask import Flask, render_template, request, jsonify, send_file
import os, subprocess, uuid

app = Flask(__name__)
DOWNLOAD_FOLDER = "downloads"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/download", methods=["POST"])
def download_video():
    data = request.json
    url = data.get("url")
    format = data.get("format", "mp4")
    quality = data.get("quality", "720p")

    if not url:
        return jsonify({"success": False, "error": "URL manquante"}), 400

    video_id = str(uuid.uuid4())
    output_template = os.path.join(DOWNLOAD_FOLDER, f"{video_id}.%(ext)s")

    ytdlp_cmd = [
        "yt-dlp",
        "-f", "bestvideo[ext=mp4]+bestaudio/best",
        "-o", output_template,
        url
    ]

    try:
        subprocess.run(ytdlp_cmd, check=True)
        for f in os.listdir(DOWNLOAD_FOLDER):
            if f.startswith(video_id):
                return jsonify({
                    "success": True,
                    "filename": f,
                    "downloadUrl": f"/download/{f}"
                })
        return jsonify({"success": False, "error": "Fichier non trouvé"}), 500

    except subprocess.CalledProcessError as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/download/<filename>")
def serve_file(filename):
    return send_file(os.path.join(DOWNLOAD_FOLDER, filename), as_attachment=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=81)
