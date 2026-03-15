"""
CoreConvert — Flask Backend
Run: python app.py
Then open: http://localhost:5000
"""
import os
import uuid
from flask import Flask, request, send_file, send_from_directory, after_this_request, jsonify
from flask_cors import CORS
from converters import convert_file, ConversionError

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB


# ── Serve frontend ────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/privacy')
@app.route('/privacy.html')
def privacy():
    return send_from_directory(BASE_DIR, 'privacy.html')

@app.route('/contact')
@app.route('/contact.html')
def contact_page():
    return send_from_directory(BASE_DIR, 'contact.html')

@app.route('/terms')
@app.route('/terms.html')
def terms():
    return send_from_directory(BASE_DIR, 'terms.html')

@app.route('/css/<path:path>')
def serve_css(path):
    return send_from_directory(os.path.join(BASE_DIR, 'css'), path)

@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory(os.path.join(BASE_DIR, 'js'), path)


# ── Conversion endpoint ───────────────────────────────────────────────────────

@app.route('/convert', methods=['POST'])
def convert():
    # Validate inputs
    if 'file' not in request.files:
        return jsonify(error='No file provided'), 400

    uploaded = request.files['file']
    target   = request.form.get('format', '').lower().strip()

    if not uploaded.filename:
        return jsonify(error='Empty filename'), 400
    if not target:
        return jsonify(error='No target format specified'), 400

    # Derive source extension
    src_name = uploaded.filename
    src_ext  = os.path.splitext(src_name)[1].lower()           # e.g. ".csv"
    uid      = uuid.uuid4().hex

    input_path  = os.path.join(UPLOAD_DIR, f'{uid}_in{src_ext}')
    output_path = os.path.join(UPLOAD_DIR, f'{uid}_out.{target}')

    uploaded.save(input_path)

    try:
        convert_file(input_path, output_path, target)

        # Determine the download filename
        base_name     = os.path.splitext(src_name)[0]
        download_name = f'{base_name}.{target}'

        @after_this_request
        def cleanup(response):
            for p in (input_path, output_path):
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except OSError:
                    pass
            return response

        return send_file(
            output_path,
            as_attachment=True,
            download_name=download_name,
        )

    except ConversionError as exc:
        _rm(input_path, output_path)
        return jsonify(error=str(exc)), 422
    except Exception as exc:
        _rm(input_path, output_path)
        return jsonify(error=f'Unexpected error: {exc}'), 500


def _rm(*paths):
    for p in paths:
        try:
            if os.path.exists(p):
                os.remove(p)
        except OSError:
            pass


if __name__ == '__main__':
    print('CoreConvert backend running at http://localhost:5000')
    app.run(debug=True, port=5000)
