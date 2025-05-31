
from flask import Flask, render_template, request, jsonify, send_file
import os, subprocess, uuid

app = Flask(__name__)
DOWNLOAD_FOLDER = "downloads"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

def nettoyer_url(url):
    return url.split("&")[0].split("?")[0]

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

    url = nettoyer_url(url)
    video_id = str(uuid.uuid4())
    output_template = os.path.join(DOWNLOAD_FOLDER, f"{video_id}.%(ext)s")

    # Mise Ã  jour automatique de yt-dlp
    subprocess.run(["yt-dlp", "-U"])

    # Liste blanche : seules plateformes stables
    if not any(domain in url for domain in ["youtube.com", "youtu.be", "twitter.com", "x.com"]):
        return jsonify({
            "success": False,
            "error": "Plateforme non supportÃ©e dans cette version gratuite."
        }), 400

    ytdlp_cmd = [
        "yt-dlp",
        "-f", "bv*+ba/b[ext=mp4]/b",
        "--merge-output-format", "mp4",
        "--no-playlist",
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
        return jsonify({"success": False, "error": "Fichier introuvable"}), 500

    except subprocess.CalledProcessError as e:
        return jsonify({"success": False, "error": f"yt-dlp a Ã©chouÃ© : {str(e)}"}), 500

@app.route("/download/<filename>")
def serve_file(filename):
    return send_file(os.path.join(DOWNLOAD_FOLDER, filename), as_attachment=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=81)
